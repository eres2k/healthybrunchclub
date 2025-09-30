const sgMail = require('@sendgrid/mail');
const QRCode = require('qrcode');
const ics = require('ics');
const { formatDateAustrian } = require('./reservation-utils');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Generate QR code for confirmation
 */
async function generateQRCode(confirmationCode) {
  try {
    const url = `https://healthybrunchclub.at/reservation/${confirmationCode}`;
    return await QRCode.toDataURL(url);
  } catch (error) {
    console.error('QR generation failed:', error);
    return null;
  }
}

/**
 * Generate ICS calendar attachment
 */
function generateICS(reservation) {
  const [year, month, day] = reservation.date.split('-').map(Number);
  const [hour, minute] = reservation.time.split(':').map(Number);
  
  const event = {
    start: [year, month, day, hour, minute],
    duration: { hours: 1, minutes: 30 },
    title: 'Reservierung - Healthy Brunch Club Wien',
    description: `Reservierung für ${reservation.guests} Personen\nBestätigungscode: ${reservation.confirmationCode}`,
    location: 'Healthy Brunch Club Wien, Mariahilferstraße 123, 1060 Wien',
    status: reservation.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    organizer: { name: 'Healthy Brunch Club', email: 'info@healthybrunchclub.at' },
    attendees: [{ name: reservation.name, email: reservation.email }]
  };
  
  const { value, error } = ics.createEvent(event);
  
  if (error) {
    console.error('ICS generation failed:', error);
    return null;
  }
  
  return Buffer.from(value).toString('base64');
}

/**
 * Generate email HTML template
 */
