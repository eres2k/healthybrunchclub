const {
  loadReservationSettings,
  loadSpecialDates,
  loadReservationsForDate,
  calculateAvailability
} = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=60'
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

  try {
    const settings = await loadReservationSettings();
    const specialDates = await loadSpecialDates();
    const params = event.queryStringParameters || {};
    const date = params.date ? params.date.slice(0, 10) : null;

    if (!date) {
      const normalizedOpeningHours = Object.entries(settings.opening_hours || {}).reduce((acc, [day, config]) => {
        acc[day] = {
          open: Boolean(config?.open),
          from: config?.from ? String(config.from).slice(0, 5) : null,
          to: config?.to ? String(config.to).slice(0, 5) : null,
          slots: Array.isArray(config?.slots)
            ? config.slots.map((slot) => (slot.time ? slot.time : slot)).map((time) => String(time).slice(0, 5))
            : [],
          maxGuests: config?.max_guests || null
        };
        return acc;
      }, {});

      return {
        statusCode: 200,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          type: 'metadata',
          openingHours: normalizedOpeningHours,
          blackoutDates: Array.isArray(settings.blackout_dates)
            ? settings.blackout_dates
                .map((entry) => (typeof entry === 'string' ? entry.slice(0, 10) : entry.date?.slice(0, 10)))
                .filter(Boolean)
            : [],
          specialDates,
          guestNotes: settings.guest_notes || '',
          waitlistEnabled: Boolean(settings.waitlist_enabled),
          maxGuestsPerReservation: settings.max_guests_per_reservation || null,
          maxDaysInAdvance: settings.max_days_in_advance || null,
          minNoticeHours: settings.min_notice_hours || 0,
          timezone: 'Europe/Vienna'
        })
      };
    }

    const guests = params.guests ? parseInt(params.guests, 10) : null;
    const existingReservations = await loadReservationsForDate(date);
    const availability = calculateAvailability({
      date,
      guests,
      settings,
      specialDates,
      existingReservations
    });

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        type: 'availability',
        ...availability
      })
    };
  } catch (error) {
    console.error('Fehler beim Ermitteln der Verfügbarkeit', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        message: 'Die Verfügbarkeiten konnten nicht geladen werden.',
        details: error.message
      })
    };
  }
};
