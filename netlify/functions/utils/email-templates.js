'use strict';

const QRCode = require('qrcode');
const { DateTime } = require('luxon');

/**
 * Erzeugt das HTML für die Gästebestätigung.
 * @param {object} reservation
 * @param {{ qrCode?: string }} [options]
 * @returns {string}
 */
function renderGuestEmail(reservation, options = {}) {
  const date = DateTime.fromISO(reservation.date, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('dd.MM.yyyy');
  const time = reservation.time;

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Reservierungsbestätigung</title>
      <style>
        body { font-family: 'Lato', Arial, sans-serif; background-color: #f9f7f3; color: #24301d; }
        .container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #8bc34a, #558b2f); color: #fff; padding: 32px; text-align: center; }
        .content { padding: 32px; }
        .section { margin-bottom: 24px; }
        .details { display: grid; grid-template-columns: 140px 1fr; row-gap: 12px; column-gap: 16px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #ecf8e3; color: #2c5923; font-weight: 600; }
        .footer { text-align: center; padding: 24px; color: #6b7a62; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Healthy Brunch Club Wien</h1>
          <p>Ihre Reservierung wurde erfolgreich bestätigt.</p>
        </div>
        <div class="content">
          <div class="section">
            <span class="badge">Bestätigungscode</span>
            <h2>${reservation.confirmationCode}</h2>
          </div>
          ${options.qrCode ? `
          <div class="section" style="text-align:center;">
            <img src="${options.qrCode}" alt="QR-Code Reservierung" style="max-width:180px; width:100%;" />
          </div>` : ''}
          <div class="section">
            <h3>Ihre Reservierungsdetails</h3>
            <div class="details">
              <span>Datum</span>
              <span>${date}</span>
              <span>Uhrzeit</span>
              <span>${time} Uhr</span>
              <span>Anzahl Gäste</span>
              <span>${reservation.guests}</span>
              <span>Name</span>
              <span>${reservation.name}</span>
              <span>Status</span>
              <span>${translateStatus(reservation.status)}</span>
              ${reservation.specialRequests ? `<span>Besondere Wünsche</span><span>${reservation.specialRequests}</span>` : ''}
            </div>
          </div>
          <div class="section">
            <p>Wir freuen uns auf Ihren Besuch im Healthy Brunch Club Wien! Bitte bringen Sie diesen Code oder den beigefügten QR-Code zur schnelleren Abwicklung mit.</p>
          </div>
        </div>
        <div class="footer">
          <p>Healthy Brunch Club Wien · Neubaugasse 1 · 1070 Wien · +43 1 234 56 78</p>
          <p>Sollten Sie Fragen haben oder Ihre Reservierung ändern wollen, antworten Sie einfach auf diese E-Mail.</p>
        </div>
      </div>
    </body>
  </html>`;
}

/**
 * Übersetzt den internen Status in eine benutzerfreundliche Beschreibung.
 * @param {string} status
 * @returns {string}
 */
function translateStatus(status) {
  switch (status) {
    case 'waitlisted':
      return 'Warteliste';
    case 'cancelled':
      return 'Storniert';
    default:
      return 'Bestätigt';
  }
}

/**
 * Erzeugt den HTML-Report für das Team.
 * @param {object} reservation
 * @returns {string}
 */
function renderAdminEmail(reservation) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head><meta charset="utf-8" /></head>
    <body>
      <h2>Neue Reservierung</h2>
      <ul>
        <li>Bestätigungscode: ${reservation.confirmationCode}</li>
        <li>Name: ${reservation.name}</li>
        <li>Datum: ${DateTime.fromISO(reservation.date).toFormat('dd.MM.yyyy')}</li>
        <li>Zeit: ${reservation.time} Uhr</li>
        <li>Gäste: ${reservation.guests}</li>
        <li>Status: ${translateStatus(reservation.status)}</li>
        <li>Telefon: ${reservation.phone || '—'}</li>
        <li>E-Mail: ${reservation.email}</li>
        ${reservation.specialRequests ? `<li>Besondere Wünsche: ${reservation.specialRequests}</li>` : ''}
      </ul>
    </body>
  </html>`;
}

/**
 * Erstellt den ICS-Kalendereintrag.
 * @param {object} reservation
 * @returns {string}
 */
function renderIcs(reservation) {
  const start = DateTime.fromISO(`${reservation.date}T${reservation.time}`, {
    zone: reservation.timezone || 'Europe/Vienna'
  });
  const end = start.plus({ hours: 2 });

  const format = (dt) => dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Healthy Brunch Club Wien//Reservierung//DE',
    'BEGIN:VEVENT',
    `UID:${reservation.confirmationCode}@healthybrunchclub.at`,
    `DTSTAMP:${format(DateTime.utc())}`,
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:Reservierung Healthy Brunch Club Wien`,
    `DESCRIPTION:Reservierung für ${reservation.guests} Personen`,
    'LOCATION:Healthy Brunch Club Wien, Neubaugasse 1, 1070 Wien',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Erstellt eine QR-Code-Grafik mit dem Bestätigungscode.
 * @param {string} confirmationCode
 * @returns {Promise<string>}
 */
async function createQrCode(confirmationCode) {
  return QRCode.toDataURL(confirmationCode, { margin: 1, scale: 6, errorCorrectionLevel: 'H' });
}

module.exports = {
  renderGuestEmail,
  renderAdminEmail,
  renderIcs,
  createQrCode,
  translateStatus
};
