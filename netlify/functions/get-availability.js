const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// Load settings from YAML file
async function loadSettings() {
  try {
    const settingsPath = path.join(process.cwd(), 'content', 'settings', 'reservation-settings.yml');
    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    const settings = yaml.load(settingsContent);
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return {
      openingHours: { start: '09:00', end: '21:00' },
      maxCapacityPerSlot: 40,
      slotInterval: 15,
      timezone: 'Europe/Vienna'
    };
  }
}

// Load blocked slots from markdown files
async function loadBlockedSlots(date) {
  try {
    const blockedDir = path.join(process.cwd(), 'content', 'blocked-reservations');
    const filename = `${date}.md`;
    const filePath = path.join(blockedDir, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);
      return data.blockedSlots || [];
    } catch {
      // No blocked slots for this date
      return [];
    }
  } catch (error) {
    console.error('Error loading blocked slots:', error);
    return [];
  }
}

// Load existing reservations from storage
async function loadReservations(date) {
  try {
    const reservationsPath = path.join(process.cwd(), '.netlify', 'blobs', 'deploy', 'reservations', `${date}.json`);
    const content = await fs.readFile(reservationsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Generate time slots based on settings
function generateTimeSlots(settings) {
  const slots = [];
  const { openingHours, slotInterval } = settings;
  
  let [startHour, startMin] = openingHours.start.split(':').map(Number);
  let [endHour, endMin] = openingHours.end.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour * 60 + currentMin < endHour * 60 + endMin) {
    const time = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    slots.push(time);
    
    currentMin += slotInterval;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return slots;
}

// Calculate availability for each slot
async function calculateAvailability(date, guests = null) {
  const settings = await loadSettings();
  const blockedSlots = await loadBlockedSlots(date);
  const reservations = await loadReservations(date);
  
  const timeSlots = settings.defaultSlots || generateTimeSlots(settings).map(time => ({
    time,
    capacity: settings.maxCapacityPerSlot
  }));
  
  const availability = timeSlots.map(slot => {
    // Check if slot is blocked
    const blocked = blockedSlots.find(b => b.time === slot.time);
    const blockedSeats = blocked ? (blocked.blocked_seats || 0) : 0;
    
    // Calculate reserved seats
    const reservedSeats = reservations
      .filter(r => r.time === slot.time && r.status === 'confirmed')
      .reduce((sum, r) => sum + (r.guests || 0), 0);
    
    const totalCapacity = slot.capacity || settings.maxCapacityPerSlot;
    const availableCapacity = totalCapacity - blockedSeats;
    const remaining = Math.max(0, availableCapacity - reservedSeats);
    
    return {
      time: slot.time,
      capacity: availableCapacity,
      reserved: reservedSeats,
      remaining: remaining,
      waitlist: remaining === 0 && settings.waitlistEnabled,
      fits: guests ? remaining >= guests : remaining > 0,
      blockedReason: blocked?.reason
    };
  });
  
  return {
    date,
    timezone: settings.timezone,
    slots: availability
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  const { date, guests } = event.queryStringParameters || {};

  if (!date) {
    return {
      statusCode: 400,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Date parameter is required' })
    };
  }

  try {
    const availability = await calculateAvailability(date, guests ? parseInt(guests, 10) : null);
    
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(availability)
    };
  } catch (error) {
    console.error('Error in get-availability:', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
