'use strict';

const { randomUUID } = require('crypto');
const { writeJSON, readJSON } = require('./utils/blob-storage');

/**
 * Dummy reservation storage function for testing purposes.
 * Saves test reservations to blob storage at reservations/${date}.json
 *
 * Usage:
 *   POST /.netlify/functions/dummy-reservation-storage
 *   Body: { "date": "2024-01-15" } (optional, defaults to today)
 *
 *   GET /.netlify/functions/dummy-reservation-storage?date=2024-01-15
 *   Returns stored reservations for the given date
 */

function generateDummyReservation(date, index) {
  const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const names = ['Max Mustermann', 'Anna Schmidt', 'Thomas Müller', 'Lisa Wagner', 'Hans Bauer'];
  const guestCounts = [2, 3, 4, 5, 6];

  return {
    id: randomUUID(),
    confirmationCode: `HBC-TEST-${index}-${Date.now().toString(36).toUpperCase()}`,
    date: date,
    time: times[index % times.length],
    guests: guestCounts[index % guestCounts.length],
    name: names[index % names.length],
    email: `test${index}@example.com`,
    phone: `+43 123 456 ${1000 + index}`,
    specialRequests: index % 2 === 0 ? 'Vegetarisch bitte' : '',
    status: 'confirmed',
    timezone: 'Europe/Vienna',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // GET: Read existing reservations for a date
    if (event.httpMethod === 'GET') {
      const date = event.queryStringParameters?.date || getTodayDate();
      const key = `reservations/${date}.json`;
      const reservations = await readJSON('reservations', key, []);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          date,
          key,
          count: reservations.length,
          reservations
        })
      };
    }

    // POST: Create and save dummy reservations
    if (event.httpMethod === 'POST') {
      let body = {};
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        body = {};
      }

      const date = body.date || getTodayDate();
      const count = Math.min(body.count || 3, 10); // Default 3, max 10 dummy reservations
      const key = `reservations/${date}.json`;

      // Load existing reservations (if any)
      const existingReservations = await readJSON('reservations', key, []);

      // Generate dummy reservations
      const dummyReservations = [];
      for (let i = 0; i < count; i++) {
        dummyReservations.push(generateDummyReservation(date, existingReservations.length + i));
      }

      // Combine and save
      const allReservations = [...existingReservations, ...dummyReservations];
      await writeJSON('reservations', key, allReservations, {
        updatedAt: new Date().toISOString(),
        isDummy: true
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Saved ${count} dummy reservations to ${key}`,
          date,
          key,
          newReservations: dummyReservations,
          totalCount: allReservations.length
        })
      };
    }

    // DELETE: Clear reservations for a date
    if (event.httpMethod === 'DELETE') {
      const date = event.queryStringParameters?.date || getTodayDate();
      const key = `reservations/${date}.json`;

      await writeJSON('reservations', key, [], {
        updatedAt: new Date().toISOString(),
        cleared: true
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Cleared all reservations for ${date}`,
          date,
          key
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Dummy reservation storage error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
