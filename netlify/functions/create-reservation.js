const {
  loadReservationSettings,
  loadSpecialDates,
  loadReservationsForDate,
  saveReservationsForDate,
  calculateAvailability,
  generateReservationId,
  normalizeTime
} = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function validatePayload(body, settings) {
  const errors = [];
  if (!body) {
    return ['Keine Daten übermittelt'];
  }

  const requiredFields = ['date', 'time', 'name', 'email', 'phone'];
  requiredFields.forEach((field) => {
    if (!body[field] || String(body[field]).trim() === '') {
      errors.push(`Feld "${field}" ist erforderlich.`);
    }
  });

  const guests = Number(body.guests || 0);
  if (!Number.isInteger(guests) || guests <= 0) {
    errors.push('Bitte geben Sie eine gültige Personenanzahl an.');
  }

  if (settings.max_guests_per_reservation && guests > settings.max_guests_per_reservation) {
    errors.push(`Es können maximal ${settings.max_guests_per_reservation} Personen pro Reservierung gebucht werden.`);
  }

  if (body.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
    errors.push('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
  }

  return errors;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const settings = await loadReservationSettings();
    const validationErrors = validatePayload(payload, settings);

    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Validierung fehlgeschlagen', errors: validationErrors })
      };
    }

    const date = payload.date.slice(0, 10);
    const time = normalizeTime(payload.time);
    if (!time) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Ungültiges Zeitformat.' })
      };
    }

    const guests = Number(payload.guests);
    const specialDates = await loadSpecialDates();
    const existingReservations = await loadReservationsForDate(date);

    const availability = calculateAvailability({
      date,
      guests,
      settings,
      specialDates,
      existingReservations
    });

    if (availability.status !== 'open') {
      return {
        statusCode: 409,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          message: availability.message || 'Für dieses Datum können derzeit keine Reservierungen vorgenommen werden.',
          reason: availability.reason
        })
      };
    }

    const selectedSlot = availability.slots.find((slot) => slot.time === time);
    if (!selectedSlot) {
      return {
        statusCode: 404,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Der gewählte Zeitslot wurde nicht gefunden.' })
      };
    }

    if (selectedSlot.status === 'tooSoon') {
      return {
        statusCode: 409,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          message: selectedSlot.disabledReason || 'Reservierungen sind für diesen Slot zu kurzfristig.',
          reason: 'tooSoon'
        })
      };
    }

    let reservationStatus = 'confirmed';
    if (selectedSlot.status !== 'available' || !selectedSlot.fitsParty) {
      if (settings.waitlist_enabled) {
        reservationStatus = 'waitlist';
      } else {
        return {
          statusCode: 409,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            message: selectedSlot.disabledReason || 'Dieser Zeitslot ist bereits ausgebucht.',
            reason: selectedSlot.status
          })
        };
      }
    }

    const reservation = {
      id: generateReservationId(),
      date,
      time,
      guests,
      name: String(payload.name).trim(),
      email: String(payload.email).trim(),
      phone: String(payload.phone).trim(),
      notes: payload.notes ? String(payload.notes).trim() : '',
      language: payload.language || 'de',
      status: reservationStatus,
      createdAt: new Date().toISOString()
    };

    existingReservations.push(reservation);
    await saveReservationsForDate(date, existingReservations);

    await sendReservationEmails(reservation, {
      guestNotes: settings.guest_notes,
      defaultFrom: settings.default_notification_email,
      adminRecipients: settings.notification_emails
    });

    const refreshedAvailability = calculateAvailability({
      date,
      guests: null,
      settings,
      specialDates,
      existingReservations
    });

    return {
      statusCode: 201,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        message: reservationStatus === 'waitlist'
          ? 'Der gewünschte Zeitslot ist derzeit ausgebucht. Sie wurden auf die Warteliste gesetzt.'
          : 'Reservierung erfolgreich erstellt.',
        reservation,
        availability: refreshedAvailability
      })
    };
  } catch (error) {
    console.error('Fehler beim Erstellen der Reservierung', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Die Reservierung konnte nicht gespeichert werden.', details: error.message })
    };
  }
};
