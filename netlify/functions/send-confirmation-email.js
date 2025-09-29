const { sendReservationEmails } = require('./utils/email');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: DEFAULT_HEADERS, body: '' };
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
    if (!payload.reservation) {
      return {
        statusCode: 400,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: 'Reservation payload missing.' })
      };
    }

    await sendReservationEmails(payload.reservation, {
      guestNotes: payload.guestNotes,
      defaultFrom: payload.defaultFrom,
      adminRecipients: payload.adminRecipients
    });

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Emails dispatched.' })
    };
  } catch (error) {
    console.error('Fehler beim Senden der Reservierungs-E-Mail', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'E-Mail Versand fehlgeschlagen.', details: error.message })
    };
  }
};
