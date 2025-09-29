const { sendReservationEmails } = require('../lib/email');
const { loadReservationSettings } = require('../lib/reservation-utils');

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

  const reservation = payload.reservation;
  if (!reservation || !reservation.email || !reservation.date || !reservation.time) {
    return jsonResponse(400, { message: 'Reservierungsdaten unvollständig.' });
  }

  try {
    const settings = await loadReservationSettings();
    const restaurant = settings.restaurant || {};
    await sendReservationEmails(reservation, settings, restaurant);
    return jsonResponse(200, { message: 'E-Mails gesendet.' });
  } catch (error) {
    console.error('Failed to send confirmation email', error);
    return jsonResponse(500, { message: 'E-Mail Versand fehlgeschlagen.' });
  }
};
