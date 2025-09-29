const { Resend } = require('resend');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateLabel(date) {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat('de-AT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTimeLabel(time) {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} Uhr`;
}

function buildTextBody(reservation, isAdmin = false) {
  const dateLabel = formatDateLabel(reservation.date);
  const lines = [
    isAdmin ? 'Neue Reservierung' : 'Vielen Dank für Ihre Reservierung!',
    '----------------------------------------',
    `Datum: ${dateLabel}`,
    `Uhrzeit: ${formatTimeLabel(reservation.time)}`,
    `Personen: ${reservation.guests}`,
    `Name: ${reservation.name}`,
    `E-Mail: ${reservation.email || '—'}`,
    `Telefon: ${reservation.phone || '—'}`,
    reservation.status === 'waitlist'
      ? 'Status: Auf Warteliste gesetzt'
      : 'Status: Bestätigt'
  ];

  if (reservation.notes) {
    lines.push('', 'Besondere Wünsche:', reservation.notes);
  }

  return lines.join('\n');
}

function buildHtmlBody(reservation, options = {}) {
  const isAdmin = Boolean(options.isAdmin);
  const dateLabel = formatDateLabel(reservation.date);
  const timeLabel = formatTimeLabel(reservation.time);
  const statusText = reservation.status === 'waitlist'
    ? 'Auf Warteliste'
    : 'Bestätigt';

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#f9f5f2; padding:32px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 50px rgba(89, 67, 55, 0.1);">
        <div style="background:linear-gradient(120deg,#f7b58d,#e46d8c); color:#fff; padding:28px 36px;">
          <h1 style="margin:0; font-size:26px; letter-spacing:0.08em; text-transform:uppercase;">
            ${isAdmin ? 'Neue Reservierung' : 'Healthy Brunch Club'}
          </h1>
          <p style="margin:8px 0 0; font-size:16px; opacity:0.85;">${escapeHtml(dateLabel)} · ${escapeHtml(timeLabel)}</p>
        </div>
        <div style="padding:32px 36px;">
          <p style="margin:0 0 18px; font-size:16px; color:#4c372a;">
            ${isAdmin
              ? 'Es wurde eine neue Reservierung vorgenommen. Hier die Details auf einen Blick:'
              : 'wir freuen uns auf Ihren Besuch im Healthy Brunch Club Wien. Ihre Reservierung wurde aufgenommen.'}
          </p>
          <div style="border-radius:18px; border:1px solid #f0dfd1; padding:24px 28px; background:#fffaf6;">
            <p style="margin:0 0 10px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#c17c6d;">Reservierungsdetails</p>
            <ul style="list-style:none; margin:0; padding:0; color:#3f2a1f; font-size:15px; line-height:1.7;">
              <li><strong>Status:</strong> ${escapeHtml(statusText)}</li>
              <li><strong>Datum:</strong> ${escapeHtml(dateLabel)}</li>
              <li><strong>Uhrzeit:</strong> ${escapeHtml(timeLabel)}</li>
              <li><strong>Personen:</strong> ${escapeHtml(String(reservation.guests))}</li>
              <li><strong>Name:</strong> ${escapeHtml(reservation.name)}</li>
              <li><strong>E-Mail:</strong> ${escapeHtml(reservation.email || '—')}</li>
              <li><strong>Telefon:</strong> ${escapeHtml(reservation.phone || '—')}</li>
            </ul>
          </div>
          ${reservation.notes ? `<div style="margin-top:24px; padding:22px 24px; border-radius:18px; border:1px dashed #e3c6b3; background:#fff;">
            <p style="margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:0.16em; color:#b68d75;">Besondere Wünsche</p>
            <p style="margin:0; font-size:15px; color:#5b4131;">${escapeHtml(reservation.notes)}</p>
          </div>` : ''}
          ${options.guestNotes ? `<div style="margin-top:28px; padding:20px 24px; border-radius:18px; background:#f7eee6; color:#5b4131;">
            <p style="margin:0; font-size:14px; line-height:1.6;">${escapeHtml(options.guestNotes)}</p>
          </div>` : ''}
        </div>
        <div style="background:#f3e7de; padding:18px 36px; text-align:center; color:#866956; font-size:12px; letter-spacing:0.12em; text-transform:uppercase;">
          Healthy Brunch Club Wien · Neubaugürtel 34/1 · 1070 Wien
        </div>
      </div>
    </div>
  `;
}

function formatDateTimeForICS(date, time) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildIcsAttachment(reservation) {
  const start = formatDateTimeForICS(reservation.date, reservation.time);
  if (!start) {
    return null;
  }

  const durationMinutes = reservation.durationMinutes || 90;
  const startDate = new Date(start.replace('Z', ''));
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = reservation.id || `${reservation.date}-${reservation.time}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Healthy Brunch Club//Reservation//DE',
    'BEGIN:VEVENT',
    `UID:${uid}@healthybrunchclub.at`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Reservierung Healthy Brunch Club`,
    reservation.name ? `ATTENDEE;CN=${reservation.name}:MAILTO:${reservation.email || ''}` : null,
    `DESCRIPTION:Reservierung für ${reservation.guests} Personen`,
    'LOCATION:Healthy Brunch Club Wien',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
    .filter(Boolean)
    .join('\n');

  return {
    filename: `reservation-${uid}.ics`,
    content: Buffer.from(ics).toString('base64'),
    type: 'text/calendar'
  };
}

async function sendReservationEmails(reservation, options = {}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY nicht gesetzt – E-Mails werden nicht versendet.');
    return { skipped: true };
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = process.env.BOOKING_NOTIFICATION_FROM || options.defaultFrom || 'Healthy Brunch Club <hello@healthybrunchclub.at>';
  const adminRecipients = (process.env.BOOKING_NOTIFICATION_TO || options.adminRecipients || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const attachments = [];
  const ics = buildIcsAttachment(reservation);
  if (ics) {
    attachments.push(ics);
  }

  const adminPayload = {
    from: fromAddress,
    to: adminRecipients,
    subject: `Neue Reservierung · ${formatDateLabel(reservation.date)} ${reservation.time}`,
    html: buildHtmlBody(reservation, { isAdmin: true, guestNotes: options.guestNotes }),
    text: buildTextBody(reservation, true),
    attachments,
    tags: [
      { name: 'environment', value: process.env.CONTEXT || 'unknown' },
      { name: 'type', value: 'reservation' }
    ]
  };

  const sends = [];
  if (adminRecipients.length > 0) {
    sends.push(resend.emails.send(adminPayload));
  }

  if (reservation.email) {
    sends.push(
      resend.emails.send({
        from: fromAddress,
        to: reservation.email,
        subject: reservation.status === 'waitlist'
          ? 'Healthy Brunch Club – Warteliste'
          : 'Healthy Brunch Club – Reservierungsbestätigung',
        html: buildHtmlBody(reservation, { guestNotes: options.guestNotes }),
        text: buildTextBody(reservation, false),
        attachments
      })
    );
  }

  if (sends.length === 0) {
    return { skipped: true };
  }

  await Promise.all(sends);
  return { skipped: false };
}

module.exports = {
  sendReservationEmails,
  buildHtmlBody,
  buildTextBody,
  buildIcsAttachment
};
