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
    <div class="footer" style="text-align: center; padding: 32px; background: #fafaf8; color: #484848; font-size: 13px;">
      <div class="footer-brand" style="font-family: 'Playfair Display', Georgia, serif; font-size: 14px; color: #1a1a1a; margin-bottom: 8px;">Healthy Brunch Club Wien</div>
      <p style="margin: 8px 0; font-family: 'Montserrat', Arial, sans-serif;">Neubaugasse 15 · 1070 Wien</p>
      <p style="margin: 8px 0; color: #c9a961; font-family: 'Montserrat', Arial, sans-serif;">hello@healthybrunchclub.at</p>
      <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
      <p style="font-size: 11px; color: #888; margin-top: 16px; font-family: 'Montserrat', Arial, sans-serif;">
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
    <div class="section" style="margin-bottom: 32px;">
      <h3 style="text-align: center; font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Was Sie bei uns erwartet</h3>
      <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
      <div style="margin-top: 24px;">
        ${FEATURED_DISHES.map(dish => `
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px; background: #fafaf8; border-left: 3px solid #c9a961;">
            <tr>
              <td style="padding: 16px; width: 50px; font-size: 32px; vertical-align: middle;">${dish.icon}</td>
              <td style="padding: 16px 16px 16px 0; vertical-align: middle;">
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: #1a1a1a; margin-bottom: 4px;">${dish.name}</div>
                <div style="font-size: 13px; color: #484848; font-family: 'Montserrat', Arial, sans-serif;">${dish.description}</div>
              </td>
            </tr>
          </table>
        `).join('')}
      </div>
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://healthybrunchclub.at/menu" style="display: inline-block; padding: 16px 32px; background: transparent; border: 1px solid #1a1a1a; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Menü ansehen</a>
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

  const rowStyle = 'padding: 12px 0; border-bottom: 1px solid #f5f0e8;';
  const lastRowStyle = 'padding: 12px 0;';
  const labelStyle = 'color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-family: \'Montserrat\', Arial, sans-serif;';
  const valueStyle = 'color: #1a1a1a; font-weight: 500; font-family: \'Montserrat\', Arial, sans-serif; text-align: right;';

  const rows = [
    { label: 'Datum', value: date },
    { label: 'Uhrzeit', value: `${reservation.time} Uhr` },
    { label: 'Personen', value: `${reservation.guests} ${reservation.guests === 1 ? 'Gast' : 'Gäste'}` },
    { label: 'Name', value: reservation.name }
  ];

  if (reservation.specialRequests) {
    rows.push({ label: 'Wünsche', value: reservation.specialRequests });
  }

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e8e8e8; padding: 24px;">
      ${rows.map((row, index) => `
        <tr>
          <td style="${index < rows.length - 1 ? rowStyle : lastRowStyle} ${labelStyle}">${row.label}</td>
          <td style="${index < rows.length - 1 ? rowStyle : lastRowStyle} ${valueStyle}">${row.value}</td>
        </tr>
      `).join('')}
    </table>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-confirmed" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Reservierung bestätigt</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
          <p style="margin: 0; opacity: 0.9; font-family: 'Montserrat', Arial, sans-serif;">Wir freuen uns auf Ihren Besuch</p>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-confirmed" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #f5f0e8; color: #1e4a3c; font-family: 'Montserrat', Arial, sans-serif;">Bestätigt</span>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Ihre Reservierung</h3>
            <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 12px 0 20px 0;"></div>
            ${renderReservationDetails(reservation)}
          </div>

          ${renderFeaturedDishes()}

          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #c9a961; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;"><strong>Gut zu wissen:</strong> Bitte kommen Sie pünktlich. Bei Verspätungen über 15 Minuten kann Ihre Reservierung an wartende Gäste vergeben werden.</p>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">So finden Sie uns</h3>
            <p style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7; margin: 0 0 16px 0;">Neubaugasse 15, 1070 Wien</p>
            <a href="https://maps.google.com/?q=Neubaugasse+15+1070+Wien" style="display: inline-block; padding: 16px 32px; background: transparent; border: 1px solid #1a1a1a; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Route planen</a>
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

  const rowStyle = 'padding: 12px 0; border-bottom: 1px solid #f5f0e8;';
  const lastRowStyle = 'padding: 12px 0;';
  const labelStyle = 'color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-family: \'Montserrat\', Arial, sans-serif;';
  const valueStyle = 'color: #1a1a1a; font-weight: 500; font-family: \'Montserrat\', Arial, sans-serif; text-align: right;';

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Neue Reservierung</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-confirmed" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Admin Benachrichtigung</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Neue Reservierung</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-confirmed" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #f5f0e8; color: #1e4a3c; font-family: 'Montserrat', Arial, sans-serif;">${translateStatus(reservation.status)}</span>
            <div class="code-display" style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; letter-spacing: 4px; color: #c9a961; text-align: center; padding: 24px; background: #1a1a1a; margin: 16px 0;">${reservation.confirmationCode}</div>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Reservierungsdetails</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e8e8e8; padding: 24px;">
              <tr>
                <td style="${rowStyle} ${labelStyle}">Datum</td>
                <td style="${rowStyle} ${valueStyle}">${date}</td>
              </tr>
              <tr>
                <td style="${rowStyle} ${labelStyle}">Uhrzeit</td>
                <td style="${rowStyle} ${valueStyle}">${reservation.time} Uhr</td>
              </tr>
              <tr>
                <td style="${lastRowStyle} ${labelStyle}">Personen</td>
                <td style="${lastRowStyle} ${valueStyle}">${reservation.guests}</td>
              </tr>
            </table>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Gast-Informationen</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e8e8e8; padding: 24px;">
              <tr>
                <td style="${rowStyle} ${labelStyle}">Name</td>
                <td style="${rowStyle} ${valueStyle}">${reservation.name}</td>
              </tr>
              <tr>
                <td style="${rowStyle} ${labelStyle}">E-Mail</td>
                <td style="${rowStyle} ${valueStyle}"><a href="mailto:${reservation.email}" style="color: #c9a961;">${reservation.email}</a></td>
              </tr>
              <tr>
                <td style="${reservation.specialRequests ? rowStyle : lastRowStyle} ${labelStyle}">Telefon</td>
                <td style="${reservation.specialRequests ? rowStyle : lastRowStyle} ${valueStyle}"><a href="tel:${reservation.phone}" style="color: #c9a961;">${reservation.phone}</a></td>
              </tr>
              ${reservation.specialRequests ? `
              <tr>
                <td style="${lastRowStyle} ${labelStyle}">Wünsche</td>
                <td style="${lastRowStyle} ${valueStyle}">${reservation.specialRequests}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <a href="https://healthybrunchclub.at/admin-dashboard.html" style="display: inline-block; padding: 16px 32px; background: #c9a961; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Reservierungen verwalten</a>
          </div>
        </div>
        <div class="footer" style="text-align: center; padding: 32px; background: #fafaf8; color: #484848; font-size: 13px;">
          <p style="font-size: 12px; color: #888; font-family: 'Montserrat', Arial, sans-serif;">Diese E-Mail wurde automatisch generiert am ${DateTime.now().setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm')} Uhr</p>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-cancelled" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #8b4049 0%, #6b2d35 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Reservierung storniert</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-cancelled" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #fdf2f2; color: #8b4049; font-family: 'Montserrat', Arial, sans-serif;">Storniert</span>
            <div class="code-display" style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; letter-spacing: 4px; color: #c9a961; text-align: center; padding: 24px; background: #8b4049; margin: 16px 0;">${reservation.confirmationCode}</div>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Stornierte Reservierung</h3>
            ${renderReservationDetails(reservation)}
          </div>

          ${options.reason ? `
          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #8b4049; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;"><strong>Stornierungsgrund:</strong><br>${options.reason}</p>
          </div>
          ` : ''}

          <div class="section" style="margin-bottom: 32px;">
            <p style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7; margin: 0 0 16px 0;">Schade, dass Sie uns diesmal nicht besuchen können. Wir würden uns freuen, Sie bald bei uns begrüßen zu dürfen!</p>
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <a href="https://healthybrunchclub.at/#reservation" style="display: inline-block; padding: 16px 32px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Neue Reservierung</a>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-reminder" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #1e4a3c 0%, #2d5a4a 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Bis morgen!</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
          <p style="margin: 0; opacity: 0.9; font-family: 'Montserrat', Arial, sans-serif;">Wir freuen uns auf Ihren Besuch</p>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-reminder" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #f0f5f3; color: #1e4a3c; font-family: 'Montserrat', Arial, sans-serif;">Morgen</span>
          </div>

          <div class="highlight-box" style="background: #1a1a1a; border-left: 3px solid #c9a961; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; color: #fff; text-align: center; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;">
              <span style="color: #c9a961; font-size: 14px;">📅</span> <strong style="color: #fff;">${date}</strong><br>
              <span style="color: #c9a961; font-size: 14px;">🕐</span> <strong style="color: #fff;">${reservation.time} Uhr</strong><br>
              <span style="color: #c9a961; font-size: 14px;">👥</span> <strong style="color: #fff;">${reservation.guests} ${reservation.guests === 1 ? 'Person' : 'Personen'}</strong>
            </p>
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Gut zu wissen</h3>
            <ul style="line-height: 2; padding-left: 20px; color: #484848; font-family: 'Montserrat', Arial, sans-serif;">
              <li>Bitte kommen Sie pünktlich zum reservierten Zeitpunkt</li>
              <li>Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen</li>
            </ul>
          </div>

          <div class="section" style="text-align: center; background: #fafaf8; padding: 24px; margin: 0 -32px 32px -32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">So finden Sie uns</h3>
            <p style="margin-bottom: 16px; font-family: 'Montserrat', Arial, sans-serif;">Neubaugasse 15, 1070 Wien</p>
            <a href="https://maps.google.com/?q=Neubaugasse+15+1070+Wien" style="display: inline-block; padding: 16px 32px; background: #c9a961; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Route planen</a>
          </div>

          <div class="section" style="text-align: center; margin-top: 32px;">
            <p style="color: #484848; font-family: 'Montserrat', Arial, sans-serif;">Müssen Sie Ihre Reservierung ändern?</p>
            <a href="mailto:hello@healthybrunchclub.at?subject=Reservierung ${reservation.confirmationCode}" style="display: inline-block; padding: 16px 32px; background: transparent; border: 1px solid #1a1a1a; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Kontakt aufnehmen</a>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-waitlist" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #8b7355 0%, #6b5a45 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Warteliste</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
          <p style="margin: 0; opacity: 0.9; font-family: 'Montserrat', Arial, sans-serif;">Wir benachrichtigen Sie, sobald ein Platz frei wird</p>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-waitlist" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #faf6f1; color: #8b7355; font-family: 'Montserrat', Arial, sans-serif;">Warteliste</span>
          </div>

          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #8b7355; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;">Leider sind zum gewünschten Zeitpunkt alle Plätze belegt. Wir haben Sie auf unsere Warteliste gesetzt und benachrichtigen Sie sofort per E-Mail, wenn ein Platz frei wird.</p>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Ihre Anfrage</h3>
            ${renderReservationDetails(reservation)}
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Wie geht es weiter?</h3>
            <ul style="line-height: 2; padding-left: 20px; color: #484848; font-family: 'Montserrat', Arial, sans-serif;">
              <li>Sie erhalten sofort eine E-Mail, wenn ein Platz frei wird</li>
              <li>Ihre Position hängt vom Zeitpunkt Ihrer Anfrage ab</li>
              <li>Alternativ können Sie einen anderen Termin buchen</li>
            </ul>
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <p style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7; margin: 0 0 16px 0;">Möchten Sie einen anderen Termin wählen?</p>
            <a href="https://healthybrunchclub.at/#reservation" style="display: inline-block; padding: 16px 32px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Andere Zeit buchen</a>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-confirmed" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Platz frei geworden!</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
          <p style="margin: 0; opacity: 0.9; font-family: 'Montserrat', Arial, sans-serif;">Ihre Reservierung wurde bestätigt</p>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-confirmed" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #f5f0e8; color: #1e4a3c; font-family: 'Montserrat', Arial, sans-serif;">Bestätigt</span>
          </div>

          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #c9a961; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;"><strong>Tolle Neuigkeiten!</strong> Ein Platz ist frei geworden und Ihre Reservierung wurde von der Warteliste bestätigt.</p>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Ihre Reservierung</h3>
            ${renderReservationDetails(reservation)}
          </div>

          ${renderFeaturedDishes()}

          <div class="section" style="text-align: center; background: #fafaf8; padding: 24px; margin: 0 -32px;">
            <p style="margin-bottom: 8px; font-family: 'Montserrat', Arial, sans-serif;"><strong>Können Sie den Termin nicht wahrnehmen?</strong></p>
            <p style="font-size: 14px; color: #484848; font-family: 'Montserrat', Arial, sans-serif;">Bitte stornieren Sie rechtzeitig, damit andere Gäste nachrücken können.</p>
            <a href="mailto:hello@healthybrunchclub.at?subject=Stornierung" style="display: inline-block; padding: 16px 32px; background: transparent; border: 1px solid #1a1a1a; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Stornieren</a>
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
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-feedback" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #7a8b68 0%, #5a6b48 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Healthy Brunch Club</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Danke für Ihren Besuch!</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <p style="font-size: 48px; margin: 0 0 16px 0;">🥑</p>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <p style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7; margin: 0 0 16px 0;">Liebe/r ${reservation.name.split(' ')[0]},</p>
            <p style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7; margin: 0 0 16px 0;">vielen Dank, dass Sie uns im Healthy Brunch Club Wien besucht haben! Wir hoffen, Sie hatten eine wunderbare Zeit und es hat Ihnen geschmeckt.</p>
          </div>

          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #c9a961; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;"><strong>Ihre Meinung ist uns wichtig!</strong><br>
            Eine kurze Bewertung hilft uns, noch besser zu werden – und anderen Gästen bei ihrer Entscheidung.</p>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <a href="${feedbackUrl}" style="display: inline-block; padding: 16px 32px; background: #c9a961; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Bewertung abgeben</a>
          </div>

          <div class="section" style="text-align: center; background: #1a1a1a; padding: 32px; margin: 24px -32px;">
            <h3 style="color: #fff; font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; font-size: 18px; font-weight: 400;">Kommen Sie wieder!</h3>
            <p style="color: #e8e8e8; font-family: 'Montserrat', Arial, sans-serif;">Als Dankeschön erhalten Sie bei Ihrem nächsten Besuch eine kleine Überraschung.</p>
            <div style="background: #2d2d2d; padding: 16px; margin: 16px auto; max-width: 200px;">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #c9a961; letter-spacing: 4px;">DANKE10</span>
            </div>
            <p style="font-size: 12px; color: #888; font-family: 'Montserrat', Arial, sans-serif;">Erwähnen Sie diesen Code bei Ihrer nächsten Reservierung</p>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <a href="https://healthybrunchclub.at/#reservation" style="display: inline-block; padding: 16px 32px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Nächste Reservierung</a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </body>
  </html>`;
}

