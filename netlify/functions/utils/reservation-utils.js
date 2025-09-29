const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const RESERVATION_CONTENT_DIR = path.join(process.cwd(), 'content', 'reservierung');
const SPECIAL_DATES_DIR = path.join(process.cwd(), 'content', 'special-dates');
const FALLBACK_RESERVATION_DIR = path.join(process.cwd(), 'netlify', 'data', 'reservations');
const RESERVATION_STORE_NAME = 'reservations';

let blobStoreInstance = null;

function normalizeTime(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = match[2].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }

  if (typeof value === 'object' && value.time) {
    return normalizeTime(value.time);
  }

  return null;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadReservationSettings() {
  const files = await fs.readdir(RESERVATION_CONTENT_DIR);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new Error('Keine Reservierungseinstellungen gefunden. Bitte legen Sie einen Eintrag im CMS an.');
  }

  const filesWithStats = await Promise.all(
    jsonFiles.map(async (file) => {
      const filePath = path.join(RESERVATION_CONTENT_DIR, file);
      const stats = await fs.stat(filePath);
      return { file, filePath, mtimeMs: stats.mtimeMs };
    })
  );

  filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = filesWithStats[0];
  const data = await readJsonFile(latest.filePath);

  return {
    ...data,
    __filePath: latest.filePath
  };
}

