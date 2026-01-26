'use strict';

const sendEmail = require('./send-email');
const {
  renderGuestEmail,
  renderAdminEmail,
  renderIcs,
  renderCancellationEmail,
  renderReminderEmail,
  renderWaitlistPromotedEmail,
  renderWaitlistEmail,
  renderFeedbackRequestEmail,
  renderAdminCancellationEmail,
  renderAdminCancellationEmailText,
  renderRequestReceivedEmail,
  renderConfirmationEmail,
  // Plain text versions
  renderGuestEmailText,
  renderAdminEmailText,
  renderWaitlistEmailText,
  renderCancellationEmailText,
  renderReminderEmailText,
  renderWaitlistPromotedEmailText,
  renderFeedbackRequestEmailText,
  renderRequestReceivedEmailText,
  renderConfirmationEmailText
} = require('./email-templates');
const { writeJSON, readJSON } = require('./blob-storage');

const FROM_EMAIL = () => process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at';

// Delay helper to avoid Resend rate limits (2 requests/second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const EMAIL_DELAY_MS = 600; // 600ms between emails to stay under 2/sec limit

// Default admin emails for reservation notifications
const DEFAULT_ADMIN_EMAILS = [
  'hello@healthybrunchclub.at',
  'erwin.esener@gmail.com'
];

/**
 * Returns array of admin email addresses for notifications.
 * Priority: 1) Admin settings from CMS, 2) ENV var, 3) defaults.
 */
async function getAdminEmails() {
  try {
    // First, try to load from CMS admin settings
    const settings = await readJSON('settings', 'admin-settings.json', {});
    if (settings.adminEmails && Array.isArray(settings.adminEmails) && settings.adminEmails.length > 0) {
      return settings.adminEmails.filter(Boolean);
    }
  } catch (error) {
    console.error('Fehler beim Laden der Admin-E-Mails aus Einstellungen:', error.message);
  }

  // Fall back to environment variable
  const envEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim()).filter(Boolean);
  }

  // Default admin emails
  return DEFAULT_ADMIN_EMAILS;
}

/**
 * Sends email to all admin addresses sequentially with delays to avoid rate limits.
 */
async function sendToAllAdmins(emailOptions) {
  const adminEmails = await getAdminEmails();
  const from = FROM_EMAIL();
  const results = [];

  for (const adminEmail of adminEmails) {
    try {
      const result = await sendEmail({
        ...emailOptions,
        to: adminEmail,
        from
      });
      results.push(result);
    } catch (err) {
      console.error(`Admin-E-Mail an ${adminEmail} fehlgeschlagen:`, err.message);
      results.push({ success: false, error: err.message, to: adminEmail });
    }
    // Add delay between sends to stay under Resend's rate limit
    if (adminEmails.indexOf(adminEmail) < adminEmails.length - 1) {
      await delay(EMAIL_DELAY_MS);
    }
  }

  return results;
}

function encodeAttachment(content, type, filename) {
  return {
    content: Buffer.from(content).toString('base64'),
    type,
    filename
  };
}

/**
 * Logs email send to blob storage.
 */
async function logEmail(confirmationCode, type, recipients) {
  try {
    await writeJSON('emailLog', `${confirmationCode}-${type}-${Date.now()}.json`, {
      confirmationCode,
      type,
      sentAt: new Date().toISOString(),
      recipients
    });
  } catch (error) {
    console.error('Email-Logging fehlgeschlagen:', error.message);
  }
}

/**
 * Sends confirmation emails for new reservations (guest + all admins).
 */
async function sendReservationEmails(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmails = await getAdminEmails();
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  // Choose template based on status
  const isWaitlisted = reservation.status === 'waitlisted';
  const guestHtml = isWaitlisted
    ? renderWaitlistEmail(reservation)
    : renderGuestEmail(reservation);
  const guestText = isWaitlisted
    ? renderWaitlistEmailText(reservation)
    : renderGuestEmailText(reservation);

  const subject = isWaitlisted
    ? 'Healthy Brunch Club Wien – Warteliste'
    : 'Healthy Brunch Club Wien – Reservierungsbestätigung';

  // Send guest email
  await sendEmail({
    to: reservation.email,
    from,
    subject,
    text: guestText,
    html: guestHtml,
    attachments: isWaitlisted ? [] : attachments
  });

  // Delay before admin emails to avoid rate limit
  await delay(EMAIL_DELAY_MS);

  // Extract just the date part for subject line
  const dateOnly = reservation.date.split('T')[0];

  // Send admin notifications to all configured admins
  await sendToAllAdmins({
    subject: `Neue Reservierung: ${reservation.name} - ${dateOnly} ${reservation.time}`,
    text: renderAdminEmailText(reservation),
    html: renderAdminEmail(reservation),
    attachments
  });

  await logEmail(reservation.confirmationCode, 'confirmation', [reservation.email, ...adminEmails]);
}

