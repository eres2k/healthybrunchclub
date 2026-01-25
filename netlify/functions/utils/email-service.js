'use strict';

const sendEmail = require('./send-email');
const {
  renderGuestEmail,
  renderAdminEmail,
  renderIcs,
  createQrCode,
  renderCancellationEmail,
  renderReminderEmail,
  renderWaitlistPromotedEmail,
  renderWaitlistEmail,
  renderFeedbackRequestEmail,
  renderAdminCancellationEmail
} = require('./email-templates');
const { writeJSON } = require('./blob-storage');

const FROM_EMAIL = () => process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at';
const ADMIN_EMAIL = () => process.env.RESTAURANT_EMAIL || 'info@healthybrunchclub.at';

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
 * Sends confirmation emails for new reservations (guest + admin).
 */
async function sendReservationEmails(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmail = ADMIN_EMAIL();
  const qrCode = await createQrCode(reservation.confirmationCode);
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  // Choose template based on status
  const isWaitlisted = reservation.status === 'waitlisted';
  const guestHtml = isWaitlisted
    ? renderWaitlistEmail(reservation)
    : renderGuestEmail(reservation, { qrCode });

  const subject = isWaitlisted
    ? 'Healthy Brunch Club Wien – Warteliste'
    : 'Healthy Brunch Club Wien – Reservierungsbestätigung';

  await Promise.all([
    sendEmail({
      to: reservation.email,
      from,
      subject,
      html: guestHtml,
      attachments: isWaitlisted ? [] : attachments
    }),
    sendEmail({
      to: adminEmail,
      from,
      subject: `Neue Reservierung ${reservation.date} ${reservation.time}`,
      html: renderAdminEmail(reservation),
      attachments
    })
  ]);

  await logEmail(reservation.confirmationCode, 'confirmation', [reservation.email, adminEmail]);
}

/**
 * Sends cancellation confirmation emails (guest + admin).
 */
async function sendCancellationEmails(reservation, options = {}) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const adminEmail = ADMIN_EMAIL();

  await Promise.all([
    sendEmail({
      to: reservation.email,
      from,
      subject: 'Healthy Brunch Club Wien – Stornierungsbestätigung',
      html: renderCancellationEmail(reservation, options)
    }),
    sendEmail({
      to: adminEmail,
      from,
      subject: `Stornierung: ${reservation.name} - ${reservation.date} ${reservation.time}`,
      html: renderAdminCancellationEmail(reservation, options)
    })
  ]);

  await logEmail(reservation.confirmationCode, 'cancellation', [reservation.email, adminEmail]);
}

/**
 * Sends reminder email to guest (1 day before reservation).
 */
async function sendReminderEmail(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = FROM_EMAIL();
  const qrCode = await createQrCode(reservation.confirmationCode);
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  await sendEmail({
    to: reservation.email,
    from,
    subject: 'Erinnerung: Ihre Reservierung morgen im Healthy Brunch Club',
    html: renderReminderEmail(reservation, { qrCode }),
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
  const qrCode = await createQrCode(reservation.confirmationCode);
  const icsContent = renderIcs(reservation);
  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  await sendEmail({
    to: reservation.email,
    from,
    subject: '🎉 Gute Nachrichten! Ihre Reservierung wurde bestätigt',
    html: renderWaitlistPromotedEmail(reservation, { qrCode }),
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
  if (previousStatus === 'waitlisted' && reservation.status === 'confirmed') {
    return sendWaitlistPromotedEmail(reservation);
  }

  if (reservation.status === 'cancelled') {
    return sendCancellationEmails(reservation);
  }

  // For other status changes, send a generic confirmation
  return sendReservationEmails(reservation);
}

module.exports = {
  sendReservationEmails,
  sendCancellationEmails,
  sendReminderEmail,
  sendWaitlistPromotedEmail,
  sendFeedbackRequestEmail,
  sendStatusUpdateEmail
};
