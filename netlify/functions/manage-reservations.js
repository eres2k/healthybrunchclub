'use strict';

const jwt = require('jsonwebtoken');
const { getAvailability, loadReservations, saveBlocked, loadBlocked, updateReservationStatus } = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email-service');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

function authenticate(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    throw new Error('Nicht autorisiert.');
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new Error('Ungültiger Authentifizierungs-Header.');
  }

  const secret = process.env.RESERVATION_ADMIN_TOKEN;
  if (!secret) {
    throw new Error('Admin-Token nicht konfiguriert.');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Token konnte nicht verifiziert werden.');
  }
}

async function handleGet(event) {
  const { date } = event.queryStringParameters || {};
  if (!date) {
    return response(400, { message: 'Bitte Datum angeben.' });
  }

  const [availability, reservations, blocked] = await Promise.all([
    getAvailability({ date }),
    loadReservations(date),
    loadBlocked(date)
  ]);

  return response(200, { availability, reservations, blocked });
}

async function handlePatch(event) {
  const body = JSON.parse(event.body || '{}');
  const { confirmationCode, status, date } = body;

  if (!confirmationCode || !status || !date) {
    return response(400, { message: 'Bestätigungscode, Datum und Status sind erforderlich.' });
  }

  const reservation = await updateReservationStatus({ date, confirmationCode, status });

  if (status !== 'cancelled') {
    try {
      await sendReservationEmails(reservation);
    } catch (error) {
      console.error('E-Mail Versand nach Update fehlgeschlagen:', error);
    }
  }

  return response(200, { message: 'Reservierung aktualisiert.', reservation });
}

async function handlePost(event) {
  const body = JSON.parse(event.body || '{}');
  const { action } = body;

  if (action === 'block-slot') {
    const { date, time, capacity = 0 } = body;
    if (!date || !time) {
      return response(400, { message: 'Datum und Zeit sind erforderlich.' });
    }

    const blocked = await loadBlocked(date);
    const existingIndex = blocked.findIndex((entry) => entry.time === time);
    if (existingIndex >= 0) {
      blocked[existingIndex] = { time, capacity };
    } else {
      blocked.push({ time, capacity });
    }

    await saveBlocked(date, blocked);
    return response(200, { message: 'Zeitslot wurde blockiert.', blocked });
  }

  return response(400, { message: 'Unbekannte Aktion.' });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    authenticate(event);
  } catch (error) {
    return response(401, { message: error.message });
  }

  try {
    if (event.httpMethod === 'GET') {
      return await handleGet(event);
    }

    if (event.httpMethod === 'PATCH') {
      return await handlePatch(event);
    }

    if (event.httpMethod === 'POST') {
      return await handlePost(event);
    }

    return response(405, { message: 'Methode nicht erlaubt.' });
  } catch (error) {
    console.error('Fehler in manage-reservations:', error);
    return response(500, { message: 'Interner Fehler.' });
  }
};
