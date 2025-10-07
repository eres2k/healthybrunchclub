const fetch = require('node-fetch');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Import E-Mail Service
const { sendReservationEmails } = require('./utils/email-service');

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
    const siteUrl = process.env.URL || 'https://healthybrunchclub.at';

    // Normalize data
    const normalized = {
      name: data.name?.trim() || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      date: data.date || '',
      time: data.time || '',
      guests: parseInt(data.guests, 10) || 1,
      message: data.specialRequests?.trim() || data.message?.trim() || '',
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

    // Generate confirmation code
    const confirmationCode = 'HBC' + Date.now().toString(36).toUpperCase().slice(-6);

    // Create reservation object for email
    const reservation = {
      ...normalized,
      confirmationCode,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    // Submit to Netlify Forms
    const formData = new URLSearchParams({
      'form-name': 'reservations',
      ...Object.entries(normalized).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value == null ? '' : String(value);
        }
        return acc;
      }, {})
    });

    const response = await fetch(`${siteUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!response.ok) {
      throw new Error(`Netlify Forms request failed: ${response.status}`);
    }

    // WICHTIG: E-Mail-Versand aktivieren
    try {
      await sendReservationEmails(reservation);
      console.log('E-Mail-Bestätigung wurde versendet an:', reservation.email);
    } catch (emailError) {
      console.error('E-Mail konnte nicht versendet werden:', emailError);
      // Fortsetzung auch wenn E-Mail fehlschlägt
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message:
          'Ihre Reservierung wurde erfolgreich übermittelt! Sie erhalten in Kürze eine Bestätigung per E-Mail.',
        reservation: {
          confirmationCode,
          date: normalized.date,
          time: normalized.time,
          guests: normalized.guests
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
