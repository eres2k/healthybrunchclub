const QRCode = require('qrcode');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { url, title } = event.httpMethod === 'POST'
      ? JSON.parse(event.body)
      : event.queryStringParameters || {};

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL parameter required' })
      };
    }

    const qrOptions = {
      width: 512,
      height: 512,
      margin: 2,
      color: {
        dark: '#1E4A3C',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    };

    const qrCodeDataUrl = await QRCode.toDataURL(url, qrOptions);
    const qrCodeBuffer = await QRCode.toBuffer(url, qrOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        qrCode: qrCodeDataUrl,
        qrCodeBase64: qrCodeBuffer.toString('base64'),
        title: title || 'Menu QR Code',
        url
      })
    };
  } catch (error) {
    console.error('QR Generation Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate QR code',
        details: error.message
      })
    };
  }
};
