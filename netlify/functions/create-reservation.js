exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    const data = JSON.parse(event.body || '{}');

    if (data.honeypot) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Danke!' })
      };
    }

    const required = ['name', 'email', 'phone', 'date', 'time', 'guests'];
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Bitte füllen Sie das Feld "${field}" aus.`
          })
        };
      }
    }

    const normalized = {
      ...data,
      message: data.message || data.specialRequests || '',
    };

    const siteUrl =
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      process.env.DEPLOY_URL ||
      process.env.SITE_URL;

    if (!siteUrl) {
      throw new Error('Site URL is not configured.');
    }

    const formData = new URLSearchParams({
      'form-name': 'reservations',
      ...Object.entries(normalized).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }
        acc[key] = value == null ? '' : String(value);
        return acc;
      }, {})
    });

    const response = await fetch(`${siteUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Netlify Forms request failed: ${response.status} ${response.statusText} - ${text}`);
    }

    /*
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: process.env.RESTAURANT_EMAIL || 'info@healthybrunchclub.at',
        from: process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
        subject: `Neue Reservierung: ${normalized.name} - ${normalized.date} um ${normalized.time}`,
        html: `
          <h2>Neue Reservierung</h2>
          <p><strong>Name:</strong> ${normalized.name}</p>
          <p><strong>Email:</strong> ${normalized.email}</p>
          <p><strong>Telefon:</strong> ${normalized.phone}</p>
          <p><strong>Datum:</strong> ${normalized.date}</p>
          <p><strong>Uhrzeit:</strong> ${normalized.time}</p>
          <p><strong>Personen:</strong> ${normalized.guests}</p>
          <p><strong>Nachricht:</strong> ${normalized.message || 'Keine'}</p>
        `,
      };

      await sgMail.send(msg);
    }
    */

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Ihre Reservierung wurde erfolgreich übermittelt!'
      })
    };
  } catch (error) {
    console.error('Reservation error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
