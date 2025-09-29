const { Resend } = require('resend');
const {
  buildIcsContent
} = require('./reservation-utils');

function formatDateLabel(dateString, locale = 'de-AT') {
  try {
    const date = new Date(`${dateString}T12:00:00Z`);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

function buildAdminHtml(reservation, settings, restaurant) {
  const dateLabel = formatDateLabel(reservation.date);
  const guestCount = Number(reservation.guests || 0);
  const waitlistLabel = reservation.status === 'waitlist' ? ' (Warteliste)' : '';
  const note = reservation.message ? reservation.message.replace(/\n/g, '<br>') : 'Keine Angaben';
  const phone = reservation.phone ? `<a href="tel:${reservation.phone}">${reservation.phone}</a>` : '—';

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width:640px; margin:0 auto; padding:32px; background:#fff7f2; border-radius:24px; border:1px solid #f2d5c8;">
      <h1 style="margin:0 0 16px; color:#432b1f; font-size:24px;">Neue Reservierung${waitlistLabel}</h1>
      <p style="margin:0 0 12px; color:#694a3a; font-size:16px;">${reservation.name} hat soeben reserviert.</p>
      <div style="margin:24px 0; background:#ffffff; border-radius:18px; padding:24px; border:1px solid #f1d8c9;">
        <p style="margin:0; font-size:16px; color:#432b1f;"><strong>Datum:</strong> ${dateLabel}</p>
        <p style="margin:8px 0 0; font-size:16px; color:#432b1f;"><strong>Uhrzeit:</strong> ${reservation.time}</p>
        <p style="margin:8px 0 0; font-size:16px; color:#432b1f;"><strong>Personen:</strong> ${guestCount}</p>
        <p style="margin:8px 0 0; font-size:16px; color:#432b1f;"><strong>Status:</strong> ${reservation.status}</p>
        <p style="margin:16px 0 0; font-size:16px; color:#432b1f;"><strong>Kontakt:</strong> ${reservation.email} · ${phone}</p>
        <p style="margin:16px 0 0; font-size:16px; color:#432b1f;"><strong>Reservierungscode:</strong> ${reservation.confirmationCode}</p>
      </div>
      <h2 style="margin:24px 0 12px; color:#432b1f; font-size:18px;">Notiz</h2>
      <p style="margin:0; font-size:16px; color:#694a3a;">${note}</p>
      <p style="margin:32px 0 0; font-size:13px; color:#8a6f5c;">Reservierungsverwaltung: /.netlify/functions/manage-reservations</p>
    </div>
  `;
}

function buildGuestHtml(reservation, settings, restaurant) {
  const dateLabel = formatDateLabel(reservation.date);
  const guestCount = Number(reservation.guests || 0);
  const waitlist = reservation.status === 'waitlist';
  const note = settings?.default_note ? `<p style="margin:16px 0 0; font-size:15px; color:#5a4638;">${settings.default_note}</p>` : '';
  const intro = waitlist
    ? 'du stehst jetzt auf unserer Warteliste. Wir melden uns, sobald ein Platz frei wird.'
    : 'dein Tisch ist erfolgreich reserviert! Wir freuen uns auf deinen Besuch.';

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width:640px; margin:0 auto; padding:32px; background:#ffffff; border-radius:24px; border:1px solid #f2d5c8;">
      <h1 style="margin:0 0 16px; color:#432b1f; font-size:24px;">Liebe/r ${reservation.name},</h1>
      <p style="margin:0 0 16px; font-size:16px; color:#694a3a;">${intro}</p>
      <div style="margin:24px 0; background:#fff7f2; border-radius:18px; padding:24px; border:1px solid #f1d8c9;">
        <p style="margin:0; font-size:16px; color:#432b1f;"><strong>Datum:</strong> ${dateLabel}</p>
        <p style="margin:8px 0 0; font-size:16px; color:#432b1f;"><strong>Uhrzeit:</strong> ${reservation.time}</p>
        <p style="margin:8px 0 0; font-size:16px; color:#432b1f;"><strong>Personen:</strong> ${guestCount}</p>
        <p style="margin:16px 0 0; font-size:16px; color:#432b1f;"><strong>Reservierungscode:</strong> ${reservation.confirmationCode}</p>
      </div>
      <p style="margin:0; font-size:15px; color:#5a4638;">Bei Fragen erreichst du uns unter <a href="mailto:${restaurant?.email || 'hello@healthybrunchclub.at'}" style="color:#c27b68;">${restaurant?.email || 'hello@healthybrunchclub.at'}</a>.</p>
      ${note}
      <p style="margin:24px 0 0; font-size:14px; color:#8a6f5c;">Falls du doch nicht kommen kannst, nutze bitte den Stornierungslink oder antworte einfach auf diese E-Mail.</p>
    </div>
  `;
}

async function sendReservationEmails(reservation, settings, restaurant) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_NOTIFICATION_FROM || 'Healthy Brunch Club <hello@healthybrunchclub.at>';
  const adminRecipients = process.env.BOOKING_NOTIFICATION_TO;

  if (!apiKey) {
    console.warn('RESEND_API_KEY missing, skipping email dispatch');
    return;
  }

  const resend = new Resend(apiKey);
  const icsContent = buildIcsContent(reservation, restaurant);
  const attachments = [
    {
      filename: 'reservation.ics',
      content: Buffer.from(icsContent).toString('base64'),
      contentType: 'text/calendar',
      disposition: 'attachment'
    }
  ];

  const adminHtml = buildAdminHtml(reservation, settings, restaurant);
  const guestHtml = buildGuestHtml(reservation, settings, restaurant);
  const subjectBase = reservation.status === 'waitlist' ? 'Warteliste Healthy Brunch Club' : 'Reservierung Healthy Brunch Club';

  const promises = [];

  if (adminRecipients) {
    promises.push(
      resend.emails.send({
        from,
        to: adminRecipients.split(',').map(email => email.trim()).filter(Boolean),
        subject: `${subjectBase} – ${formatDateLabel(reservation.date)}`,
        html: adminHtml,
        attachments
      })
    );
  }

  if (reservation.email) {
    promises.push(
      resend.emails.send({
        from,
        to: reservation.email,
        subject: `${subjectBase} – ${formatDateLabel(reservation.date)}`,
        html: guestHtml,
        attachments
      })
    );
  }

  await Promise.all(promises);
}

module.exports = {
  sendReservationEmails
};
