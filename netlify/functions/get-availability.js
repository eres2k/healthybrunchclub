'use strict';

const { getAvailability } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return response(405, { message: 'Methode nicht erlaubt.' });
  }

  try {
    const { date, guests } = event.queryStringParameters || {};
    if (!date) {
      return response(400, { message: 'Bitte geben Sie ein Datum an.' });
    }

    const result = await getAvailability({
      date,
      guests: guests ? Number(guests) : undefined
    });

    return response(200, result);
  } catch (error) {
    console.error('Fehler beim Laden der Verfügbarkeit:', error);
    return response(500, { message: 'Verfügbarkeit konnte nicht ermittelt werden.' });
  }
};
