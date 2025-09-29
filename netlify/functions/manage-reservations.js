const {
  loadReservationSettings,
  getReservationsForDate,
  persistReservationsForDate,
  listAllReservationEntries,
  buildAvailabilityResponse,
  expandSlotsFromConfig,
  resolveDayConfig
} = require('../lib/reservation-utils');

function jsonResponse(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    },
    body: JSON.stringify(data)
  };
}

function requireAdmin(event) {
  const adminToken = process.env.RESERVATION_ADMIN_TOKEN;
  if (!adminToken) {
    console.warn('RESERVATION_ADMIN_TOKEN not configured');
    return true; // skip auth if not configured
  }

  const provided = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
  const queryToken = (event.queryStringParameters || {}).token;

  if (provided === adminToken || queryToken === adminToken) {
    return true;
  }

  return false;
}

function toCsv(reservations) {
  const header = ['Datum', 'Uhrzeit', 'Name', 'E-Mail', 'Telefon', 'Gäste', 'Status', 'Code', 'Notiz', 'Erstellt'];
  const rows = reservations.map(reservation => [
    reservation.date,
    reservation.time,
    reservation.name,
    reservation.email,
    reservation.phone,
    reservation.guests,
    reservation.status,
    reservation.confirmationCode,
    reservation.message ? reservation.message.replace(/\n/g, ' ') : '',
    reservation.createdAt
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  return csv;
}

async function handleGet(event) {
  if (!requireAdmin(event)) {
    return jsonResponse(401, { message: 'Unauthorized' });
  }

  const query = event.queryStringParameters || {};
  const date = query.date;
  const format = query.format;

  let data;

  if (date) {
    const reservations = await getReservationsForDate(date);
    data = reservations.map(item => ({ ...item, date }));
  } else {
    data = await listAllReservationEntries();
  }

  if (format === 'csv') {
    const csv = toCsv(data);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'attachment; filename="reservations.csv"'
      },
      body: csv
    };
  }

  return jsonResponse(200, { reservations: data });
}

async function handleUpdate(event) {
  if (!requireAdmin(event)) {
    return jsonResponse(401, { message: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { message: 'Ungültige JSON-Daten.' });
  }

  const { date, id, action } = payload;
  if (!date || !id || !action) {
    return jsonResponse(400, { message: 'Benötigt: date, id und action.' });
  }

  const reservations = await getReservationsForDate(date);
  const index = reservations.findIndex(item => item.id === id);

  if (index === -1) {
    return jsonResponse(404, { message: 'Reservierung nicht gefunden.' });
  }

  const reservation = reservations[index];

  if (action === 'cancel') {
    reservations[index] = { ...reservation, status: 'cancelled', cancelledAt: new Date().toISOString() };
  } else if (action === 'update') {
    const updates = payload.updates || {};
    reservations[index] = { ...reservation, ...updates, updatedAt: new Date().toISOString() };
  } else {
    return jsonResponse(400, { message: 'Unbekannte Aktion.' });
  }

  await persistReservationsForDate(date, reservations);
  return jsonResponse(200, { reservation: reservations[index] });
}

async function handleAvailability(event) {
  if (!requireAdmin(event)) {
    return jsonResponse(401, { message: 'Unauthorized' });
  }

  const query = event.queryStringParameters || {};
  const date = query.date;
  if (!date) {
    return jsonResponse(400, { message: 'Parameter date fehlt.' });
  }

  const settings = await loadReservationSettings();
  const dayConfig = resolveDayConfig(settings, date);
  if (!dayConfig) {
    return jsonResponse(404, { message: 'Keine Einstellungen für diesen Tag gefunden.' });
  }

  const slots = expandSlotsFromConfig(dayConfig);
  const reservations = await getReservationsForDate(date);
  const availability = buildAvailabilityResponse({
    slots,
    reservations,
    waitlistEnabled: Boolean(settings.waitlist_enabled)
  });

  return jsonResponse(200, { date, availability });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'GET') {
    const query = event.queryStringParameters || {};
    if (query.mode === 'availability') {
      return handleAvailability(event);
    }
    return handleGet(event);
  }

  if (event.httpMethod === 'POST') {
    return handleUpdate(event);
  }

  return jsonResponse(405, { message: 'Method not allowed' });
};
