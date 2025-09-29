const { randomUUID } = require('crypto');
const {
  loadReservationSettings,
  loadSpecialDates,
  resolveDayConfig,
  expandSlotsFromConfig,
  normaliseBlackoutDates,
  getReservationsForDate,
  persistReservationsForDate,
  buildAvailabilityResponse
} = require('../lib/reservation-utils');
const { sendReservationEmails } = require('../lib/email');

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

function normaliseGuests(value) {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function validatePayload(payload) {
  const requiredFields = ['date', 'time', 'name', 'email'];
  const missing = requiredFields.filter(field => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length > 0) {
    return { ok: false, message: 'Bitte füllen Sie alle Pflichtfelder aus.', missing };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return { ok: false, message: 'Ungültiges Datum. Erwartet wird YYYY-MM-DD.' };
  }

  if (!/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(payload.time)) {
    return { ok: false, message: 'Ungültige Uhrzeit. Erwartet wird HH:MM.' };
  }

  return { ok: true };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { message: 'Ungültige JSON-Daten.' });
  }

  const validation = validatePayload(payload);
  if (!validation.ok) {
    return jsonResponse(400, validation);
  }

  const guests = normaliseGuests(payload.guests);

  try {
    const settings = await loadReservationSettings();
    const specialDates = await loadSpecialDates();
    const blackoutDates = normaliseBlackoutDates(settings.blackout_dates);

    if (blackoutDates.includes(payload.date)) {
      return jsonResponse(400, { message: 'An diesem Tag können keine Reservierungen vorgenommen werden.' });
    }

    const leadTime = Number(settings.lead_time_days || 0);
    const bookingWindow = Number(settings.booking_window_days || 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(`${payload.date}T00:00:00Z`);

    const minDate = new Date(today);
    minDate.setUTCDate(minDate.getUTCDate() + leadTime);

    if (target < minDate) {
      return jsonResponse(400, { message: 'Das gewählte Datum liegt außerhalb der Reservierungsfrist.' });
    }

    if (bookingWindow > 0) {
      const maxDate = new Date(today);
      maxDate.setUTCDate(maxDate.getUTCDate() + bookingWindow);
      if (target > maxDate) {
        return jsonResponse(400, { message: 'Das gewählte Datum kann noch nicht reserviert werden.' });
      }
    }

    let slots = [];
    const specialDate = specialDates.find(item => String(item.date).slice(0, 10) === payload.date);

    if (specialDate && specialDate.status === 'geschlossen') {
      return jsonResponse(400, { message: 'An diesem Tag ist das Restaurant geschlossen.' });
    }

    if (specialDate && specialDate.status === 'special_hours' && Array.isArray(specialDate.special_slots) && specialDate.special_slots.length > 0) {
      slots = expandSlotsFromConfig({
        slots: specialDate.special_slots,
        max_guests: specialDate.special_slots?.[0]?.max_guests
      });
    } else {
      const dayConfig = resolveDayConfig(settings, payload.date);
      if (!dayConfig || !dayConfig.open) {
        return jsonResponse(400, { message: 'An diesem Tag können keine Reservierungen vorgenommen werden.' });
      }
      slots = expandSlotsFromConfig(dayConfig);
    }

    const requestedSlot = slots.find(slot => slot.time === payload.time);
    if (!requestedSlot) {
      return jsonResponse(400, { message: 'Die gewählte Uhrzeit ist nicht verfügbar.' });
    }

    if (guests <= 0) {
      return jsonResponse(400, { message: 'Bitte geben Sie eine gültige Personenzahl an.' });
    }

    const maxGuestsPerReservation = Number(settings.max_guests_per_reservation || 0);
    if (maxGuestsPerReservation > 0 && guests > maxGuestsPerReservation) {
      return jsonResponse(400, { message: `Maximal ${maxGuestsPerReservation} Personen pro Reservierung.` });
    }

    const reservations = await getReservationsForDate(payload.date);
    const duplicate = reservations.find(reservation => reservation.email === payload.email && reservation.time === payload.time && reservation.status !== 'cancelled');
    if (duplicate) {
      return jsonResponse(409, { message: 'Für diese Kombination aus Datum und Uhrzeit existiert bereits eine Reservierung auf diese E-Mail-Adresse.' });
    }

    const availability = buildAvailabilityResponse({
      slots,
      reservations,
      waitlistEnabled: Boolean(settings.waitlist_enabled)
    });

    const slotAvailability = availability.find(slot => slot.time === payload.time);
    if (!slotAvailability) {
      return jsonResponse(400, { message: 'Die gewählte Uhrzeit ist derzeit nicht verfügbar.' });
    }

    const waitlistRequested = Boolean(payload.join_waitlist);
    let status = 'confirmed';
    if (slotAvailability.availableGuests < guests) {
      if (waitlistRequested && settings.waitlist_enabled) {
        status = 'waitlist';
      } else {
        return jsonResponse(409, { message: 'Dieser Zeitslot ist bereits ausgebucht.' });
      }
    }

    const confirmationCode = randomUUID().split('-')[0].toUpperCase();
    const reservation = {
      id: randomUUID(),
      confirmationCode,
      status,
      createdAt: new Date().toISOString(),
      date: payload.date,
      time: payload.time,
      guests,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ? String(payload.phone).trim() : '',
      message: payload.message ? String(payload.message).trim() : '',
      language: payload.language || 'de',
      joinWaitlist: status === 'waitlist'
    };

    const updatedReservations = [...reservations, reservation];
    await persistReservationsForDate(payload.date, updatedReservations);

    const restaurant = settings.restaurant || {};

    try {
      await sendReservationEmails(reservation, settings, restaurant);
    } catch (emailError) {
      console.error('Failed to send reservation emails', emailError);
    }

    return jsonResponse(200, {
      message: status === 'waitlist' ? 'Du wurdest auf die Warteliste gesetzt.' : 'Reservierung erfolgreich erstellt.',
      reservation
    });
  } catch (error) {
    console.error('Failed to create reservation', error);
    return jsonResponse(500, { message: 'Die Reservierung konnte nicht gespeichert werden.' });
  }
};
