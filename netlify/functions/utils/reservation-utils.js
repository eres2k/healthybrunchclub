const { zonedTimeToUtc } = require('date-fns-tz');
const BlobStorage = require('./blob-storage');

const TIMEZONE = 'Europe/Vienna';
const MAX_CAPACITY_PER_SLOT = parseInt(process.env.MAX_CAPACITY_PER_SLOT || '40');
const TIME_SLOT_DURATION = 15; // minutes

/**
 * Generate time slots for a given date
 */
function generateTimeSlots(date) {
  const slots = [];
  const openTime = 9; // 09:00
  const closeTime = 21; // 21:00
  
  for (let hour = openTime; hour < closeTime; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_SLOT_DURATION) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  
  return slots;
}

/**
 * Calculate availability for a specific date
 */
async function calculateAvailability(date, existingReservations = []) {
  const storage = new BlobStorage('settings');
  const blockedDates = await storage.get('blocked-dates') || [];
  
  // Check if date is blocked
  if (blockedDates.includes(date)) {
    return { available: false, reason: 'Datum ist blockiert', slots: [] };
  }
  
  const slots = generateTimeSlots(date);
  const availability = [];
  
  for (const slot of slots) {
    const reservationsInSlot = existingReservations.filter(r => 
      r.time === slot && r.status === 'confirmed'
    );
    
    const totalGuests = reservationsInSlot.reduce((sum, r) => sum + r.guests, 0);
    const remainingCapacity = MAX_CAPACITY_PER_SLOT - totalGuests;
    
    availability.push({
      time: slot,
      available: remainingCapacity > 0,
      remainingCapacity,
      waitlist: remainingCapacity <= 0
    });
  }
  
  return {
    available: availability.some(s => s.available),
    slots: availability,
    date
  };
}

/**
 * Load reservations for a specific date
 */
async function loadReservationsForDate(date) {
  const storage = new BlobStorage('reservations');
  const key = `date-${date}`;
  return await storage.get(key) || [];
}

/**
 * Save reservations for a specific date
 */
async function saveReservationsForDate(date, reservations) {
  const storage = new BlobStorage('reservations');
  const key = `date-${date}`;
  return await storage.set(key, reservations);
}

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode() {
  return 'HBC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

/**
 * Validate Austrian phone number
 */
function validateAustrianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  // Austrian phone patterns: 0664..., 0676..., +43664..., etc.
  const austrianPattern = /^(43|0)(6\d{2}|1|2|3|4|5|7)\d{6,10}$/;
  return austrianPattern.test(cleaned);
}

/**
 * Format date for display (DD.MM.YYYY)
 */
function formatDateAustrian(date) {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

function getReservationDateTime(date, time) {
  if (!date || !time) return null;
  try {
    return zonedTimeToUtc(`${date}T${time}:00`, TIMEZONE);
  } catch (error) {
    console.error('Failed to parse reservation datetime:', error);
    return null;
  }
}

module.exports = {
  generateTimeSlots,
  calculateAvailability,
  loadReservationsForDate,
  saveReservationsForDate,
  generateConfirmationCode,
  validateAustrianPhone,
  formatDateAustrian,
  getReservationDateTime,
  TIMEZONE,
  MAX_CAPACITY_PER_SLOT,
  TIME_SLOT_DURATION
};
