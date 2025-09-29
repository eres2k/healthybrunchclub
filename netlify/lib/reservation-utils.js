const path = require('path');
const fs = require('fs/promises');
const { getStore } = require('@netlify/blobs');

const ROOT_DIR = path.join(__dirname, '..', '..');
const RESERVATION_STORE_NAME = 'reservations';
const store = getStore({ name: RESERVATION_STORE_NAME });

function normaliseTimeString(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = match[1].padStart(2, '0');
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

async function loadLatestJsonEntry(relativeFolder) {
  const folderPath = path.join(ROOT_DIR, relativeFolder);
  let files = [];

  try {
    files = await fs.readdir(folderPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const jsonFiles = files
    .filter(file => file.toLowerCase().endsWith('.json'))
    .map(file => path.join(folderPath, file));

  if (jsonFiles.length === 0) {
    return null;
  }

  const filesWithStats = await Promise.all(
    jsonFiles.map(async filePath => {
      const stats = await fs.stat(filePath);
      return { filePath, mtime: stats.mtimeMs };
    })
  );

  filesWithStats.sort((a, b) => b.mtime - a.mtime);
  const latestFile = filesWithStats[0]?.filePath;

  if (!latestFile) {
    return null;
  }

  const content = await fs.readFile(latestFile, 'utf8');
  return JSON.parse(content);
}

async function loadReservationSettings() {
  const settings = await loadLatestJsonEntry('content/reservierung');
  if (!settings) {
    return {
      lead_time_days: 0,
      booking_window_days: 60,
      max_guests_per_reservation: 8,
      waitlist_enabled: true,
      blackout_dates: [],
      default_note: '',
      opening_hours: {}
    };
  }
  return settings;
}

async function loadSpecialDates() {
  const folderPath = 'content/special-dates';
  const fullPath = path.join(ROOT_DIR, folderPath);
  let files = [];

  try {
    files = await fs.readdir(fullPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const entries = [];
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    const filePath = path.join(fullPath, file);
    const content = await fs.readFile(filePath, 'utf8');
    try {
      const parsed = JSON.parse(content);
      if (parsed?.date) {
        entries.push(parsed);
      }
    } catch (error) {
      console.warn('Unable to parse special date file', filePath, error);
    }
  }

  entries.sort((a, b) => {
    return String(a.date).localeCompare(String(b.date));
  });

  return entries;
}

function resolveDayConfig(settings, targetDate) {
  const dateObj = new Date(targetDate);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }
  const dayIndex = dateObj.getUTCDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[dayIndex];
  const openingHours = settings?.opening_hours || {};
  return openingHours[dayKey] || null;
}

function expandSlotsFromConfig(dayConfig) {
  if (!dayConfig) return [];
  const maxGuests = Number(dayConfig.max_guests) || 0;
  const slots = dayConfig.slots || [];
  if (!Array.isArray(slots)) return [];

  return slots
    .map(slot => {
      if (typeof slot === 'string') {
        const time = normaliseTimeString(slot);
        if (!time) return null;
        return { time, maxGuests };
      }
      if (slot && typeof slot === 'object') {
        const time = normaliseTimeString(slot.time);
        if (!time) return null;
        return {
          time,
          maxGuests: Number(slot.max_guests || slot.maxGuests || maxGuests) || maxGuests
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function normaliseBlackoutDates(blackoutDates = []) {
  if (!Array.isArray(blackoutDates)) return [];
  return blackoutDates
    .map(entry => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return entry.slice(0, 10);
      }
      if (typeof entry === 'object' && entry.date) {
        return String(entry.date).slice(0, 10);
      }
      return null;
    })
    .filter(Boolean);
}

async function getReservationsForDate(date) {
  const key = `${date}.json`;
  try {
    const payload = await store.get(key, { type: 'json' });
    if (payload && Array.isArray(payload.reservations)) {
      return payload.reservations;
    }
    return [];
  } catch (error) {
    console.warn('Unable to load reservations for', date, error);
    return [];
  }
}

async function persistReservationsForDate(date, reservations) {
  const key = `${date}.json`;
  await store.set(key, JSON.stringify({ date, reservations }), {
    metadata: { date }
  });
}

async function listAllReservationEntries() {
  const items = [];
  for await (const entry of store.list()) {
    if (!entry?.key?.endsWith('.json')) continue;
    const payload = await store.get(entry.key, { type: 'json' });
    if (payload && Array.isArray(payload.reservations)) {
      items.push(...payload.reservations.map(reservation => ({
        ...reservation,
        date: payload.date || reservation.date
      })));
    }
  }
  return items;
}

function buildAvailabilityResponse({
  slots,
  reservations,
  waitlistEnabled
}) {
  const enrichedSlots = slots.map(slot => {
    const reservedGuests = reservations
      .filter(reservation => reservation.time === slot.time && reservation.status !== 'cancelled')
      .reduce((sum, reservation) => sum + Number(reservation.guests || 0), 0);

    const availableGuests = Math.max(slot.maxGuests - reservedGuests, 0);
    return {
      time: slot.time,
      maxGuests: slot.maxGuests,
      reservedGuests,
      availableGuests,
      isFull: availableGuests <= 0,
      waitlistAvailable: waitlistEnabled && availableGuests <= 0
    };
  });

  return enrichedSlots;
}

function buildIcsContent(reservation, restaurant) {
  const timeString = reservation.time || '09:00';
  const [hoursStr, minutesStr] = timeString.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const startDate = new Date(`${reservation.date}T${hoursStr.padStart(2, '0')}:${minutesStr.padStart(2, '0')}:00`);
  const endDate = new Date(startDate.getTime() + 90 * 60000);

  const formatIcsDate = date => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hour}${minute}${second}Z`;
  };

  const location = restaurant?.address || 'Healthy Brunch Club, Wien';
  const descriptionLines = [
    `Reservierungscode: ${reservation.confirmationCode}`,
    reservation.message ? `Notiz: ${reservation.message}` : null
  ].filter(Boolean);

  const description = descriptionLines.join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Healthy Brunch Club//Reservation//DE',
    'BEGIN:VEVENT',
    `UID:${reservation.confirmationCode}@healthybrunchclub.at`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:Reservierung Healthy Brunch Club`,
    `LOCATION:${location.replace(/,/g, '\\,')}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : 'DESCRIPTION:Tischreservierung',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');
}

module.exports = {
  loadReservationSettings,
  loadSpecialDates,
  resolveDayConfig,
  expandSlotsFromConfig,
  normaliseBlackoutDates,
  getReservationsForDate,
  persistReservationsForDate,
  buildAvailabilityResponse,
  listAllReservationEntries,
  buildIcsContent
};