/**
 * Sends request received email when user submits a new reservation (Angefragt status).
 * Only sends to guest + admin notification.
 */
async function sendRequestReceivedEmails(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmails = await getAdminEmails();

  // Send guest email - request received
  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Healthy Brunch Club Wien – Reservierungsanfrage erhalten',
    text: renderRequestReceivedEmailText(reservation),
    html: renderRequestReceivedEmail(reservation)
  });

  // Delay before admin emails to avoid rate limit
  await delay(EMAIL_DELAY_MS);

  // Extract just the date part for subject line
  const dateOnly = reservation.date.split('T')[0];

  // Send admin notifications about the new request
  await sendToAllAdmins({
    subject: `Neue Anfrage: ${reservation.name} - ${dateOnly} ${reservation.time}`,
    text: renderAdminEmailText(reservation),
    html: renderAdminEmail(reservation)
  });

  await logEmail(reservation.confirmationCode, 'request-received', [reservation.email, ...adminEmails]);
}

/**
 * Sends confirmation email when admin confirms reservation (Bestätigt status).
 */
async function sendConfirmationEmails(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmails = await getAdminEmails();
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  // Send guest email - confirmation
  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Healthy Brunch Club Wien – Reservierung bestätigt',
    text: renderConfirmationEmailText(reservation),
    html: renderConfirmationEmail(reservation),
    attachments
  });

  await logEmail(reservation.confirmationCode, 'confirmation', [reservation.email, ...adminEmails]);
}

/**
 * Sends cancellation confirmation emails (guest + all admins).
 */
async function sendCancellationEmails(reservation, options = {}) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmails = await getAdminEmails();

  // Send guest cancellation confirmation
  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Healthy Brunch Club Wien – Stornierungsbestätigung',
    text: renderCancellationEmailText(reservation, options),
    html: renderCancellationEmail(reservation, options)
  });

  // Delay before admin emails to avoid rate limit
  await delay(EMAIL_DELAY_MS);

  // Extract just the date part for subject line
  const dateOnly = reservation.date.split('T')[0];

  // Send admin notifications to all configured admins
  await sendToAllAdmins({
    subject: `Stornierung: ${reservation.name} - ${dateOnly} ${reservation.time}`,
    text: renderAdminCancellationEmailText(reservation, options),
    html: renderAdminCancellationEmail(reservation, options)
  });

  await logEmail(reservation.confirmationCode, 'cancellation', [reservation.email, ...adminEmails]);
}

/**
 * Sends reminder email to guest (1 day before reservation).
 */
async function sendReminderEmail(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Erinnerung: Ihre Reservierung morgen im Healthy Brunch Club',
    text: renderReminderEmailText(reservation),
    html: renderReminderEmail(reservation),
    attachments
  });

  await logEmail(reservation.confirmationCode, 'reminder', [reservation.email]);
}

/**
 * Sends email when guest is promoted from waitlist to confirmed.
 */
async function sendWaitlistPromotedEmail(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  await sendEmail({
    to: reservation.email,
    from,
    subject: '🎉 Gute Nachrichten! Ihre Reservierung wurde bestätigt',
    text: renderWaitlistPromotedEmailText(reservation),
    html: renderWaitlistPromotedEmail(reservation),
    attachments
  });

  await logEmail(reservation.confirmationCode, 'waitlist-promoted', [reservation.email]);
}

/**
 * Sends feedback request email after guest's visit.
 */
async function sendFeedbackRequestEmail(reservation, options = {}) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();

  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Wie war Ihr Besuch im Healthy Brunch Club? 🥗',
    text: renderFeedbackRequestEmailText(reservation, options),
    html: renderFeedbackRequestEmail(reservation, options)
  });

  await logEmail(reservation.confirmationCode, 'feedback-request', [reservation.email]);
}

/**
 * Sends status update email when reservation status changes.
 */
async function sendStatusUpdateEmail(reservation, previousStatus) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  // Handle specific status transitions
  // When admin confirms a pending reservation
  if (previousStatus === 'pending' && reservation.status === 'confirmed') {
    return sendConfirmationEmails(reservation);
  }

  // When a waitlisted reservation gets confirmed
  if (previousStatus === 'waitlisted' && reservation.status === 'confirmed') {
    return sendWaitlistPromotedEmail(reservation);
  }

  if (reservation.status === 'cancelled') {
    return sendCancellationEmails(reservation);
  }

  // For other status changes to confirmed, send confirmation email
  if (reservation.status === 'confirmed') {
    return sendConfirmationEmails(reservation);
  }

  // For other status changes, send a generic confirmation
  return sendReservationEmails(reservation);
}

module.exports = {
  sendReservationEmails,
  sendRequestReceivedEmails,
  sendConfirmationEmails,
  sendCancellationEmails,
  sendReminderEmail,
  sendWaitlistPromotedEmail,
  sendFeedbackRequestEmail,
  sendStatusUpdateEmail
};
