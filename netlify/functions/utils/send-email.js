'use strict';

const { Resend } = require('resend');
const fetch = require('node-fetch');

/**
 * Send email using Resend as primary provider with Netlify Forms as fallback.
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.from - Sender email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @param {Array} options.attachments - Attachments array
 * @param {string} options.replyTo - Reply-to address
 */
module.exports = async function sendEmail(options) {
  const from = options.from || process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at';

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      const result = await sendWithResend(options, from);
      if (result.success) {
        return result;
      }
      console.warn('Resend fehlgeschlagen, versuche Netlify Forms Fallback...');
    } catch (error) {
      console.error('Resend Fehler:', error.message);
      console.warn('Versuche Netlify Forms Fallback...');
    }
  } else {
    console.warn('RESEND_API_KEY nicht konfiguriert');
  }

  // Fallback to Netlify Forms
  if (process.env.NETLIFY_FORMS_ENABLED === 'true' || !process.env.RESEND_API_KEY) {
    try {
      const result = await sendWithNetlifyForms(options, from);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('Netlify Forms Fallback Fehler:', error.message);
    }
  }

  // If both fail
  console.error('Alle E-Mail-Provider fehlgeschlagen');
  return { success: false, error: 'E-Mail-Service nicht verfügbar' };
};

/**
 * Send email via Resend API
 */
async function sendWithResend(options, from) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Convert attachments from SendGrid format to Resend format
  const attachments = (options.attachments || []).map(att => ({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64')
  }));

  const emailData = {
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    reply_to: options.replyTo
  };

  if (attachments.length > 0) {
    emailData.attachments = attachments;
  }

  const { data, error } = await resend.emails.send(emailData);

  if (error) {
    console.error('Resend API Fehler:', error);
    throw new Error(error.message);
  }

  console.log('E-Mail erfolgreich gesendet via Resend an:', options.to, 'ID:', data?.id);
  return { success: true, provider: 'resend', id: data?.id };
}

/**
 * Send email notification via Netlify Forms (fallback)
 * This stores the email data in Netlify Forms for manual processing
 */
async function sendWithNetlifyForms(options, from) {
  const siteUrl = process.env.URL || 'https://healthybrunchclub.at';

  // Build form data for Netlify Forms submission
  const formData = new URLSearchParams();
  formData.append('form-name', 'email-fallback');
  formData.append('to', options.to);
  formData.append('from', from);
  formData.append('subject', options.subject);
  formData.append('text', options.text || '');
  formData.append('html', options.html || '');
  formData.append('timestamp', new Date().toISOString());

  if (options.replyTo) {
    formData.append('replyTo', options.replyTo);
  }

  // Note: Attachments cannot be sent via Netlify Forms fallback
  if (options.attachments?.length > 0) {
    formData.append('attachments_note', `${options.attachments.length} Anhänge konnten nicht übermittelt werden`);
  }

  const response = await fetch(siteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Netlify Forms Fehler: ${response.status}`);
  }

  console.log('E-Mail-Daten gespeichert via Netlify Forms für:', options.to);
  return { success: true, provider: 'netlify-forms', note: 'Email queued in Netlify Forms' };
}
