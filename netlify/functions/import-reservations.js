'use strict';

const { createReservation } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function authenticate(event, context) {
  const user = context?.clientContext?.user;
  if (user) {
    return user;
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const adminToken = process.env.RESERVATION_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

  if (adminToken && token === adminToken) {
    return { email: 'admin@local', app_metadata: { roles: ['admin'] } };
  }

  throw new Error('Nicht autorisiert.');
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Methode nicht erlaubt.' });
  }

  try {
    authenticate(event, context);
  } catch (error) {
    return response(401, { message: error.message });
  }

  try {
    const { reservations } = JSON.parse(event.body || '{}');

    if (!Array.isArray(reservations) || reservations.length === 0) {
      return response(400, { message: 'Reservierungen-Array ist erforderlich.' });
    }

    const results = [];
    for (const res of reservations) {
      try {
        const normalized = {
          name: res.name?.trim() || '',
          email: res.email?.trim() || '',
          phone: res.phone?.trim() || '',
          date: res.date || '',
          time: res.time || '',
          guests: parseInt(res.guests, 10) || 1,
          specialRequests: res.specialRequests?.trim() || res.message?.trim() || ''
        };

        if (!normalized.name || !normalized.email || !normalized.date || !normalized.time) {
          results.push({ success: false, name: res.name, error: 'Pflichtfelder fehlen' });
          continue;
        }

        const result = await createReservation(normalized);
        if (result.success) {
          results.push({
            success: true,
            name: normalized.name,
            confirmationCode: result.reservation.confirmationCode,
            date: result.reservation.date,
            time: result.reservation.time,
            status: result.reservation.status
          });
        } else {
          results.push({ success: false, name: res.name, error: result.message });
        }
      } catch (err) {
        results.push({ success: false, name: res.name, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return response(200, {
      message: `${successCount} von ${reservations.length} Reservierungen importiert.`,
      results
    });
  } catch (error) {
    console.error('Import error:', error);
    return response(500, { message: 'Interner Fehler.' });
  }
};
