const {
  loadReservationSettings,
  loadReservationsForDate,
  saveReservationsForDate,
  calculateAvailability,
  loadSpecialDates
} = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

function ensureAdmin(event) {
  const token = process.env.RESERVATION_ADMIN_TOKEN;
  if (!token) {
    throw new Error('Administratorentoken nicht gesetzt.');
  }

  const header = event.headers.authorization || event.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) {
    const error = new Error('Unauthorised');
    error.statusCode = 401;
    throw error;
  }

  const provided = header.replace('Bearer ', '').trim();
  if (provided !== token) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
}

async function listReservations(date, options = {}) {
  const reservations = await loadReservationsForDate(date);
  if (options.includeAvailability) {
    const settings = await loadReservationSettings();
    const specialDates = await loadSpecialDates();
    const availability = calculateAvailability({
      date,
      settings,
      specialDates,
      existingReservations: reservations
    });
    return { reservations, availability };
  }

  return { reservations };
}

function toCsv(reservations) {
  const header = ['ID', 'Datum', 'Zeit', 'Name', 'Personen', 'E-Mail', 'Telefon', 'Status', 'Notizen', 'Erstellt am'];
  const rows = reservations.map((entry) => [
    entry.id,
    entry.date,
    entry.time,
    entry.name,
    entry.guests,
    entry.email,
    entry.phone,
    entry.status,
    entry.notes?.replace(/\n/g, ' '),
    entry.createdAt
  ]);
  return [header, ...rows]
    .map((columns) => columns.map((value) => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }

  try {
    ensureAdmin(event);
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: error.message })
    };
  }

  try {
    const params = event.queryStringParameters || {};

    if (event.httpMethod === 'GET') {
      const date = params.date ? params.date.slice(0, 10) : null;
      if (!date) {
        return {
          statusCode: 400,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: 'Bitte geben Sie ein Datum an.' })
        };
      }

      const { reservations, availability } = await listReservations(date, {
        includeAvailability: params.includeAvailability === 'true'
      });

      if (params.format === 'csv') {
        return {
          statusCode: 200,
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="reservierungen-${date}.csv"`
          },
          body: toCsv(reservations)
        };
      }

      return {
        statusCode: 200,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ reservations, availability })
      };
    }

    if (event.httpMethod === 'DELETE' || (event.httpMethod === 'POST' && params.action === 'delete')) {
      const payload = event.httpMethod === 'DELETE' ? params : JSON.parse(event.body || '{}');
      const date = payload.date ? payload.date.slice(0, 10) : null;
      const id = payload.id;

      if (!date || !id) {
        return {
          statusCode: 400,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: 'ID und Datum sind erforderlich.' })
        };
      }

      const reservations = await loadReservationsForDate(date);
      const filtered = reservations.filter((entry) => entry.id !== id);
      await saveReservationsForDate(date, filtered);

      return {
        statusCode: 200,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Reservierung gelöscht.' })
      };
    }

    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      const date = payload.date ? payload.date.slice(0, 10) : null;
      if (!date) {
        return {
          statusCode: 400,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: 'Datum fehlt.' })
        };
      }

      const reservations = await loadReservationsForDate(date);
      const index = reservations.findIndex((entry) => entry.id === payload.id);
      if (index === -1) {
        return {
          statusCode: 404,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: 'Reservierung nicht gefunden.' })
        };
      }

      const current = reservations[index];
      const updated = {
        ...current,
        guests: payload.guests ? Number(payload.guests) : current.guests,
        time: payload.time || current.time,
        notes: payload.notes !== undefined ? payload.notes : current.notes,
        status: payload.status || current.status,
        updatedAt: new Date().toISOString()
      };

      reservations[index] = updated;
      await saveReservationsForDate(date, reservations);

      return {
        statusCode: 200,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Reservierung aktualisiert.', reservation: updated })
      };
    }

    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Nicht unterstützte Methode.' })
    };
  } catch (error) {
    console.error('Fehler in manage-reservations', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Verwaltung fehlgeschlagen.', details: error.message })
    };
  }
};
