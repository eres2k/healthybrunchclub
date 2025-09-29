const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event) => {
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

    const openingHours = await loadOpeningHours();
    const specialDates = await loadSpecialDates();
    const existingReservations = await loadReservations(date);
    const blockedReservations = await loadBlockedReservations(date);

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();

    const specialDate = specialDates.find((sd) => sd.date === date);

    if (specialDate && specialDate.status === 'closed') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          available: false,
          reason: specialDate.note || 'Restaurant geschlossen',
          slots: []
        })
      };
    }

    let daySlots;
    if (specialDate && specialDate.status === 'special_hours') {
      daySlots = specialDate.special_slots || [];
    } else {
      const dayConfig = openingHours.weekdays?.[dayOfWeek];
      if (!dayConfig || !dayConfig.open) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            available: false,
            reason: 'Geschlossen',
            slots: []
          })
        };
      }
      daySlots = dayConfig.slots || [];
    }

    const availableSlots = daySlots.map((slot) => {
      const bookedCount = existingReservations
        .filter((r) => r.time === slot.time)
        .reduce((sum, r) => sum + (r.guests || 0), 0);
      const blockedCount = blockedReservations
        .filter((b) => b.time === slot.time)
        .reduce((sum, b) => sum + (b.blocked_seats || 0), 0);

      const availableSeats = (slot.max_guests || 0) - bookedCount - blockedCount;

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

async function loadOpeningHours() {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '../../content/reservierung/opening-hours.json'),
      'utf8'
    );
    return JSON.parse(data);
  } catch (error) {
    return {
      weekdays: {
        monday: { open: false },
        tuesday: { open: true, slots: [{ time: '09:00', max_guests: 20 }, { time: '11:00', max_guests: 20 }, { time: '13:00', max_guests: 20 }] },
        wednesday: { open: true, slots: [{ time: '09:00', max_guests: 20 }, { time: '11:00', max_guests: 20 }, { time: '13:00', max_guests: 20 }] },
        thursday: { open: true, slots: [{ time: '09:00', max_guests: 20 }, { time: '11:00', max_guests: 20 }, { time: '13:00', max_guests: 20 }] },
        friday: { open: true, slots: [{ time: '09:00', max_guests: 20 }, { time: '11:00', max_guests: 20 }, { time: '13:00', max_guests: 20 }] },
        saturday: { open: true, slots: [{ time: '10:00', max_guests: 25 }, { time: '12:00', max_guests: 25 }, { time: '14:00', max_guests: 25 }] },
        sunday: { open: true, slots: [{ time: '10:00', max_guests: 25 }, { time: '12:00', max_guests: 25 }, { time: '14:00', max_guests: 25 }] }
      }
    };
  }
}

async function loadSpecialDates() {
  try {
    const specialDatesDir = path.join(__dirname, '../../content/special-dates');
    const files = await fs.readdir(specialDatesDir);
    const specialDates = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(specialDatesDir, file), 'utf8');
        specialDates.push(JSON.parse(data));
      }
    }

    return specialDates;
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
