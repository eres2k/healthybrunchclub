'use strict';

const { DateTime } = require('luxon');

/**
 * Featured dishes to promote in guest emails
 */
const FEATURED_DISHES = [
  {
    name: 'Avocado Bowl',
    description: 'Cremige Avocado mit pochierten Eiern, Quinoa & Microgreens',
    icon: '🥑'
  },
  {
    name: 'Açaí Energy Bowl',
    description: 'Açaí, Banane, Beeren, hausgemachtes Granola & Kokosflocken',
    icon: '🥣'
  },
  {
    name: 'Eggs Any Style',
    description: 'Bio-Eier nach Wahl auf Süßkartoffel & Avocado',
    icon: '🍳'
  }
];

/**
 * Premium base styles matching the website design
 * Colors: black #1a1a1a, gold #c9a961, sage #7a8b68, cream #f5f0e8
 */
function getBaseStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Montserrat:wght@300;400;500&display=swap');

    body {
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 300;
      background-color: #f5f0e8;
      color: #2d2d2d;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 0;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header {
      padding: 48px 32px;
      text-align: center;
      color: #fff;
      background: #1a1a1a;
    }
    .header-confirmed { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); }
    .header-cancelled { background: linear-gradient(135deg, #8b4049 0%, #6b2d35 100%); }
    .header-reminder { background: linear-gradient(135deg, #1e4a3c 0%, #2d5a4a 100%); }
    .header-waitlist { background: linear-gradient(135deg, #8b7355 0%, #6b5a45 100%); }
    .header-feedback { background: linear-gradient(135deg, #7a8b68 0%, #5a6b48 100%); }
    .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #c9a961;
      margin-bottom: 24px;
    }
    .content { padding: 40px 32px; }
    .section { margin-bottom: 32px; }
    .gold-line {
      width: 60px;
      height: 1px;
      background: #c9a961;
      margin: 16px auto;
    }
    .details {
      border: 1px solid #e8e8e8;
      padding: 24px;
      margin: 16px 0;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f5f0e8;
    }
    .details-row:last-child { border-bottom: none; }
    .details-label {
      color: #484848;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .details-value {
      color: #1a1a1a;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 500;
    }
    .badge-confirmed { background: #f5f0e8; color: #1e4a3c; }
    .badge-cancelled { background: #fdf2f2; color: #8b4049; }
    .badge-waitlist { background: #faf6f1; color: #8b7355; }
    .badge-reminder { background: #f0f5f3; color: #1e4a3c; }
    .footer {
      text-align: center;
      padding: 32px;
      background: #fafaf8;
      color: #484848;
      font-size: 13px;
    }
    .footer-brand {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background: #1a1a1a;
      color: #fff !important;
      text-decoration: none;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 500;
      margin: 8px 4px;
      transition: all 0.3s ease;
    }
    .button:hover { background: #2d2d2d; }
    .button-gold {
      background: #c9a961;
      color: #1a1a1a !important;
    }
    .button-outline {
      background: transparent;
      border: 1px solid #1a1a1a;
      color: #1a1a1a !important;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 400;
      letter-spacing: -0.5px;
    }
    h2 {
      font-family: 'Playfair Display', Georgia, serif;
      margin: 0 0 16px 0;
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 400;
    }
    h3 {
      font-family: 'Playfair Display', Georgia, serif;
      margin: 0 0 12px 0;
      color: #1a1a1a;
      font-size: 18px;
      font-weight: 400;
    }
    p { line-height: 1.7; margin: 0 0 16px 0; }
    .highlight-box {
      background: #fafaf8;
      border-left: 3px solid #c9a961;
      padding: 20px 24px;
      margin: 24px 0;
    }
    .code-display {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      letter-spacing: 4px;
      color: #c9a961;
      text-align: center;
      padding: 24px;
      background: #1a1a1a;
      margin: 16px 0;
    }
    .dish-card {
      display: flex;
      align-items: center;
      padding: 16px;
      background: #fafaf8;
      margin-bottom: 12px;
      border-left: 3px solid #c9a961;
    }
    .dish-icon {
      font-size: 32px;
      margin-right: 16px;
    }
    .dish-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .dish-desc {
      font-size: 13px;
      color: #484848;
    }
  `;
}

/**
 * Renders the premium footer for all emails
 */
function renderFooter() {
  return `
    <div class="footer">
      <div class="footer-brand">Healthy Brunch Club Wien</div>
      <p style="margin: 8px 0;">Gumpendorfer Straße 65 · 1060 Wien</p>
      <p style="margin: 8px 0; color: #c9a961;">info@healthybrunchclub.at</p>
      <div class="gold-line" style="margin: 16px auto;"></div>
      <p style="font-size: 11px; color: #888; margin-top: 16px;">
        Eat well. Feel better.
      </p>
    </div>
  `;
}

/**
 * Renders the featured dishes section for guest emails
 */
function renderFeaturedDishes() {
  return `
    <div class="section">
      <h3 style="text-align: center;">Was Sie bei uns erwartet</h3>
      <div class="gold-line"></div>
      <div style="margin-top: 24px;">
        ${FEATURED_DISHES.map(dish => `
          <div class="dish-card">
            <span class="dish-icon">${dish.icon}</span>
            <div>
              <div class="dish-name">${dish.name}</div>
              <div class="dish-desc">${dish.description}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://healthybrunchclub.at/menu" class="button button-outline">Menü ansehen</a>
      </p>
    </div>
  `;
}

/**
 * Renders reservation details in premium style
 */
function renderReservationDetails(reservation) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  return `
    <div class="details">
      <div class="details-row">
        <span class="details-label">Datum</span>
        <span class="details-value">${date}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Uhrzeit</span>
        <span class="details-value">${reservation.time} Uhr</span>
      </div>
      <div class="details-row">
        <span class="details-label">Personen</span>
        <span class="details-value">${reservation.guests} ${reservation.guests === 1 ? 'Gast' : 'Gäste'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Name</span>
        <span class="details-value">${reservation.name}</span>
      </div>
      ${reservation.specialRequests ? `
      <div class="details-row">
        <span class="details-label">Wünsche</span>
        <span class="details-value">${reservation.specialRequests}</span>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Translates status to German
 */
function translateStatus(status) {
  switch (status) {
    case 'waitlisted': return 'Warteliste';
    case 'cancelled': return 'Storniert';
    default: return 'Bestätigt';
  }
}

/**
 * Guest confirmation email with premium styling and dish promotions
 */
function renderGuestEmail(reservation, options = {}) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reservierungsbestätigung</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-confirmed">
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Reservierung bestätigt</h1>
          <div class="gold-line"></div>
          <p style="margin: 0; opacity: 0.9;">Wir freuen uns auf Ihren Besuch</p>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-confirmed">Bestätigt</span>
            <div class="code-display">${reservation.confirmationCode}</div>
            <p style="font-size: 13px; color: #484848;">Ihr Bestätigungscode</p>
          </div>

          <div class="section">
            <h3>Ihre Reservierung</h3>
            <div class="gold-line" style="margin: 12px 0 20px 0; margin-left: 0;"></div>
            ${renderReservationDetails(reservation)}
          </div>

          ${renderFeaturedDishes()}

          <div class="highlight-box">
            <p style="margin: 0;"><strong>Gut zu wissen:</strong> Bitte kommen Sie pünktlich. Bei Verspätungen über 15 Minuten kann Ihre Reservierung an wartende Gäste vergeben werden.</p>
          </div>

          <div class="section" style="text-align: center;">
            <h3>So finden Sie uns</h3>
            <p>Gumpendorfer Straße 65, 1060 Wien</p>
            <a href="https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien" class="button button-outline">Route planen</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Admin email for new reservations (styled)
 */
function renderAdminEmail(reservation) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Neue Reservierung</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-confirmed">
          <div class="logo-text">Admin Benachrichtigung</div>
          <h1>Neue Reservierung</h1>
          <div class="gold-line"></div>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-confirmed">${translateStatus(reservation.status)}</span>
            <div class="code-display">${reservation.confirmationCode}</div>
          </div>

          <div class="section">
            <h3>Reservierungsdetails</h3>
            <div class="details">
              <div class="details-row">
                <span class="details-label">Datum</span>
                <span class="details-value">${date}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Uhrzeit</span>
                <span class="details-value">${reservation.time} Uhr</span>
              </div>
              <div class="details-row">
                <span class="details-label">Personen</span>
                <span class="details-value">${reservation.guests}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Gast-Informationen</h3>
            <div class="details">
              <div class="details-row">
                <span class="details-label">Name</span>
                <span class="details-value">${reservation.name}</span>
              </div>
              <div class="details-row">
                <span class="details-label">E-Mail</span>
                <span class="details-value"><a href="mailto:${reservation.email}" style="color: #c9a961;">${reservation.email}</a></span>
              </div>
              <div class="details-row">
                <span class="details-label">Telefon</span>
                <span class="details-value"><a href="tel:${reservation.phone}" style="color: #c9a961;">${reservation.phone}</a></span>
              </div>
              ${reservation.specialRequests ? `
              <div class="details-row">
                <span class="details-label">Wünsche</span>
                <span class="details-value">${reservation.specialRequests}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section" style="text-align: center;">
            <a href="https://healthybrunchclub.at/admin/reservations.html" class="button button-gold">Reservierungen verwalten</a>
          </div>
        </div>
        <div class="footer">
          <p style="font-size: 12px; color: #888;">Diese E-Mail wurde automatisch generiert am ${DateTime.now().setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm')} Uhr</p>
        </div>
      </div>
    </body>
  </html>`;
}

/**
 * Cancellation email for guests
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
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Reservierung storniert</h1>
          <div class="gold-line"></div>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-cancelled">Storniert</span>
            <div class="code-display" style="background: #8b4049;">${reservation.confirmationCode}</div>
          </div>

          <div class="section">
            <h3>Stornierte Reservierung</h3>
            ${renderReservationDetails(reservation)}
          </div>

          ${options.reason ? `
          <div class="highlight-box" style="border-left-color: #8b4049;">
            <p style="margin: 0;"><strong>Stornierungsgrund:</strong><br>${options.reason}</p>
          </div>
          ` : ''}

          <div class="section">
            <p>Schade, dass Sie uns diesmal nicht besuchen können. Wir würden uns freuen, Sie bald bei uns begrüßen zu dürfen!</p>
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="text-align: center;">
            <a href="https://healthybrunchclub.at/#reservation" class="button">Neue Reservierung</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Reminder email (day before)
 */
function renderReminderEmail(reservation, options = {}) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
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
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Bis morgen!</h1>
          <div class="gold-line"></div>
          <p style="margin: 0; opacity: 0.9;">Wir freuen uns auf Ihren Besuch</p>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-reminder">Morgen</span>
            <div class="code-display">${reservation.confirmationCode}</div>
          </div>

          <div class="highlight-box" style="background: #1a1a1a; border-left-color: #c9a961;">
            <p style="margin: 0; color: #fff; text-align: center;">
              <span style="color: #c9a961; font-size: 14px;">📅</span> <strong style="color: #fff;">${date}</strong><br>
              <span style="color: #c9a961; font-size: 14px;">🕐</span> <strong style="color: #fff;">${reservation.time} Uhr</strong><br>
              <span style="color: #c9a961; font-size: 14px;">👥</span> <strong style="color: #fff;">${reservation.guests} ${reservation.guests === 1 ? 'Person' : 'Personen'}</strong>
            </p>
          </div>

          ${renderFeaturedDishes()}

          <div class="section">
            <h3>Gut zu wissen</h3>
            <ul style="line-height: 2; padding-left: 20px; color: #484848;">
              <li>Bitte kommen Sie pünktlich zum reservierten Zeitpunkt</li>
              <li>Bringen Sie Ihren Bestätigungscode mit</li>
              <li>Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen</li>
            </ul>
          </div>

          <div class="section" style="text-align: center; background: #fafaf8; padding: 24px; margin: 0 -32px;">
            <h3>So finden Sie uns</h3>
            <p style="margin-bottom: 16px;">Gumpendorfer Straße 65, 1060 Wien</p>
            <a href="https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien" class="button button-gold">Route planen</a>
          </div>

          <div class="section" style="text-align: center; margin-top: 32px;">
            <p style="color: #484848;">Müssen Sie Ihre Reservierung ändern?</p>
            <a href="mailto:info@healthybrunchclub.at?subject=Reservierung ${reservation.confirmationCode}" class="button button-outline">Kontakt aufnehmen</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Waitlist email
 */
function renderWaitlistEmail(reservation) {
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
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Warteliste</h1>
          <div class="gold-line"></div>
          <p style="margin: 0; opacity: 0.9;">Wir benachrichtigen Sie, sobald ein Platz frei wird</p>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-waitlist">Warteliste</span>
            <div class="code-display" style="background: #8b7355;">${reservation.confirmationCode}</div>
          </div>

          <div class="highlight-box" style="border-left-color: #8b7355;">
            <p style="margin: 0;">Leider sind zum gewünschten Zeitpunkt alle Plätze belegt. Wir haben Sie auf unsere Warteliste gesetzt und benachrichtigen Sie sofort per E-Mail, wenn ein Platz frei wird.</p>
          </div>

          <div class="section">
            <h3>Ihre Anfrage</h3>
            ${renderReservationDetails(reservation)}
          </div>

          <div class="section">
            <h3>Wie geht es weiter?</h3>
            <ul style="line-height: 2; padding-left: 20px; color: #484848;">
              <li>Sie erhalten sofort eine E-Mail, wenn ein Platz frei wird</li>
              <li>Ihre Position hängt vom Zeitpunkt Ihrer Anfrage ab</li>
              <li>Alternativ können Sie einen anderen Termin buchen</li>
            </ul>
          </div>

          ${renderFeaturedDishes()}

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
 * Waitlist promoted email (spot became available)
 */
function renderWaitlistPromotedEmail(reservation, options = {}) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Platz frei geworden!</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-confirmed">
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Platz frei geworden!</h1>
          <div class="gold-line"></div>
          <p style="margin: 0; opacity: 0.9;">Ihre Reservierung wurde bestätigt</p>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-confirmed">Bestätigt</span>
            <div class="code-display">${reservation.confirmationCode}</div>
          </div>

          <div class="highlight-box">
            <p style="margin: 0;"><strong>Tolle Neuigkeiten!</strong> Ein Platz ist frei geworden und Ihre Reservierung wurde von der Warteliste bestätigt.</p>
          </div>

          <div class="section">
            <h3>Ihre Reservierung</h3>
            ${renderReservationDetails(reservation)}
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="text-align: center; background: #fafaf8; padding: 24px; margin: 0 -32px;">
            <p style="margin-bottom: 8px;"><strong>Können Sie den Termin nicht wahrnehmen?</strong></p>
            <p style="font-size: 14px; color: #484848;">Bitte stornieren Sie rechtzeitig, damit andere Gäste nachrücken können.</p>
            <a href="mailto:info@healthybrunchclub.at?subject=Stornierung ${reservation.confirmationCode}" class="button button-outline">Stornieren</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Feedback request email (after visit)
 */
function renderFeedbackRequestEmail(reservation, options = {}) {
  const feedbackUrl = options.feedbackUrl || 'https://g.page/r/CQiDEMSRXhHbEBM/review';

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
          <div class="logo-text">Healthy Brunch Club</div>
          <h1>Danke für Ihren Besuch!</h1>
          <div class="gold-line"></div>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <p style="font-size: 48px; margin: 0 0 16px 0;">🥑</p>
          </div>

          <div class="section">
            <p>Liebe/r ${reservation.name.split(' ')[0]},</p>
            <p>vielen Dank, dass Sie uns im Healthy Brunch Club Wien besucht haben! Wir hoffen, Sie hatten eine wunderbare Zeit und es hat Ihnen geschmeckt.</p>
          </div>

          <div class="highlight-box">
            <p style="margin: 0;"><strong>Ihre Meinung ist uns wichtig!</strong><br>
            Eine kurze Bewertung hilft uns, noch besser zu werden – und anderen Gästen bei ihrer Entscheidung.</p>
          </div>

          <div class="section" style="text-align: center;">
            <a href="${feedbackUrl}" class="button button-gold">Bewertung abgeben</a>
          </div>

          <div class="section" style="text-align: center; background: #1a1a1a; padding: 32px; margin: 24px -32px;">
            <h3 style="color: #fff;">Kommen Sie wieder!</h3>
            <p style="color: #e8e8e8;">Als Dankeschön erhalten Sie bei Ihrem nächsten Besuch eine kleine Überraschung.</p>
            <div style="background: #2d2d2d; padding: 16px; margin: 16px auto; max-width: 200px;">
              <span style="font-family: 'Playfair Display', serif; font-size: 24px; color: #c9a961; letter-spacing: 4px;">DANKE10</span>
            </div>
            <p style="font-size: 12px; color: #888;">Erwähnen Sie diesen Code bei Ihrer nächsten Reservierung</p>
          </div>

          <div class="section" style="text-align: center;">
            <a href="https://healthybrunchclub.at/#reservation" class="button">Nächste Reservierung</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Admin cancellation notification
 */
function renderAdminCancellationEmail(reservation, options = {}) {
  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reservierung storniert</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="container">
        <div class="header header-cancelled">
          <div class="logo-text">Admin Benachrichtigung</div>
          <h1>Stornierung</h1>
          <div class="gold-line"></div>
        </div>
        <div class="content">
          <div class="section" style="text-align: center;">
            <span class="badge badge-cancelled">Storniert</span>
            <div class="code-display" style="background: #8b4049;">${reservation.confirmationCode}</div>
          </div>

          <div class="section">
            <h3>Stornierte Reservierung</h3>
            <div class="details">
              <div class="details-row">
                <span class="details-label">Datum</span>
                <span class="details-value">${DateTime.fromISO(reservation.date.split('T')[0]).toFormat('dd.MM.yyyy')}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Uhrzeit</span>
                <span class="details-value">${reservation.time} Uhr</span>
              </div>
              <div class="details-row">
                <span class="details-label">Personen</span>
                <span class="details-value">${reservation.guests}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Gast-Informationen</h3>
            <div class="details">
              <div class="details-row">
                <span class="details-label">Name</span>
                <span class="details-value">${reservation.name}</span>
              </div>
              <div class="details-row">
                <span class="details-label">E-Mail</span>
                <span class="details-value">${reservation.email}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Telefon</span>
                <span class="details-value">${reservation.phone}</span>
              </div>
              ${options.reason ? `
              <div class="details-row">
                <span class="details-label">Grund</span>
                <span class="details-value">${options.reason}</span>
              </div>
              ` : ''}
              ${options.cancelledBy ? `
              <div class="details-row">
                <span class="details-label">Storniert von</span>
                <span class="details-value">${options.cancelledBy}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="highlight-box" style="border-left-color: #c9a961;">
            <p style="margin: 0;"><strong>Hinweis:</strong> Der Platz ist nun wieder verfügbar. Prüfen Sie die Warteliste für mögliche Nachrücker.</p>
          </div>

          <div class="section" style="text-align: center;">
            <a href="https://healthybrunchclub.at/admin/reservations.html" class="button button-gold">Reservierungen verwalten</a>
          </div>
        </div>
        <div class="footer">
          <p style="font-size: 12px; color: #888;">Storniert am ${DateTime.now().setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm')} Uhr</p>
        </div>
      </div>
    </body>
  </html>`;
}

/**
 * ICS calendar file
 */
function renderIcs(reservation) {
  // Extract just the date part if it's a full ISO timestamp (e.g., "2026-01-29T00:00:00.000Z" -> "2026-01-29")
  const dateOnly = reservation.date.split('T')[0];
  const start = DateTime.fromISO(`${dateOnly}T${reservation.time}`, {
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
    'SUMMARY:Brunch im Healthy Brunch Club Wien',
    `DESCRIPTION:Reservierung für ${reservation.guests} Personen\\nBestätigungscode: ${reservation.confirmationCode}`,
    'LOCATION:Healthy Brunch Club Wien\\, Gumpendorfer Straße 65\\, 1060 Wien',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Generates plain text version of reservation details
 */
function renderPlainTextReservation(reservation) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  let text = `
Reservierungsdetails
--------------------
Datum: ${date}
Uhrzeit: ${reservation.time} Uhr
Personen: ${reservation.guests}
Name: ${reservation.name}`;

  if (reservation.specialRequests) {
    text += `\nWünsche: ${reservation.specialRequests}`;
  }

  return text;
}

/**
 * Plain text guest confirmation email
 */
function renderGuestEmailText(reservation) {
  return `Healthy Brunch Club Wien
========================

Ihre Reservierung ist bestätigt!

Bestätigungscode: ${reservation.confirmationCode}

${renderPlainTextReservation(reservation)}

Adresse: Gumpendorfer Straße 65, 1060 Wien
Google Maps: https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien

Wichtig: Bitte kommen Sie pünktlich. Bei Verspätungen über 15 Minuten kann Ihre Reservierung an wartende Gäste vergeben werden.

Wir freuen uns auf Ihren Besuch!

--
Healthy Brunch Club Wien
info@healthybrunchclub.at
Eat well. Feel better.`;
}

/**
 * Plain text admin notification email
 */
function renderAdminEmailText(reservation) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  return `Neue Reservierung
=================

Code: ${reservation.confirmationCode}
Status: ${translateStatus(reservation.status)}

Reservierungsdetails:
- Datum: ${date}
- Uhrzeit: ${reservation.time} Uhr
- Personen: ${reservation.guests}

Gast-Informationen:
- Name: ${reservation.name}
- E-Mail: ${reservation.email}
- Telefon: ${reservation.phone}${reservation.specialRequests ? `\n- Wünsche: ${reservation.specialRequests}` : ''}

Verwalten: https://healthybrunchclub.at/admin/reservations.html`;
}

/**
 * Plain text waitlist email
 */
function renderWaitlistEmailText(reservation) {
  return `Healthy Brunch Club Wien
========================

Sie sind auf der Warteliste

Bestätigungscode: ${reservation.confirmationCode}

${renderPlainTextReservation(reservation)}

Was passiert jetzt?
- Sie erhalten sofort eine E-Mail, wenn ein Platz frei wird
- Ihre Position hängt vom Zeitpunkt Ihrer Anfrage ab
- Alternativ können Sie einen anderen Termin buchen

Neue Reservierung: https://healthybrunchclub.at/#reservation

--
Healthy Brunch Club Wien
info@healthybrunchclub.at`;
}

/**
 * Plain text cancellation email
 */
function renderCancellationEmailText(reservation, options = {}) {
  let text = `Healthy Brunch Club Wien
========================

Ihre Reservierung wurde storniert

Code: ${reservation.confirmationCode}

${renderPlainTextReservation(reservation)}`;

  if (options.reason) {
    text += `\n\nStornierungsgrund: ${options.reason}`;
  }

  text += `

Wir würden uns freuen, Sie bald bei uns begrüßen zu dürfen!

Neue Reservierung: https://healthybrunchclub.at/#reservation

--
Healthy Brunch Club Wien
info@healthybrunchclub.at`;

  return text;
}

/**
 * Plain text reminder email
 */
function renderReminderEmailText(reservation) {
  // Extract just the date part if it's a full ISO timestamp
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly, { zone: reservation.timezone || 'Europe/Vienna' })
    .toFormat('EEEE, dd. MMMM yyyy', { locale: 'de' });

  return `Healthy Brunch Club Wien
========================

Bis morgen!

Ihre Reservierung:
- Datum: ${date}
- Uhrzeit: ${reservation.time} Uhr
- Personen: ${reservation.guests}
- Code: ${reservation.confirmationCode}

Gut zu wissen:
- Bitte kommen Sie pünktlich zum reservierten Zeitpunkt
- Bringen Sie Ihren Bestätigungscode mit
- Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen

Adresse: Gumpendorfer Straße 65, 1060 Wien
Route planen: https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien

Wir freuen uns auf Sie!

--
Healthy Brunch Club Wien
info@healthybrunchclub.at`;
}

/**
 * Plain text waitlist promoted email
 */
function renderWaitlistPromotedEmailText(reservation) {
  return `Healthy Brunch Club Wien
========================

Platz frei geworden - Ihre Reservierung ist bestätigt!

Bestätigungscode: ${reservation.confirmationCode}

${renderPlainTextReservation(reservation)}

Tolle Neuigkeiten! Ein Platz ist frei geworden und Ihre Reservierung wurde von der Warteliste bestätigt.

Adresse: Gumpendorfer Straße 65, 1060 Wien
Route planen: https://maps.google.com/?q=Gumpendorfer+Straße+65+1060+Wien

Können Sie den Termin nicht wahrnehmen?
Bitte stornieren Sie rechtzeitig, damit andere Gäste nachrücken können.
Kontakt: info@healthybrunchclub.at

--
Healthy Brunch Club Wien
info@healthybrunchclub.at
Eat well. Feel better.`;
}

/**
 * Plain text feedback request email
 */
function renderFeedbackRequestEmailText(reservation, options = {}) {
  const feedbackUrl = options.feedbackUrl || 'https://g.page/r/CQiDEMSRXhHbEBM/review';

  return `Healthy Brunch Club Wien
========================

Danke für Ihren Besuch!

Liebe/r ${reservation.name.split(' ')[0]},

vielen Dank, dass Sie uns im Healthy Brunch Club Wien besucht haben! Wir hoffen, Sie hatten eine wunderbare Zeit und es hat Ihnen geschmeckt.

Ihre Meinung ist uns wichtig!
Eine kurze Bewertung hilft uns, noch besser zu werden – und anderen Gästen bei ihrer Entscheidung.

Bewertung abgeben: ${feedbackUrl}

Kommen Sie wieder!
Als Dankeschön erhalten Sie bei Ihrem nächsten Besuch eine kleine Überraschung.
Code: DANKE10
(Erwähnen Sie diesen Code bei Ihrer nächsten Reservierung)

Neue Reservierung: https://healthybrunchclub.at/#reservation

--
Healthy Brunch Club Wien
info@healthybrunchclub.at
Eat well. Feel better.`;
}

module.exports = {
  // Guest templates
  renderGuestEmail,
  renderCancellationEmail,
  renderReminderEmail,
  renderWaitlistEmail,
  renderWaitlistPromotedEmail,
  renderFeedbackRequestEmail,
  // Admin templates
  renderAdminEmail,
  renderAdminCancellationEmail,
  // Plain text templates
  renderGuestEmailText,
  renderAdminEmailText,
  renderWaitlistEmailText,
  renderCancellationEmailText,
  renderReminderEmailText,
  renderWaitlistPromotedEmailText,
  renderFeedbackRequestEmailText,
  // Utilities
  renderIcs,
  translateStatus,
  // Helpers (exported for potential reuse)
  getBaseStyles,
  renderFooter,
  renderReservationDetails,
  renderFeaturedDishes,
  FEATURED_DISHES
};
