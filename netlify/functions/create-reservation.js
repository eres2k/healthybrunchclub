'use strict';

const { validateReservationPayload } = require('./utils/validation');
const { checkRateLimit } = require('./utils/rate-limiter');
const { createReservation } = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email-service');

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Methode nicht erlaubt.' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { valid, errors, data } = validateReservationPayload(payload);

    if (!valid) {
      return response(400, {
        message: 'Bitte prüfen Sie Ihre Eingaben.',
        errors
      });
    }

    const rate = await checkRateLimit(event.headers['x-forwarded-for'] || event.ip || 'anonymous');
    if (!rate.allowed) {
      return response(429, {
        message: 'Zu viele Reservierungsversuche. Bitte versuchen Sie es in einer Stunde erneut.'
      });
    }

    const reservationResult = await createReservation(data);
    if (!reservationResult.success) {
      return response(400, { message: reservationResult.message || 'Reservierung nicht möglich.' });
    }

    try {
      await sendReservationEmails(reservationResult.reservation);
    } catch (emailError) {
      console.error('Fehler beim E-Mail-Versand:', emailError);
    }

    return response(200, {
      message: reservationResult.reservation.status === 'waitlisted'
        ? 'Der gewünschte Zeitslot ist ausgebucht. Sie wurden auf die Warteliste gesetzt.'
        : 'Ihre Reservierung wurde bestätigt!',
      reservation: reservationResult.reservation
    });
  } catch (error) {
    console.error('Fehler bei der Reservierung:', error);
    return response(500, {
      message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.'
    });
  }
};