async function loadSpecialDates() {
  try {
    const files = await fs.readdir(SPECIAL_DATES_DIR);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    const dates = await Promise.all(
      jsonFiles.map(async (file) => {
        const data = await readJsonFile(path.join(SPECIAL_DATES_DIR, file));
        return {
          ...data,
          date: data.date ? data.date.slice(0, 10) : null
        };
      })
    );

    return dates.filter((entry) => entry.date);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function getStoreInstance() {
  if (blobStoreInstance) {
    return blobStoreInstance;
  }

  try {
    blobStoreInstance = getStore({ name: RESERVATION_STORE_NAME });
    return blobStoreInstance;
  } catch (error) {
    console.warn('Netlify Blobs nicht verfügbar, verwende Dateisystem als Fallback', error.message);
    blobStoreInstance = null;
    return null;
  }
}

async function ensureFallbackDir() {
  await fs.mkdir(FALLBACK_RESERVATION_DIR, { recursive: true });
}

function getReservationKey(date) {
  return `${date}.json`;
}

async function loadReservationsForDate(date) {
  const store = getStoreInstance();
  const key = getReservationKey(date);

  if (store) {
    try {
      const entry = await store.get(key, { type: 'json' });
      return Array.isArray(entry) ? entry : [];
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      console.error('Fehler beim Laden der Reservierungen aus dem Blob Store', error);
      throw error;
    }
  }

  await ensureFallbackDir();
  try {
    const file = path.join(FALLBACK_RESERVATION_DIR, key);
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveReservationsForDate(date, reservations) {
  const store = getStoreInstance();
  const key = getReservationKey(date);

  if (store) {
    await store.set(key, JSON.stringify(reservations), {
      metadata: { contentType: 'application/json' }
    });
    return;
  }

  await ensureFallbackDir();
  const file = path.join(FALLBACK_RESERVATION_DIR, key);
  await fs.writeFile(file, JSON.stringify(reservations, null, 2), 'utf8');
}

function getWeekdayKey(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = utcDate.getUTCDay();
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[dayIndex];
}

function isDateInPast(date) {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const compareDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  return compareDate.getTime() < now.getTime();
}

function hoursUntilSlot(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const slotDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const now = new Date();
  const diffMs = slotDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

function calculateAvailability({ date, guests = null, settings, specialDates = [], existingReservations = [] }) {
  const result = {
    date,
    status: 'open',
    slots: [],
    guestNotes: settings.guest_notes || '',
    waitlistEnabled: Boolean(settings.waitlist_enabled),
    maxGuestsPerReservation: settings.max_guests_per_reservation || null,
    maxDaysInAdvance: settings.max_days_in_advance || null,
    minNoticeHours: settings.min_notice_hours || 0
  };

  if (!settings.opening_hours) {
    result.status = 'closed';
    result.reason = 'no-opening-hours';
    result.message = 'Keine Öffnungszeiten konfiguriert.';
    return result;
  }

  const blackoutDates = Array.isArray(settings.blackout_dates)
    ? settings.blackout_dates
        .map((entry) => (typeof entry === 'string' ? entry.slice(0, 10) : entry.date?.slice(0, 10)))
        .filter(Boolean)
    : [];

  if (blackoutDates.includes(date)) {
    result.status = 'closed';
    result.reason = 'blackout';
    result.message = 'Für dieses Datum können keine Reservierungen vorgenommen werden.';
    return result;
  }

  const today = new Date();
  const selectedDate = new Date(date);
  if (Number.isFinite(settings.max_days_in_advance)) {
    const diffMs = selectedDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > settings.max_days_in_advance) {
      result.status = 'closed';
      result.reason = 'too-far';
      result.message = `Reservierungen sind nur ${settings.max_days_in_advance} Tage im Voraus möglich.`;
      return result;
    }
  }

  if (isDateInPast(date)) {
    result.status = 'closed';
    result.reason = 'past-date';
    result.message = 'Das gewählte Datum liegt in der Vergangenheit.';
    return result;
  }

  const weekdayKey = getWeekdayKey(date);
  const dayConfig = settings.opening_hours[weekdayKey];

  if (!dayConfig || !dayConfig.open) {
    result.status = 'closed';
    result.reason = 'weekly-closed';
    result.message = 'Der Healthy Brunch Club hat an diesem Tag geschlossen.';
    return result;
  }

  const specialDay = specialDates.find((entry) => entry.date === date);

  if (specialDay && specialDay.status === 'geschlossen') {
    result.status = 'closed';
    result.reason = 'special-closed';
    result.message = specialDay.note || 'Für dieses Datum besteht eine Sonderregelung.';
    return result;
  }

  const baseSlots = Array.isArray(dayConfig.slots) ? dayConfig.slots : [];
  let slotsToUse = baseSlots;
  let slotMaxGuests = dayConfig.max_guests || settings.max_guests_per_reservation || 0;
  let note = '';

  if (specialDay && specialDay.status === 'special_hours') {
    const specialSlots = Array.isArray(specialDay.special_slots) ? specialDay.special_slots : [];
    if (specialSlots.length > 0) {
      slotsToUse = specialSlots;
      note = specialDay.note || '';
    }
  }

  const reservationsByTime = existingReservations.reduce((acc, reservation) => {
    if (reservation.status && reservation.status === 'cancelled') {
      return acc;
    }
    const timeKey = normalizeTime(reservation.time);
    if (!timeKey) {
      return acc;
    }
    const partySize = Number(reservation.guests) || 0;
    acc[timeKey] = (acc[timeKey] || 0) + partySize;
    return acc;
  }, {});

  result.slots = slotsToUse
    .map((slot) => {
      const time = normalizeTime(slot);
      if (!time) {
        return null;
      }

      const capacityOverride = slot.max_guests || slot.maxGuests;
      const capacity = Number(capacityOverride || slotMaxGuests || settings.max_guests_per_reservation || 0);
      const reserved = reservationsByTime[time] || 0;
      const remaining = Math.max(capacity - reserved, 0);
      const tooSoon = settings.min_notice_hours ? hoursUntilSlot(date, time) < settings.min_notice_hours : false;
      const fitsParty = guests ? remaining >= guests : remaining > 0;
      let status = 'available';
      let disabledReason = null;

      if (remaining <= 0) {
        status = 'full';
        disabledReason = 'Keine Plätze mehr verfügbar';
      }

      if (tooSoon) {
        status = 'tooSoon';
        disabledReason = `Reservierungen sind nur bis ${settings.min_notice_hours} Stunden im Voraus möglich.`;
      }

      if (guests && guests > capacity) {
        status = 'tooSmall';
        disabledReason = 'Slot bietet nicht genügend Plätze für diese Gruppengröße.';
      }

      return {
        time,
        capacity,
        reserved,
        remaining,
        status,
        disabledReason,
        fitsParty,
        waitlistAvailable: settings.waitlist_enabled && remaining === 0,
        tooSoon
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (result.slots.length === 0) {
    result.status = 'closed';
    result.reason = 'no-slots';
    result.message = 'Für diesen Tag wurden keine Zeitslots konfiguriert.';
  } else {
    result.note = note;
  }

  return result;
}

function generateReservationId() {
  return crypto.randomUUID();
}

module.exports = {
  normalizeTime,
  loadReservationSettings,
  loadSpecialDates,
  loadReservationsForDate,
  saveReservationsForDate,
  calculateAvailability,
  generateReservationId,
  RESERVATION_STORE_NAME
};
