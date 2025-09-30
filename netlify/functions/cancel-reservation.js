'use strict';

const { cancelReservation } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Methode nicht erlaubt.' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { confirmationCode, email } = payload;
    if (!confirmationCode || !email) {
      return response(400, { message: 'Bestätigungscode und E-Mail sind erforderlich.' });
    }

    const reservation = await cancelReservation({ confirmationCode, email });
    return response(200, { message: 'Reservierung wurde storniert.', reservation });
  } catch (error) {
    console.error('Fehler beim Stornieren:', error);
    return response(400, { message: error.message || 'Stornierung nicht möglich.' });
  }
};
