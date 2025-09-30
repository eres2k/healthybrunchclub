'use strict';

const sendEmail = require('./send-email');
const { renderGuestEmail, renderAdminEmail, renderIcs, createQrCode } = require('./email-templates');
const { writeJSON } = require('./blob-storage');

function encodeAttachment(content, type, filename) {
  return {
    content: Buffer.from(content).toString('base64'),
    type,
    filename
  };
}

async function sendReservationEmails(reservation) {
  if (!reservation?.email) {
    throw new Error('E-Mail-Adresse fehlt für den Versand.');
  }

  const from = process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at';
  const adminEmail = process.env.RESTAURANT_EMAIL || 'info@healthybrunchclub.at';
  const qrCode = await createQrCode(reservation.confirmationCode);
  const guestHtml = renderGuestEmail(reservation, { qrCode });
  const adminHtml = renderAdminEmail(reservation);
  const icsContent = renderIcs(reservation);

  const attachments = [encodeAttachment(icsContent, 'text/calendar', `reservation-${reservation.confirmationCode}.ics`)];

  await Promise.all([
    sendEmail({
      to: reservation.email,
      from,
      subject: reservation.status === 'waitlisted'
        ? 'Healthy Brunch Club Wien – Warteliste'
        : 'Healthy Brunch Club Wien – Reservierungsbestätigung',
      html: guestHtml,
      attachments
    }),
    sendEmail({
      to: adminEmail,
      from,
      subject: `Neue Reservierung ${reservation.date} ${reservation.time}`,
      html: adminHtml,
      attachments
    })
  ]);

  await writeJSON('emailLog', `${reservation.confirmationCode}.json`, {
    confirmationCode: reservation.confirmationCode,
    sentAt: new Date().toISOString(),
    recipients: [reservation.email, adminEmail]
  });
}

module.exports = {
  sendReservationEmails
};