async function generateEmailHTML(reservation, isAdmin = false) {
  const qrCode = reservation.status !== 'cancelled'
    ? await generateQRCode(reservation.confirmationCode)
    : null;
  const dateFormatted = formatDateAustrian(reservation.date);
  
  let statusBadge = '<span style="background:#4caf50; color:white; padding:4px 12px; border-radius:4px;">BESTÄTIGT</span>';
  if (reservation.status === 'waitlist') {
    statusBadge = '<span style="background:#ff9800; color:white; padding:4px 12px; border-radius:4px;">WARTELISTE</span>';
  } else if (reservation.status === 'cancelled') {
    statusBadge = '<span style="background:#f44336; color:white; padding:4px 12px; border-radius:4px;">STORNIERT</span>';
  }
    
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f5f0e8; margin:0; padding:40px 20px;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #1E4A3C 0%, #8B9474 100%); padding:40px 30px; text-align:center;">
      <h1 style="margin:0; color:white; font-size:28px; font-weight:300; letter-spacing:2px;">
        HEALTHY BRUNCH CLUB
      </h1>
      <p style="margin:10px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">
        ${isAdmin ? 'NEUE RESERVIERUNG' : reservation.status === 'cancelled' ? 'RESERVIERUNG STORNIERT' : 'RESERVIERUNGSBESTÄTIGUNG'}
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px 30px;">
      ${statusBadge}
      
      <p style="color:#666; font-size:16px; line-height:1.6; margin:20px 0;">
        ${isAdmin 
          ? `Eine ${reservation.status === 'cancelled' ? 'Reservierung wurde storniert' : 'neue Reservierung wurde vorgenommen'}:` 
          : reservation.status === 'cancelled'
            ? `Liebe/r ${reservation.name}, Ihre Reservierung wurde erfolgreich storniert.`
            : `Liebe/r ${reservation.name}, vielen Dank für Ihre Reservierung!`
        }
      </p>
      
      <!-- Reservation Details -->
      <div style="background:#f9f9f9; border-radius:8px; padding:24px; margin:30px 0;">
        <h2 style="margin:0 0 20px; color:#1E4A3C; font-size:18px; border-bottom:2px solid #e0e0e0; padding-bottom:10px;">
          Reservierungsdetails
        </h2>
        
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0; color:#666; width:40%;">📅 Datum:</td>
            <td style="padding:10px 0; color:#333; font-weight:600;">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#666;">🕐 Uhrzeit:</td>
            <td style="padding:10px 0; color:#333; font-weight:600;">${reservation.time} Uhr</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#666;">👥 Personen:</td>
            <td style="padding:10px 0; color:#333; font-weight:600;">${reservation.guests} ${reservation.guests === 1 ? 'Person' : 'Personen'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#666;">🎫 Bestätigungscode:</td>
            <td style="padding:10px 0; color:#1E4A3C; font-weight:600; font-size:18px;">${reservation.confirmationCode}</td>
          </tr>
        </table>
        
        ${reservation.specialRequests ? `
        <div style="margin-top:20px; padding-top:20px; border-top:1px solid #e0e0e0;">
          <p style="color:#666; margin:0 0 8px;">Besondere Wünsche:</p>
          <p style="color:#333; margin:0; font-style:italic;">${reservation.specialRequests}</p>
        </div>
        ` : ''}
      </div>
      
      ${isAdmin ? `
      <!-- Admin Contact Info -->
      <div style="background:#fff3cd; border-radius:8px; padding:20px; margin:20px 0;">
        <h3 style="margin:0 0 10px; color:#856404; font-size:16px;">Kontaktinformationen</h3>
        <p style="margin:5px 0; color:#856404;">
          📧 E-Mail: <a href="mailto:${reservation.email}" style="color:#856404;">${reservation.email}</a><br>
          📱 Telefon: <a href="tel:${reservation.phone}" style="color:#856404;">${reservation.phone}</a>
        </p>
      </div>
      ` : ''}
      
      ${!isAdmin && qrCode ? `
      <!-- QR Code -->
      <div style="text-align:center; margin:30px 0;">
        <img src="${qrCode}" alt="QR Code" style="width:200px; height:200px;">
        <p style="color:#666; font-size:12px; margin:10px 0;">
          Zeigen Sie diesen QR-Code bei Ihrer Ankunft vor
        </p>
      </div>
      ` : ''}
      
      ${!isAdmin && reservation.status !== 'cancelled' ? `
      <!-- Info Box -->
      <div style="background:#e3f2fd; border-left:4px solid #2196f3; padding:20px; margin:30px 0;">
        <h3 style="margin:0 0 10px; color:#1565c0; font-size:16px;">Wichtige Informationen</h3>
        <ul style="margin:0; padding-left:20px; color:#424242; line-height:1.8;">
          <li>Bitte erscheinen Sie pünktlich zu Ihrer Reservierung</li>
          <li>Bei Verspätungen über 15 Minuten verfällt die Reservierung</li>
          <li>Stornierungen sind bis 24 Stunden vorher möglich</li>
          <li>Für Gruppen ab 8 Personen gelten besondere Bedingungen</li>
        </ul>
      </div>
      ` : ''}
      
      <!-- Footer -->
      <div style="text-align:center; margin-top:40px; padding-top:30px; border-top:1px solid #e0e0e0;">
        <p style="color:#666; font-size:14px; margin:0 0 10px;">
          ${!isAdmin ? (reservation.status === 'cancelled' ? 'Wir hoffen, Sie bald wieder bei uns begrüßen zu dürfen.' : 'Wir freuen uns auf Ihren Besuch!') : 'Bitte im System bestätigen'}
        </p>
        
        <div style="margin:20px 0;">
          <a href="https://healthybrunchclub.at" style="color:#1E4A3C; text-decoration:none; margin:0 10px;">Website</a>
          <span style="color:#ccc;">|</span>
          <a href="tel:+4312345678" style="color:#1E4A3C; text-decoration:none; margin:0 10px;">+43 1 234 5678</a>
          <span style="color:#ccc;">|</span>
          <a href="mailto:info@healthybrunchclub.at" style="color:#1E4A3C; text-decoration:none; margin:0 10px;">E-Mail</a>
        </div>
        
        <p style="color:#999; font-size:12px; margin:20px 0 0;">
          Mariahilferstraße 123, 1060 Wien<br>
          Öffnungszeiten: Täglich 9:00 - 21:00 Uhr
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send reservation emails
 */
async function sendReservationEmails(reservation) {
  const attachments = [];
  
  // Generate ICS attachment
  const icsContent = generateICS(reservation);
  if (icsContent) {
    attachments.push({
      content: icsContent,
      filename: `reservation-${reservation.confirmationCode}.ics`,
      type: 'text/calendar',
      disposition: 'attachment'
    });
  }
  
  // Customer email
  const customerHTML = await generateEmailHTML(reservation, false);
  const customerEmail = {
    to: reservation.email,
    from: process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
    subject: reservation.status === 'waitlist' 
      ? '🕐 Warteliste - Healthy Brunch Club Wien'
      : reservation.status === 'cancelled'
        ? '❌ Reservierung storniert - Healthy Brunch Club Wien'
        : '✅ Reservierungsbestätigung - Healthy Brunch Club Wien',
    html: customerHTML,
    attachments
  };
  
  // Admin email
  const adminHTML = await generateEmailHTML(reservation, true);
  const adminEmail = {
    to: process.env.RESTAURANT_EMAIL || 'info@healthybrunchclub.at',
    from: process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
    subject: `${reservation.status === 'cancelled' ? '❌ Stornierung' : '🔔 Neue Reservierung'} - ${formatDateAustrian(reservation.date)} ${reservation.time} - ${reservation.guests} Personen`,
    html: adminHTML,
    replyTo: reservation.email
  };
  
  // Send emails
  if (process.env.SENDGRID_API_KEY) {
    await Promise.all([
      sgMail.send(customerEmail),
      sgMail.send(adminEmail)
    ]);
  } else {
    console.log('Email would be sent (dev mode):', { 
      customer: customerEmail.to, 
      admin: adminEmail.to,
      subjectCustomer: customerEmail.subject,
      subjectAdmin: adminEmail.subject
    });
  }
  
  return { success: true };
}

module.exports = {
  sendReservationEmails,
  generateEmailHTML,
  generateQRCode,
  generateICS
};
