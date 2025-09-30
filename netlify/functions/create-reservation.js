const ensureFetch = () => {
  if (typeof fetch === 'function') {
    return fetch;
  }
  return (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};

const fetchFn = ensureFetch();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
    if (!siteUrl) {
      throw new Error('Site URL environment variable is not defined.');
    }

    const formData = new URLSearchParams({
      'form-name': 'reservations',
      ...Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value == null ? '' : String(value)])
      )
    });

    const response = await fetchFn(`${siteUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Netlify form submission failed: ${response.status} ${response.statusText} ${text}`);
    }

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
