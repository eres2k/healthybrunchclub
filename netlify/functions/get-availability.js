const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // CORS Headers
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
    const { date } = JSON.parse(event.body);
    
    if (!date) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Date is required' })
      };
    }

    if (hoursAdvance < settings.settings.min_hours_advance) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          available: false,
          reason: 'Zu kurzfristig',
          slots: []
        })
      };
    }

    if (daysAdvance > settings.settings.max_days_advance) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          available: false,
          reason: 'Zu weit im Voraus',
          slots: []
        })
      };
    }

    // Check if available date
    const availableDate = availableDates.find(sd => sd.date === date);
    
    if (!availableDate) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          available: false,
          reason: 'Restaurant geschlossen',
          slots: []
        })
      };
    }
    
    // Get slots for the day
    const daySlots = availableDate.slots;
    
    // Calculate availability for each slot
    const availableSlots = daySlots.map(slot => {
      const bookedCount = existingReservations.filter(r => r.time === slot.time)
        .reduce((sum, r) => sum + r.guests, 0);
      const blockedCount = blockedReservations.filter(b => b.time === slot.time)
        .reduce((sum, b) => sum + b.blocked_seats, 0);
      
      const availableSeats = slot.max_guests - bookedCount - blockedCount;
      
      return {
        time: slot.time,
        maxGuests: slot.max_guests,
        availableSeats: Math.max(0, availableSeats),
        available: availableSeats > 0
      };
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        available: true,
        date,
        slots: availableSlots
      })
    };
    
  } catch (error) {
    console.error('Error in get-availability:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function loadSettings() {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '../../content/reservierung/settings.json'),
      'utf8'
    );
    return JSON.parse(data);
  } catch (error) {
    // Return default if file doesn't exist yet
    return {
      settings: {
        max_days_advance: 30,
        min_hours_advance: 2,
        slot_duration: 90,
        default_max_guests: 20
      }
    };
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
