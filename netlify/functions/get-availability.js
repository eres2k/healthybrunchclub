const {
  loadReservationSettings,
  loadSpecialDates,
  resolveDayConfig,
  expandSlotsFromConfig,
  normaliseBlackoutDates,
  getReservationsForDate,
  buildAvailabilityResponse
} = require('../lib/reservation-utils');

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(data)
  };
}

function validateDateInput(dateString) {
  if (!dateString) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return true;
}

exports.handler = async function(event) {
  try {
    const settings = await loadReservationSettings();
    const specialDates = await loadSpecialDates();
    const blackoutDates = normaliseBlackoutDates(settings.blackout_dates);

    const query = event.queryStringParameters || {};
    const includeMeta = query.meta === '1' || query.meta === 'true';

    if (!query.date) {
      const meta = {
        leadTimeDays: Number(settings.lead_time_days || 0),
        bookingWindowDays: Number(settings.booking_window_days || 0),
        maxGuestsPerReservation: Number(settings.max_guests_per_reservation || 0),
        waitlistEnabled: Boolean(settings.waitlist_enabled),
        blackoutDates,
        specialDates: specialDates.map(item => ({
          date: String(item.date).slice(0, 10),
          status: item.status,
          note: item.note || ''
        }))
      };

      if (!includeMeta) {
        return jsonResponse(400, {
          message: 'Bitte geben Sie ein Datum im Format YYYY-MM-DD an.',
          meta
        });
      }

      return jsonResponse(200, { meta });
    }

    const requestedDate = query.date;

    if (!validateDateInput(requestedDate)) {
      return jsonResponse(400, { message: 'Ungültiges Datum. Erwartet wird YYYY-MM-DD.' });
    }

    const leadTime = Number(settings.lead_time_days || 0);
    const bookingWindow = Number(settings.booking_window_days || 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(`${requestedDate}T00:00:00Z`);

    const minDate = new Date(today);
    minDate.setUTCDate(minDate.getUTCDate() + leadTime);

    if (target < minDate) {
      return jsonResponse(400, { message: 'Dieses Datum kann nicht mehr reserviert werden (Vorbereitungszeit).', code: 'LEAD_TIME' });
    }

    if (bookingWindow > 0) {
      const maxDate = new Date(today);
      maxDate.setUTCDate(maxDate.getUTCDate() + bookingWindow);
      if (target > maxDate) {
        return jsonResponse(400, { message: 'Dieses Datum liegt außerhalb des Buchungszeitraums.', code: 'BOOKING_WINDOW' });
      }
    }

    if (blackoutDates.includes(requestedDate)) {
      return jsonResponse(200, {
        date: requestedDate,
        closed: true,
        reason: 'Dieser Tag ist nicht buchbar (Blackout).',
        slots: [],
        waitlistEnabled: Boolean(settings.waitlist_enabled)
      });
    }

    const specialDate = specialDates.find(item => String(item.date).slice(0, 10) === requestedDate);

    if (specialDate && specialDate.status === 'geschlossen') {
      return jsonResponse(200, {
        date: requestedDate,
        closed: true,
        reason: specialDate.note || 'An diesem Tag bleibt das Restaurant geschlossen.',
        slots: [],
        waitlistEnabled: Boolean(settings.waitlist_enabled)
      });
    }

    let slots = [];

    if (specialDate && specialDate.status === 'special_hours' && Array.isArray(specialDate.special_slots) && specialDate.special_slots.length > 0) {
      slots = expandSlotsFromConfig({
        slots: specialDate.special_slots,
        max_guests: specialDate.special_slots?.[0]?.max_guests
      });
    } else {
      const dayConfig = resolveDayConfig(settings, requestedDate);
      if (!dayConfig || !dayConfig.open) {
        return jsonResponse(200, {
          date: requestedDate,
          closed: true,
          reason: 'An diesem Wochentag sind keine Reservierungen möglich.',
          slots: [],
          waitlistEnabled: Boolean(settings.waitlist_enabled)
        });
      }
      slots = expandSlotsFromConfig(dayConfig);
    }

    if (slots.length === 0) {
      return jsonResponse(200, {
        date: requestedDate,
        closed: true,
        reason: 'Für diesen Tag wurden keine Zeitfenster definiert.',
        slots: [],
        waitlistEnabled: Boolean(settings.waitlist_enabled)
      });
    }

    const reservations = await getReservationsForDate(requestedDate);
    const availability = buildAvailabilityResponse({
      slots,
      reservations,
      waitlistEnabled: Boolean(settings.waitlist_enabled)
    });

    return jsonResponse(200, {
      date: requestedDate,
      closed: false,
      slots: availability,
      waitlistEnabled: Boolean(settings.waitlist_enabled),
      maxGuestsPerReservation: Number(settings.max_guests_per_reservation || 0)
    });
  } catch (error) {
    console.error('Failed to compute availability', error);
    return jsonResponse(500, { message: 'Interner Fehler beim Laden der Verfügbarkeit.' });
  }
};
