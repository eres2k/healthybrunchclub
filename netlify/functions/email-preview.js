'use strict';

const {
  renderConfirmationEmail,
  renderCancellationEmail,
  renderWaitlistEmail,
  renderRequestReceivedEmail
} = require('./utils/email-templates');

/**
 * Email Preview Function
 * Generates HTML previews of email templates for the admin dashboard
 */
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check authentication (require Netlify Identity)
  const { identity, user } = context.clientContext || {};
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
    };
  }

  try {
    const { type, reservation } = JSON.parse(event.body);

    if (!type || !reservation) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing type or reservation data' })
      };
    }

    let html;

    switch (type) {
      case 'confirmation':
        html = renderConfirmationEmail(reservation);
        break;
      case 'cancellation':
        html = renderCancellationEmail(reservation);
        break;
      case 'waitlist':
        html = renderWaitlistEmail(reservation);
        break;
      case 'request_received':
        html = renderRequestReceivedEmail(reservation);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown email type: ${type}` })
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ html })
    };

  } catch (error) {
    console.error('Email preview error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
