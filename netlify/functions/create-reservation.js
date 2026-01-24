const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Import E-Mail Service
const { sendReservationEmails } = require('./utils/email-service');
const { createReservation } = require('./utils/reservation-utils');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Normalize data
    const normalized = {
      name: data.name?.trim() || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      date: data.date || '',
      time: data.time || '',
      guests: parseInt(data.guests, 10) || 1,
      specialRequests: data.specialRequests?.trim() || data.message?.trim() || '',
      honeypot: data.honeypot || ''
    };

    // Honeypot check
    if (normalized.honeypot) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid submission' })
      };
    }

    // Validation
    if (!normalized.name || !normalized.email || !normalized.date || !normalized.time) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' })
      };
    }

    // Create reservation in blob storage
    const result = await createReservation(normalized);

    if (!result.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: result.message })
      };
    }

    const reservation = result.reservation;

    // Send confirmation emails
    try {
      await sendReservationEmails(reservation);
      console.log('E-Mail-Bestätigung wurde versendet an:', reservation.email);
    } catch (emailError) {
      console.error('E-Mail konnte nicht versendet werden:', emailError);
      // Continue even if email fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message:
          'Ihre Reservierung wurde erfolgreich übermittelt! Sie erhalten in Kürze eine Bestätigung per E-Mail.',
        reservation: {
          confirmationCode: reservation.confirmationCode,
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          status: reservation.status
        }
      })
    };
  } catch (error) {
    console.error('Reservation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.'
      })
    };
  }
};
