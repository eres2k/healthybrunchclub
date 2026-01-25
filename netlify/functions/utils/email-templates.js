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
        <li>Telefon: ${reservation.phone}</li>
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

/**
 * Basis-Styles für alle E-Mail-Templates.
 * @returns {string}
 */
function getBaseStyles() {
  return `
    body { font-family: 'Lato', Arial, sans-serif; background-color: #f9f7f3; color: #24301d; margin: 0; padding: 20px; }
    .container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
    .header { padding: 32px; text-align: center; color: #fff; }
    .header-confirmed { background: linear-gradient(135deg, #8bc34a, #558b2f); }
    .header-cancelled { background: linear-gradient(135deg, #e57373, #c62828); }
    .header-reminder { background: linear-gradient(135deg, #64b5f6, #1976d2); }
    .header-waitlist { background: linear-gradient(135deg, #ffb74d, #f57c00); }
    .header-feedback { background: linear-gradient(135deg, #ba68c8, #7b1fa2); }
    .content { padding: 32px; }
    .section { margin-bottom: 24px; }
    .details { display: grid; grid-template-columns: 140px 1fr; row-gap: 12px; column-gap: 16px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 600; }
    .badge-green { background: #ecf8e3; color: #2c5923; }
    .badge-red { background: #ffebee; color: #c62828; }
    .badge-blue { background: #e3f2fd; color: #1565c0; }
    .badge-orange { background: #fff3e0; color: #e65100; }
    .footer { text-align: center; padding: 24px; color: #6b7a62; font-size: 13px; border-top: 1px solid #eee; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8bc34a, #558b2f); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 4px; }
    .button-secondary { background: linear-gradient(135deg, #64b5f6, #1976d2); }
    h1 { margin: 0 0 8px 0; font-size: 28px; }
    h2 { margin: 0 0 16px 0; color: #2c5923; }
    h3 { margin: 0 0 12px 0; color: #558b2f; }
    p { line-height: 1.6; margin: 0 0 16px 0; }
    .highlight-box { background: #f9f7f3; border-left: 4px solid #8bc34a; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  `;
}

/**
 * Erzeugt den gemeinsamen Footer für alle E-Mails.
 * @returns {string}
 */
function renderFooter() {
  return `
    <div class="footer">
      <p><strong>Healthy Brunch Club Wien</strong></p>
      <p>Gumpendorfer Straße 65 · 1060 Wien</p>
      <p>Tel: +43 1 234 56 78 · info@healthybrunchclub.at</p>
      <p style="margin-top: 16px; font-size: 12px;">
        Sollten Sie Fragen haben oder Ihre Reservierung ändern wollen, antworten Sie einfach auf diese E-Mail.
      </p>
    </div>
  `;
}

/**
 * Erzeugt die Reservierungsdetails-Sektion.
 * @param {object} reservation
 * @returns {string}
 */
