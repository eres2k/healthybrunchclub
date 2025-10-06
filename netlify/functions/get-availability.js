'use strict';

const { getAvailability } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  const { date, guests } = event.queryStringParameters || {};

  if (!date) {
    return {
      statusCode: 400,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Date parameter is required' })
    };
  }

  try {
    const parsedGuests = guests === undefined ? undefined : Number.parseInt(guests, 10);
    const guestCount = Number.isFinite(parsedGuests) ? parsedGuests : undefined;
    const availability = await getAvailability({ date, guests: guestCount });

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(availability)
    };
  } catch (error) {
    console.error('Error in get-availability:', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
