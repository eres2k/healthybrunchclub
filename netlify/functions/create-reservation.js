const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('./utils/send-email');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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

    // Validate required fields
    if (!date || !time || !guests || !name || !email || !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Fehlende Pflichtfelder' })
      };
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ungültige E-Mail-Adresse' })
      };
    }

    // Check availability again
    const availabilityCheck = await checkAvailability(date, time, guests);
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

    // Create reservation
    const reservation = {
      id: uuidv4(),
      confirmationCode: generateConfirmationCode(),
      date,
      time,
      guests: parseInt(guests),
      name,
      email,
      phone,
      specialRequests,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    // Save reservation
    await saveReservation(reservation);

    // Send confirmation emails
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
  const guestsNumber = parseInt(guests, 10);
  if (Number.isNaN(guestsNumber) || guestsNumber <= 0) {
    return { available: false, reason: 'Ungültige Gästeanzahl' };
  }

  const existingReservations = await loadReservations(date);
  const blockedReservations = await loadBlockedReservations(date);
  const slot = await getSlotConfig(date, time);
  
  if (!slot) {
    return { available: false, reason: 'Zeitslot existiert nicht' };
  }
  
  const bookedGuests = existingReservations
    .filter(r => r.time === time)
    .reduce((sum, r) => sum + r.guests, 0);
  const blockedSeats = blockedReservations
    .filter(b => b.time === time)
    .reduce((sum, b) => sum + b.blocked_seats, 0);
  
  const availableSeats = slot.max_guests - bookedGuests - blockedSeats;
  const remainingSeats = Math.max(availableSeats, 0);
  
  if (remainingSeats < guestsNumber) {
    return { 
      available: false, 
      reason: `Nur noch ${remainingSeats} Plätze verfügbar` 
    };
  }
  
  return { available: true };
}

async function getSlotConfig(date, time) {
  try {
    const availableDates = await loadAvailableDates();
    const availableDate = availableDates.find(sd => sd.date === date);
    
    if (!availableDate) return null;
    
    return availableDate.slots.find(slot => slot.time === time);
  } catch (error) {
    return null;
  }
}

async function loadAvailableDates() {
  try {
    const availableDatesDir = path.join(__dirname, '../../content/available-dates');
    const files = await fs.readdir(availableDatesDir);
    const availableDates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(availableDatesDir, file), 'utf8');
        availableDates.push(JSON.parse(data));
      }
    }
    
    return availableDates;
  } catch (error) {
    return [];
  }
}

async function loadReservations(date) {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '../../.netlify/blobs/reservations.json'),
      'utf8'
    );
    const allReservations = JSON.parse(data);
    return allReservations.filter(r => r.date === date && r.status === 'confirmed');
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

async function saveReservation(reservation) {
  const filePath = path.join(__dirname, '../../.netlify/blobs/reservations.json');
  
  let reservations = [];
  try {
    const data = await fs.readFile(filePath, 'utf8');
    reservations = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, start with empty array
  }
  
  reservations.push(reservation);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(filePath, JSON.stringify(reservations, null, 2));
}

async function sendConfirmationEmails(reservation) {
  // Send to customer
  const customerEmail = {
    to: reservation.email,
    subject: `Reservierungsbestätigung - Healthy Brunch Club Wien`,
    html: generateCustomerEmailHTML(reservation)
  };
  
  // Send to restaurant
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
  const date = new Date(dateString);
  return date.toLocaleDateString('de-AT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