function renderReservationDetails(reservation) {
  const date = DateTime.fromISO(reservation.date, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('dd.MM.yyyy');

  return `
    <div class="details">
      <span><strong>Datum</strong></span>
      <span>${date}</span>
      <span><strong>Uhrzeit</strong></span>
      <span>${reservation.time} Uhr</span>
      <span><strong>Anzahl Gäste</strong></span>
      <span>${reservation.guests} ${reservation.guests === 1 ? 'Person' : 'Personen'}</span>
      <span><strong>Name</strong></span>
      <span>${reservation.name}</span>
      ${reservation.specialRequests ? `<span><strong>Besondere Wünsche</strong></span><span>${reservation.specialRequests}</span>` : ''}
    </div>
  `;
}

/**
 * Erzeugt das HTML für die Stornierungsbestätigung.
 * @param {object} reservation
 * @param {{ reason?: string }} [options]
 * @returns {string}
 */
function renderCancellationEmail(reservation, options = {}) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Stornierungsbestätigung</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-cancelled">
          <h1>Reservierung storniert</h1>
          <p>Ihre Reservierung wurde erfolgreich storniert.</p>
        </div>
        <div class="content">
          <div class="section">
            <span class="badge badge-red">Storniert</span>
            <h2 style="color: #c62828;">Bestätigungscode: ${reservation.confirmationCode}</h2>
          </div>

          <div class="section">
            <h3>Stornierte Reservierung</h3>
            ${renderReservationDetails(reservation)}
          </div>

          ${options.reason ? `
          <div class="highlight-box" style="border-left-color: #e57373;">
            <strong>Stornierungsgrund:</strong><br>
            ${options.reason}
          </div>
          ` : ''}

          <div class="section">
            <p>Wir bedauern, dass Sie uns diesmal nicht besuchen können. Wir würden uns freuen, Sie bald wieder bei uns begrüßen zu dürfen!</p>
            <p style="text-align: center; margin-top: 24px;">
              <a href="https://healthybrunchclub.at/#reservation" class="button">Neue Reservierung</a>
            </p>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Erzeugt das HTML für die Erinnerungs-E-Mail (1 Tag vorher).
 * @param {object} reservation
 * @param {{ qrCode?: string }} [options]
 * @returns {string}
 */
function renderReminderEmail(reservation, options = {}) {
  const date = DateTime.fromISO(reservation.date, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Erinnerung: Ihre Reservierung morgen</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-reminder">
          <h1>Wir freuen uns auf Sie!</h1>
          <p>Erinnerung an Ihre Reservierung morgen</p>
        </div>
        <div class="content">
          <div class="section">
            <span class="badge badge-blue">Morgen</span>
            <h2>Bestätigungscode: ${reservation.confirmationCode}</h2>
          </div>

          ${options.qrCode ? `
          <div class="section" style="text-align:center;">
            <img src="${options.qrCode}" alt="QR-Code Reservierung" style="max-width:180px; width:100%;" />
            <p style="font-size: 13px; color: #6b7a62;">Zeigen Sie diesen Code bei Ankunft</p>
          </div>` : ''}

          <div class="highlight-box">
            <strong>📅 ${date}</strong><br>
            <strong>🕐 ${reservation.time} Uhr</strong><br>
            <strong>👥 ${reservation.guests} ${reservation.guests === 1 ? 'Person' : 'Personen'}</strong>
          </div>

          <div class="section">
            <h3>Wichtige Informationen</h3>
            <ul style="line-height: 1.8;">
              <li>Bitte kommen Sie pünktlich zum reservierten Zeitpunkt</li>
              <li>Bringen Sie Ihren Bestätigungscode oder QR-Code mit</li>
              <li>Bei Verspätung von mehr als 15 Minuten kann Ihre Reservierung verfallen</li>
            </ul>
          </div>

          <div class="section">
            <h3>So finden Sie uns</h3>
            <p>
              <strong>Healthy Brunch Club Wien</strong><br>
              Gumpendorfer Straße 65, 1060 Wien<br>
              <a href="https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien" style="color: #558b2f;">📍 Route anzeigen</a>
            </p>
          </div>

          <div class="section" style="text-align: center;">
            <p>Müssen Sie Ihre Reservierung ändern oder stornieren?</p>
            <a href="mailto:info@healthybrunchclub.at?subject=Reservierung ${reservation.confirmationCode}" class="button button-secondary">Kontakt aufnehmen</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Erzeugt das HTML wenn jemand von der Warteliste bestätigt wird.
 * @param {object} reservation
 * @param {{ qrCode?: string }} [options]
 * @returns {string}
 */
function renderWaitlistPromotedEmail(reservation, options = {}) {
  const date = DateTime.fromISO(reservation.date, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('dd.MM.yyyy');

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Gute Nachrichten! Ihre Reservierung ist bestätigt</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-confirmed">
          <h1>🎉 Platz frei geworden!</h1>
          <p>Ihre Reservierung von der Warteliste wurde bestätigt</p>
        </div>
        <div class="content">
          <div class="section">
            <span class="badge badge-green">Bestätigt</span>
            <h2>Bestätigungscode: ${reservation.confirmationCode}</h2>
          </div>

          ${options.qrCode ? `
          <div class="section" style="text-align:center;">
            <img src="${options.qrCode}" alt="QR-Code Reservierung" style="max-width:180px; width:100%;" />
          </div>` : ''}

          <div class="highlight-box">
            <p style="margin: 0;"><strong>Tolle Neuigkeiten!</strong> Ein Platz ist frei geworden und Ihre Reservierung wurde von der Warteliste bestätigt.</p>
          </div>

          <div class="section">
            <h3>Ihre Reservierungsdetails</h3>
            ${renderReservationDetails(reservation)}
          </div>

          <div class="section">
            <p>Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen! Bitte bringen Sie diesen Bestätigungscode oder den QR-Code zu Ihrem Besuch mit.</p>
          </div>

          <div class="section" style="text-align: center; background: #ecf8e3; padding: 20px; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Können Sie den Termin nicht wahrnehmen?</strong><br>
              Bitte stornieren Sie rechtzeitig, damit andere Gäste nachrücken können.
            </p>
            <a href="mailto:info@healthybrunchclub.at?subject=Stornierung ${reservation.confirmationCode}" style="color: #c62828; font-weight: 600;">Reservierung stornieren</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Erzeugt das HTML für die Wartelisten-Bestätigung.
 * @param {object} reservation
 * @returns {string}
 */
function renderWaitlistEmail(reservation) {
  const date = DateTime.fromISO(reservation.date, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('dd.MM.yyyy');

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Sie sind auf der Warteliste</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-waitlist">
          <h1>Warteliste</h1>
          <p>Sie wurden auf die Warteliste gesetzt</p>
        </div>
        <div class="content">
          <div class="section">
            <span class="badge badge-orange">Warteliste</span>
            <h2>Bestätigungscode: ${reservation.confirmationCode}</h2>
          </div>

          <div class="highlight-box" style="border-left-color: #ffb74d;">
            <p style="margin: 0;">Leider sind zum gewünschten Zeitpunkt alle Plätze belegt. Wir haben Sie auf unsere Warteliste gesetzt und benachrichtigen Sie sofort, wenn ein Platz frei wird.</p>
          </div>

          <div class="section">
            <h3>Ihre Anfrage</h3>
            ${renderReservationDetails(reservation)}
          </div>

          <div class="section">
            <h3>Wie geht es weiter?</h3>
            <ul style="line-height: 1.8;">
              <li>Wir benachrichtigen Sie per E-Mail, sobald ein Platz frei wird</li>
              <li>Ihre Position auf der Warteliste hängt vom Zeitpunkt Ihrer Anfrage ab</li>
              <li>Sie können jederzeit eine alternative Zeit buchen</li>
            </ul>
          </div>

          <div class="section" style="text-align: center;">
            <p>Möchten Sie einen anderen Termin wählen?</p>
            <a href="https://healthybrunchclub.at/#reservation" class="button">Andere Zeit buchen</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Erzeugt das HTML für die Feedback-Anfrage nach dem Besuch.
 * @param {object} reservation
 * @param {{ feedbackUrl?: string }} [options]
 * @returns {string}
 */
function renderFeedbackRequestEmail(reservation, options = {}) {
  const feedbackUrl = options.feedbackUrl || 'https://g.page/r/healthybrunchclub/review';

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Wie war Ihr Besuch?</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-feedback">
          <h1>Danke für Ihren Besuch!</h1>
          <p>Wir hoffen, es hat Ihnen geschmeckt</p>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <p style="font-size: 48px; margin: 0;">🥗🥑🍳</p>
          </div>

          <div class="section">
            <p>Liebe/r ${reservation.name.split(' ')[0]},</p>
            <p>vielen Dank, dass Sie uns im Healthy Brunch Club Wien besucht haben! Wir hoffen, Sie hatten eine wunderbare Zeit und unser gesundes Brunch hat Ihnen geschmeckt.</p>
          </div>

          <div class="highlight-box" style="border-left-color: #ba68c8;">
            <p style="margin: 0;"><strong>Ihre Meinung ist uns wichtig!</strong><br>
            Würden Sie sich einen Moment Zeit nehmen, um uns eine Bewertung zu hinterlassen? Das hilft uns, unseren Service zu verbessern und anderen Gästen bei ihrer Entscheidung.</p>
          </div>

          <div class="section" style="text-align: center;">
            <a href="${feedbackUrl}" class="button" style="background: linear-gradient(135deg, #ba68c8, #7b1fa2);">⭐ Bewertung abgeben</a>
          </div>

          <div class="section">
            <h3>Kommen Sie wieder!</h3>
            <p>Als Dankeschön für Ihre Treue erhalten Sie bei Ihrer nächsten Reservierung eine kleine Überraschung. Erwähnen Sie einfach diesen Code bei Ihrem nächsten Besuch:</p>
            <div style="text-align: center; background: #f3e5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <span style="font-size: 24px; font-weight: bold; color: #7b1fa2; letter-spacing: 2px;">DANKE10</span>
            </div>
          </div>

          <div class="section" style="text-align: center;">
            <a href="https://healthybrunchclub.at/#reservation" class="button button-secondary">Nächste Reservierung</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Erzeugt eine Admin-Benachrichtigung für Stornierungen.
 * @param {object} reservation
 * @param {{ reason?: string, cancelledBy?: string }} [options]
 * @returns {string}
 */
function renderAdminCancellationEmail(reservation, options = {}) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head><meta charset="utf-8" /></head>
    <body>
      <h2 style="color: #c62828;">⚠️ Reservierung storniert</h2>
      <ul>
        <li><strong>Bestätigungscode:</strong> ${reservation.confirmationCode}</li>
        <li><strong>Name:</strong> ${reservation.name}</li>
        <li><strong>Datum:</strong> ${DateTime.fromISO(reservation.date).toFormat('dd.MM.yyyy')}</li>
        <li><strong>Zeit:</strong> ${reservation.time} Uhr</li>
        <li><strong>Gäste:</strong> ${reservation.guests}</li>
        <li><strong>Telefon:</strong> ${reservation.phone}</li>
        <li><strong>E-Mail:</strong> ${reservation.email}</li>
        ${options.reason ? `<li><strong>Stornierungsgrund:</strong> ${options.reason}</li>` : ''}
        ${options.cancelledBy ? `<li><strong>Storniert von:</strong> ${options.cancelledBy}</li>` : ''}
        <li><strong>Storniert am:</strong> ${DateTime.now().setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm')} Uhr</li>
      </ul>
      <p style="color: #666;">Der Platz ist nun wieder verfügbar. Prüfen Sie die Warteliste für mögliche Nachrücker.</p>
    </body>
  </html>`;
}

module.exports = {
  renderGuestEmail,
  renderAdminEmail,
  renderIcs,
  createQrCode,
  translateStatus,
  // New templates
  renderCancellationEmail,
  renderReminderEmail,
  renderWaitlistPromotedEmail,
  renderWaitlistEmail,
  renderFeedbackRequestEmail,
  renderAdminCancellationEmail,
  // Helper functions
  getBaseStyles,
  renderFooter,
  renderReservationDetails
};