/**
 * Plain text admin cancellation email
 */
function renderAdminCancellationEmailText(reservation, options = {}) {
  const { DateTime } = require('luxon');
  const dateOnly = reservation.date.split('T')[0];
  const date = DateTime.fromISO(dateOnly).toFormat('dd.MM.yyyy');

  let text = `Reservierung storniert
======================

Code: ${reservation.confirmationCode}

Stornierte Reservierung:
- Datum: ${date}
- Uhrzeit: ${reservation.time} Uhr
- Personen: ${reservation.guests}

Gast-Informationen:
- Name: ${reservation.name}
- E-Mail: ${reservation.email}
- Telefon: ${reservation.phone}`;

  if (options.reason) {
    text += `\n- Stornierungsgrund: ${options.reason}`;
  }
  if (options.cancelledBy) {
    text += `\n- Storniert von: ${options.cancelledBy}`;
  }

  text += `

Hinweis: Der Platz ist nun wieder verfügbar. Prüfen Sie die Warteliste für mögliche Nachrücker.

Verwalten: https://healthybrunchclub.at/admin-dashboard.html`;

  return text;
}

/**
 * Admin cancellation notification
 */
function renderAdminCancellationEmail(reservation, options = {}) {
  const rowStyle = 'padding: 12px 0; border-bottom: 1px solid #f5f0e8;';
  const lastRowStyle = 'padding: 12px 0;';
  const labelStyle = 'color: #484848; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-family: \'Montserrat\', Arial, sans-serif;';
  const valueStyle = 'color: #1a1a1a; font-weight: 500; font-family: \'Montserrat\', Arial, sans-serif; text-align: right;';

  return `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reservierung storniert</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body style="font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; background-color: #f5f0e8; color: #2d2d2d; margin: 0; padding: 20px; line-height: 1.6;">
      <div class="container" style="max-width: 640px; margin: 0 auto; background: #ffffff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div class="header header-cancelled" style="padding: 48px 32px; text-align: center; color: #fff; background: linear-gradient(135deg, #8b4049 0%, #6b2d35 100%);">
          <div class="logo-text" style="font-family: 'Playfair Display', Georgia, serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #c9a961; margin-bottom: 24px;">Admin Benachrichtigung</div>
          <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px 0; font-size: 32px; font-weight: 400; letter-spacing: -0.5px; color: #ffffff;">Stornierung</h1>
          <div class="gold-line" style="width: 60px; height: 1px; background: #c9a961; margin: 16px auto;"></div>
        </div>
        <div class="content" style="padding: 40px 32px;">
          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <span class="badge badge-cancelled" style="display: inline-block; padding: 8px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; background: #fdf2f2; color: #8b4049; font-family: 'Montserrat', Arial, sans-serif;">Storniert</span>
            <div class="code-display" style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; letter-spacing: 4px; color: #c9a961; text-align: center; padding: 24px; background: #8b4049; margin: 16px 0;">${reservation.confirmationCode}</div>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Stornierte Reservierung</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e8e8e8; padding: 24px;">
              <tr>
                <td style="${rowStyle} ${labelStyle}">Datum</td>
                <td style="${rowStyle} ${valueStyle}">${DateTime.fromISO(reservation.date.split('T')[0]).toFormat('dd.MM.yyyy')}</td>
              </tr>
              <tr>
                <td style="${rowStyle} ${labelStyle}">Uhrzeit</td>
                <td style="${rowStyle} ${valueStyle}">${reservation.time} Uhr</td>
              </tr>
              <tr>
                <td style="${lastRowStyle} ${labelStyle}">Personen</td>
                <td style="${lastRowStyle} ${valueStyle}">${reservation.guests}</td>
              </tr>
            </table>
          </div>

          <div class="section" style="margin-bottom: 32px;">
            <h3 style="font-family: 'Playfair Display', Georgia, serif; margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 400;">Gast-Informationen</h3>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e8e8e8; padding: 24px;">
              <tr>
                <td style="${rowStyle} ${labelStyle}">Name</td>
                <td style="${rowStyle} ${valueStyle}">${reservation.name}</td>
              </tr>
              <tr>
                <td style="${rowStyle} ${labelStyle}">E-Mail</td>
                <td style="${rowStyle} ${valueStyle}">${reservation.email}</td>
              </tr>
              <tr>
                <td style="${options.reason || options.cancelledBy ? rowStyle : lastRowStyle} ${labelStyle}">Telefon</td>
                <td style="${options.reason || options.cancelledBy ? rowStyle : lastRowStyle} ${valueStyle}">${reservation.phone}</td>
              </tr>
              ${options.reason ? `
              <tr>
                <td style="${options.cancelledBy ? rowStyle : lastRowStyle} ${labelStyle}">Grund</td>
                <td style="${options.cancelledBy ? rowStyle : lastRowStyle} ${valueStyle}">${options.reason}</td>
              </tr>
              ` : ''}
              ${options.cancelledBy ? `
              <tr>
                <td style="${lastRowStyle} ${labelStyle}">Storniert von</td>
                <td style="${lastRowStyle} ${valueStyle}">${options.cancelledBy}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div class="highlight-box" style="background: #fafaf8; border-left: 3px solid #c9a961; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0; font-family: 'Montserrat', Arial, sans-serif; line-height: 1.7;"><strong>Hinweis:</strong> Der Platz ist nun wieder verfügbar. Prüfen Sie die Warteliste für mögliche Nachrücker.</p>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 32px;">
            <a href="https://healthybrunchclub.at/admin-dashboard.html" style="display: inline-block; padding: 16px 32px; background: #c9a961; color: #1a1a1a; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500; font-family: 'Montserrat', Arial, sans-serif;">Reservierungen verwalten</a>
          </div>
        </div>
        <div class="footer" style="text-align: center; padding: 32px; background: #fafaf8; color: #484848; font-size: 13px;">
          <p style="font-size: 12px; color: #888; font-family: 'Montserrat', Arial, sans-serif;">Storniert am ${DateTime.now().setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm')} Uhr</p>
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
    'LOCATION:Healthy Brunch Club Wien\\, Neubaugasse 15\\, 1070 Wien',
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

${renderPlainTextReservation(reservation)}

Adresse: Neubaugasse 15, 1070 Wien
Google Maps: https://maps.google.com/?q=Neubaugasse+15+1070+Wien

Wichtig: Bitte kommen Sie pünktlich. Bei Verspätungen über 15 Minuten kann Ihre Reservierung an wartende Gäste vergeben werden.

Wir freuen uns auf Ihren Besuch!

--
Healthy Brunch Club Wien
hello@healthybrunchclub.at
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

Verwalten: https://healthybrunchclub.at/admin-dashboard.html`;
}

/**
 * Plain text waitlist email
 */
function renderWaitlistEmailText(reservation) {
  return `Healthy Brunch Club Wien
========================

Sie sind auf der Warteliste

${renderPlainTextReservation(reservation)}

Was passiert jetzt?
- Sie erhalten sofort eine E-Mail, wenn ein Platz frei wird
- Ihre Position hängt vom Zeitpunkt Ihrer Anfrage ab
- Alternativ können Sie einen anderen Termin buchen

Neue Reservierung: https://healthybrunchclub.at/#reservation

--
Healthy Brunch Club Wien
hello@healthybrunchclub.at`;
}

/**
 * Plain text cancellation email
 */
function renderCancellationEmailText(reservation, options = {}) {
  let text = `Healthy Brunch Club Wien
========================

Ihre Reservierung wurde storniert

${renderPlainTextReservation(reservation)}`;

  if (options.reason) {
    text += `\n\nStornierungsgrund: ${options.reason}`;
  }

  text += `

Wir würden uns freuen, Sie bald bei uns begrüßen zu dürfen!

Neue Reservierung: https://healthybrunchclub.at/#reservation

--
Healthy Brunch Club Wien
hello@healthybrunchclub.at`;

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

Gut zu wissen:
- Bitte kommen Sie pünktlich zum reservierten Zeitpunkt
- Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen

Adresse: Neubaugasse 15, 1070 Wien
Route planen: https://maps.google.com/?q=Neubaugasse+15+1070+Wien

Wir freuen uns auf Sie!

--
Healthy Brunch Club Wien
hello@healthybrunchclub.at`;
}

/**
 * Plain text waitlist promoted email
 */
function renderWaitlistPromotedEmailText(reservation) {
  return `Healthy Brunch Club Wien
========================

Platz frei geworden - Ihre Reservierung ist bestätigt!

${renderPlainTextReservation(reservation)}

Tolle Neuigkeiten! Ein Platz ist frei geworden und Ihre Reservierung wurde von der Warteliste bestätigt.

Adresse: Neubaugasse 15, 1070 Wien
Route planen: https://maps.google.com/?q=Neubaugasse+15+1070+Wien

Können Sie den Termin nicht wahrnehmen?
Bitte stornieren Sie rechtzeitig, damit andere Gäste nachrücken können.
Kontakt: hello@healthybrunchclub.at

--
Healthy Brunch Club Wien
hello@healthybrunchclub.at
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
hello@healthybrunchclub.at
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
  renderAdminCancellationEmailText,
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
