'use strict';

const { getAvailability, loadReservations, loadAllReservations, saveBlocked, loadBlocked, updateReservationStatus, deleteReservation } = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email-service');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

function authenticate(event, context) {
  // Check for Netlify Identity user from clientContext
  const user = context?.clientContext?.user;
  if (user) {
    return user;
  }

  // Fallback: Check for Admin Token (for local development or API access)
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const adminToken = process.env.RESERVATION_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

  if (adminToken && token === adminToken) {
    return { email: 'admin@local', app_metadata: { roles: ['admin'] } };
  }

  throw new Error('Nicht autorisiert. Bitte mit Netlify Identity anmelden oder Admin-Token verwenden.');
}

async function handleGet(event) {
  const { date, all } = event.queryStringParameters || {};

  // Load all reservations if 'all' parameter is provided
  if (all === 'true') {
    const reservations = await loadAllReservations();
    return response(200, { reservations, mode: 'all' });
  }

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
  const { confirmationCode, status, date, sendEmail = true } = body;

  if (!confirmationCode || !status || !date) {
    return response(400, { message: 'Bestätigungscode, Datum und Status sind erforderlich.' });
  }

  const reservation = await updateReservationStatus({ date, confirmationCode, status });

  let emailSent = false;
  if (sendEmail) {
    try {
      await sendReservationEmails(reservation);
      emailSent = true;
    } catch (error) {
      console.error('E-Mail Versand nach Update fehlgeschlagen:', error);
    }
  }

  return response(200, { message: 'Reservierung aktualisiert.', reservation, emailSent });
}

async function handleDelete(event) {
  const { date, confirmationCode } = event.queryStringParameters || {};

  if (!confirmationCode || !date) {
    return response(400, { message: 'Bestätigungscode und Datum sind erforderlich.' });
  }

  const deleted = await deleteReservation({ date, confirmationCode });

  return response(200, { message: 'Reservierung gelöscht.', reservation: deleted });
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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    authenticate(event, context);
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

    if (event.httpMethod === 'DELETE') {
      return await handleDelete(event);
    }

    return response(405, { message: 'Methode nicht erlaubt.' });
  } catch (error) {
    console.error('Fehler in manage-reservations:', error);
    return response(500, { message: 'Interner Fehler.' });
  }
};
