'use strict';

const { sendReservationEmails } = require('./utils/email-service');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: DEFAULT_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Methode nicht erlaubt.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    if (!payload.reservation) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Reservierungsdaten fehlen.' })
      };
    }

    await sendReservationEmails(payload.reservation);

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'E-Mails wurden versendet.' })
    };
  } catch (error) {
    console.error('Fehler beim Versand der Reservierungs-E-Mails:', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'E-Mails konnten nicht versendet werden.' })
    };
  }
};
