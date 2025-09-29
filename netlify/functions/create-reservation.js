const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('./utils/send-email');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      date,
      time,
      guests,
      name,
      email,
      phone,
      specialRequests
    } = JSON.parse(event.body);

    if (!date || !time || !guests || !name || !email || !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Fehlende Pflichtfelder' })
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ungültige E-Mail-Adresse' })
      };
    }

    const availabilityCheck = await checkAvailability(date, time, parseInt(guests, 10));
    if (!availabilityCheck.available) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Dieser Zeitslot ist nicht mehr verfügbar',
          reason: availabilityCheck.reason
        })
      };
    }

    const reservation = {
      id: uuidv4(),
      confirmationCode: generateConfirmationCode(),
      date,
      time,
      guests: parseInt(guests, 10),
      name,
      email,
      phone,
      specialRequests,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    await saveReservation(reservation);

    await sendConfirmationEmails(reservation);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        confirmationCode: reservation.confirmationCode,
        reservation: {
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          name: reservation.name
        }
      })
    };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Fehler beim Erstellen der Reservierung' })
    };
  }
};

function generateConfirmationCode() {
  return 'HBC' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

async function checkAvailability(date, time, guests) {
  const [existingReservations, blockedReservations] = await Promise.all([
    loadReservations(date),
    loadBlockedReservations(date)
  ]);
  const slot = await getSlotConfig(date, time);

  if (!slot) {
    return { available: false, reason: 'Zeitslot existiert nicht' };
  }

  const bookedGuests = existingReservations
    .filter((r) => r.time === time)
    .reduce((sum, r) => sum + (r.guests || 0), 0);

  const blockedGuests = blockedReservations
    .filter((b) => b.time === time)
    .reduce((sum, b) => sum + (b.blocked_seats || 0), 0);

  const availableSeats = (slot.max_guests || 0) - bookedGuests - blockedGuests;

  if (availableSeats < guests) {
    return {
      available: false,
      reason: `Nur noch ${Math.max(0, availableSeats)} Plätze verfügbar`
    };
  }

  return { available: true };
}

async function getSlotConfig(date, time) {
  try {
    const specialDate = await loadSpecialDate(date);
    if (specialDate) {
      if (specialDate.status === 'closed') {
        return null;
      }
      if (specialDate.status === 'special_hours') {
        return (specialDate.special_slots || []).find((slot) => slot.time === time) || null;
      }
    }

    const openingHoursPath = path.join(__dirname, '../../content/reservierung/opening-hours.json');
    const data = await fs.readFile(openingHoursPath, 'utf8');
    const openingHours = JSON.parse(data);

    const dateObj = new Date(`${date}T00:00:00`);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayConfig = openingHours.weekdays?.[dayOfWeek];

    if (!dayConfig || !dayConfig.open) return null;

    return dayConfig.slots?.find((slot) => slot.time === time) || null;
  } catch (error) {
    return null;
  }
}

async function loadReservations(date) {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '../../.netlify/blobs/reservations.json'),
      'utf8'
    );
    const allReservations = JSON.parse(data);
    return allReservations.filter((r) => r.date === date && r.status === 'confirmed');
  } catch (error) {
    return [];
  }
}

async function loadBlockedReservations(date) {
  try {
    const blockedDir = path.join(__dirname, '../../content/blocked-reservations');
    const files = await fs.readdir(blockedDir);
    const blocked = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(blockedDir, file), 'utf8');
        const blockData = JSON.parse(data);
        if (blockData.date === date) {
          blocked.push(blockData);
        }
      }
    }

    return blocked;
  } catch (error) {
    return [];
  }
}

async function loadSpecialDate(date) {
  try {
    const specialDir = path.join(__dirname, '../../content/special-dates');
    const files = await fs.readdir(specialDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(specialDir, file), 'utf8');
        const specialData = JSON.parse(data);
        if (specialData.date === date) {
          return specialData;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function saveReservation(reservation) {
  const filePath = path.join(__dirname, '../../.netlify/blobs/reservations.json');

  let reservations = [];
  try {
    const data = await fs.readFile(filePath, 'utf8');
    reservations = JSON.parse(data);
  } catch (error) {
  }

  reservations.push(reservation);

  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(filePath, JSON.stringify(reservations, null, 2));
}

async function sendConfirmationEmails(reservation) {
  const customerEmail = {
    to: reservation.email,
    subject: 'Reservierungsbestätigung - Healthy Brunch Club Wien',
    html: generateCustomerEmailHTML(reservation)
  };

  const restaurantEmail = {
    to: process.env.RESTAURANT_EMAIL || 'info@healthybrunchclub.at',
    subject: `Neue Reservierung - ${reservation.date} ${reservation.time}`,
    html: generateRestaurantEmailHTML(reservation)
  };

  await Promise.all([
    sendEmail(customerEmail),
    sendEmail(restaurantEmail)
  ]);
}

function generateCustomerEmailHTML(reservation) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Lato', sans-serif; color: #1E4A3C; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F5F0E8; padding: 30px; text-align: center; }
        .content { background-color: white; padding: 30px; }
        .confirmation-box { 
          background-color: #B8D4B2; 
          padding: 20px; 
          border-radius: 8px;
          margin: 20px 0;
        }
        .details { margin: 20px 0; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #8B9474; }
        .footer { text-align: center; margin-top: 30px; color: #8B9474; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #1E4A3C;">Healthy Brunch Club Wien</h1>
          <p>Ihre Reservierung wurde bestätigt!</p>
        </div>
        <div class="content">
          <div class="confirmation-box">
            <h2 style="margin-top: 0;">Bestätigungscode: ${reservation.confirmationCode}</h2>
          </div>
          
          <div class="details">
            <h3>Reservierungsdetails:</h3>
            <div class="detail-row">
              <span class="label">Name:</span> ${reservation.name}
            </div>
            <div class="detail-row">
              <span class="label">Datum:</span> ${formatDate(reservation.date)}
            </div>
            <div class="detail-row">
              <span class="label">Zeit:</span> ${reservation.time} Uhr
            </div>
            <div class="detail-row">
              <span class="label">Anzahl Personen:</span> ${reservation.guests}
            </div>
            ${reservation.specialRequests ? `
            <div class="detail-row">
              <span class="label">Besondere Wünsche:</span> ${reservation.specialRequests}
            </div>
            ` : ''}
          </div>
          
          <p>Wir freuen uns auf Ihren Besuch!</p>
          
          <p style="color: #8B9474; font-size: 14px;">
            Falls Sie die Reservierung stornieren müssen, kontaktieren Sie uns bitte 
            unter info@healthybrunchclub.at oder rufen Sie uns an.
          </p>
        </div>
        <div class="footer">
          <p>Healthy Brunch Club Wien<br>
          Ihre Adresse hier<br>
          Tel: +43 XXX XXXXX</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateRestaurantEmailHTML(reservation) {
  return `
    <h2>Neue Reservierung eingegangen</h2>
    <p><strong>Bestätigungscode:</strong> ${reservation.confirmationCode}</p>
    <p><strong>Name:</strong> ${reservation.name}</p>
    <p><strong>Datum:</strong> ${formatDate(reservation.date)}</p>
    <p><strong>Zeit:</strong> ${reservation.time} Uhr</p>
    <p><strong>Personen:</strong> ${reservation.guests}</p>
    <p><strong>Telefon:</strong> ${reservation.phone}</p>
    <p><strong>E-Mail:</strong> ${reservation.email}</p>
    ${reservation.specialRequests ? `<p><strong>Besondere Wünsche:</strong> ${reservation.specialRequests}</p>` : ''}
  `;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('de-AT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
