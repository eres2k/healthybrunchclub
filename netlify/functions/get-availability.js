const { calculateAvailability, loadReservationsForDate } = require('./utils/reservation-utils');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { date } = event.queryStringParameters || {};
    
    if (!date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Date parameter is required' })
      };
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' })
      };
    }

    const existingReservations = await loadReservationsForDate(date);
    const availability = await calculateAvailability(date, existingReservations);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(availability)
    };

  } catch (error) {
    console.error('Availability check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error checking availability' })
    };
  }
};
