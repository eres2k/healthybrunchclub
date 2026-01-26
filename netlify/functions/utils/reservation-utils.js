'use strict';

const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');
const { readJSON, writeJSON, withLock, listKeys } = require('./blob-storage');
const { sanitizeText } = require('./validation');

const MAX_CAPACITY_PER_SLOT = Number(process.env.MAX_CAPACITY_PER_SLOT || 40);
const DEFAULT_OPENING = { start: '09:00', end: '21:00' };
const SLOT_INTERVAL_MINUTES = 15;
const TIMEZONE = process.env.BOOKING_TIME_ZONE || 'Europe/Vienna';

function generateConfirmationCode() {
  return `HBC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeTime(timeString) {
  const [hour, minute] = timeString.split(':').map((value) => value.padStart(2, '0'));
  return `${hour}:${minute}`;
}

/**
 * Normalize date to YYYY-MM-DD format
 * Handles both "2026-01-29" and "2026-01-29T00:00:00.000Z" formats
 */
function normalizeDate(date) {
  if (!date || typeof date !== 'string') return date;
  // Split at 'T' to get just the date part
  return date.split('T')[0];
}

function createTimeSlots(openingHours = DEFAULT_OPENING) {
  const slots = [];
  const start = DateTime.fromFormat(openingHours.start, 'HH:mm', { zone: TIMEZONE });
  const end = DateTime.fromFormat(openingHours.end, 'HH:mm', { zone: TIMEZONE });

  let cursor = start;
  while (cursor < end) {
    slots.push(cursor.toFormat('HH:mm'));
    cursor = cursor.plus({ minutes: SLOT_INTERVAL_MINUTES });
  }
  return slots;
}

async function loadSettings() {
  const settings = await readJSON('settings', 'reservation-settings.json', {});
  return {
    timezone: TIMEZONE,
    maxCapacity: MAX_CAPACITY_PER_SLOT,
    waitlist: true,
    ...settings
  };
}

async function loadBlocked(date) {
  const normalizedDate = normalizeDate(date);
  const key = `blocked/${normalizedDate}.json`;
  return readJSON('blockedDates', key, []);
}

async function saveBlocked(date, blocked) {
  const normalizedDate = normalizeDate(date);
  const key = `blocked/${normalizedDate}.json`;
  await writeJSON('blockedDates', key, blocked);
}

async function loadReservations(date) {
  const normalizedDate = normalizeDate(date);
  const key = `reservations/${normalizedDate}.json`;
  let reservations = await readJSON('reservations', key, null);

  // If not found, try legacy ISO-format key (e.g., reservations/2026-01-29T00:00:00.000Z.json)
  if (reservations === null) {
    const legacyKey = `reservations/${normalizedDate}T00:00:00.000Z.json`;
    reservations = await readJSON('reservations', legacyKey, null);

    // If found in legacy key, migrate to normalized key for future lookups
    if (reservations !== null && Array.isArray(reservations) && reservations.length > 0) {
      console.log(`[loadReservations] Found ${reservations.length} reservations in legacy key ${legacyKey}, migrating to ${key}`);
      await writeJSON('reservations', key, reservations, { updatedAt: new Date().toISOString() });
    }
  }

  if (reservations === null) {
    reservations = [];
  }

  return Array.isArray(reservations) ? reservations : [];
}

async function loadAllReservations() {
  const allReservations = [];
  const existingKeys = new Set();
  const datesToLoad = new Set();
  let blobStorageWorking = false;
  let reservationsFromBlob = 0;
  let reservationsFromLocal = 0;

  console.log('[loadAllReservations] Starting to load all reservations...');

  // Step 1: Get dates from the reservation index (most reliable source)
  try {
    const reservationIndex = await readJSON('reservations', 'reservation-index.json', {});
    const indexKeys = Object.keys(reservationIndex);
    const indexDates = new Set(Object.values(reservationIndex));

    if (indexKeys.length > 0) {
      blobStorageWorking = true;
      console.log(`[loadAllReservations] ✓ Blob storage working. Found ${indexKeys.length} reservations in index, ${indexDates.size} unique dates`);
    } else {
      console.log(`[loadAllReservations] Reservation index is empty or not accessible`);
    }

    indexDates.forEach(date => {
      if (date && typeof date === 'string') {
        // Handle both "YYYY-MM-DD" and "YYYY-MM-DDT..." formats
        const dateOnly = date.split('T')[0];
        datesToLoad.add(dateOnly);
      }
    });
  } catch (indexErr) {
    console.error('[loadAllReservations] ✗ Error reading reservation index:', indexErr.message);
  }

  // Step 2: Also try listing blob keys to find any dates not in the index
  try {
    // Try listing with prefix first, then without if empty
    let keys = await listKeys('reservations', 'reservations/');
    console.log(`[loadAllReservations] Found ${keys.length} keys with 'reservations/' prefix`);

    // If no keys found with prefix, try without prefix
    if (keys.length === 0) {
      keys = await listKeys('reservations', '');
      console.log(`[loadAllReservations] Found ${keys.length} keys without prefix`);
    }

    if (keys.length > 0) {
      blobStorageWorking = true;
    }

    for (const key of keys) {
      // Skip the index file
      if (key === 'reservation-index.json' || key.includes('index')) continue;

      // Extract date from key - support multiple formats:
      // - reservations/YYYY-MM-DD.json (normalized)
      // - reservations/YYYY-MM-DDTHH:MM:SS.sssZ.json (legacy ISO format)
      // - YYYY-MM-DD.json (without prefix)
      // - YYYY-MM-DDTHH:MM:SS.sssZ.json (legacy without prefix)
      let match = key.match(/reservations\/(\d{4}-\d{2}-\d{2}(?:T[^.]+\.\d+Z)?)\.json/);
      if (!match) {
        match = key.match(/^(\d{4}-\d{2}-\d{2}(?:T[^.]+\.\d+Z)?)\.json$/);
      }

      if (match) {
        // Store the raw key date part (might be ISO format)
        const rawDate = match[1];
        // Normalize to YYYY-MM-DD for deduplication
        const normalizedDate = rawDate.split('T')[0];
        datesToLoad.add(normalizedDate);
        // Also track the raw key for legacy blob lookup
        if (rawDate !== normalizedDate) {
          console.log(`[loadAllReservations] Found legacy ISO key: ${key}, normalized to: ${normalizedDate}`);
        }
      }
    }
  } catch (listErr) {
    console.error('[loadAllReservations] ✗ Error listing blob keys:', listErr.message);
  }

  // Step 3: Load reservations for each discovered date
  console.log(`[loadAllReservations] Loading reservations for ${datesToLoad.size} dates from blob storage`);

  // Also try to load from legacy ISO-format keys directly from the blob listing
  const legacyKeysToTry = new Map(); // normalizedDate -> [rawKeys]
  try {
    const allKeys = await listKeys('reservations', '');
    for (const key of allKeys) {
      // Match ISO format keys like "reservations/2026-01-29T00:00:00.000Z.json"
      const isoMatch = key.match(/^(?:reservations\/)?(\d{4}-\d{2}-\d{2}T[^.]+\.\d+Z)\.json$/);
      if (isoMatch) {
        const rawDate = isoMatch[1];
        const normalizedDate = rawDate.split('T')[0];
        if (!legacyKeysToTry.has(normalizedDate)) {
          legacyKeysToTry.set(normalizedDate, []);
        }
        legacyKeysToTry.get(normalizedDate).push(key);
        datesToLoad.add(normalizedDate);
      }
    }
    if (legacyKeysToTry.size > 0) {
      console.log(`[loadAllReservations] Found ${legacyKeysToTry.size} dates with legacy ISO keys`);
    }
  } catch (err) {
    console.error(`[loadAllReservations] Error scanning for legacy keys:`, err.message);
  }

  for (const date of datesToLoad) {
    try {
      // Try reading with prefix first (standard format)
      let reservations = await readJSON('reservations', `reservations/${date}.json`, null);

      // Fallback: try without prefix
      if (reservations === null) {
        reservations = await readJSON('reservations', `${date}.json`, null);
      }

      // Fallback: try legacy ISO-format keys for this date
      if (reservations === null && legacyKeysToTry.has(date)) {
        for (const legacyKey of legacyKeysToTry.get(date)) {
          console.log(`[loadAllReservations] Trying legacy key: ${legacyKey}`);
          reservations = await readJSON('reservations', legacyKey, null);
          if (reservations !== null) {
            console.log(`[loadAllReservations] ✓ Found reservations in legacy key: ${legacyKey}`);
            break;
          }
        }
      }

      if (reservations === null) {
        reservations = [];
      }

      const count = Array.isArray(reservations) ? reservations.length : 0;
      if (count > 0) {
        blobStorageWorking = true;
        console.log(`[loadAllReservations] ✓ Blob: Loaded ${count} reservations for ${date}`);
      }

      if (Array.isArray(reservations)) {
        reservations.forEach(r => {
          // Normalize the date when storing in allReservations
          const normalizedReservationDate = normalizeDate(r.date || date);
          const uniqueKey = `${normalizedReservationDate}-${r.confirmationCode}`;
          if (!existingKeys.has(uniqueKey)) {
            allReservations.push({ ...r, date: normalizedReservationDate, source: 'blob' });
            existingKeys.add(uniqueKey);
            reservationsFromBlob++;
          }
        });
      }
    } catch (readErr) {
      console.error(`[loadAllReservations] ✗ Error reading reservations for ${date}:`, readErr.message);
    }
  }

  // Step 4: Also check local filesystem (for development and as fallback data source)
  // This works locally and when files are bundled via netlify.toml included_files
  // WARNING: Local files are only updated on deployment, so they may contain stale data
  const localReservationsDir = path.resolve(__dirname, '../../../reservations');

  if (!blobStorageWorking) {
    console.warn(`[loadAllReservations] ⚠️ WARNING: Blob storage appears to be unavailable, using local fallback (may contain stale data)`);
  }

  if (fs.existsSync(localReservationsDir)) {
    try {
      const files = fs.readdirSync(localReservationsDir);
      console.log(`[loadAllReservations] Checking ${files.length} local files as fallback`);

      for (const file of files) {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
        if (!match) continue;

        const date = match[1];
        const filePath = path.join(localReservationsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const reservations = JSON.parse(content);
          if (Array.isArray(reservations)) {
            let localAdded = 0;
            reservations.forEach(r => {
              // Normalize the date when storing in allReservations
              const normalizedLocalDate = normalizeDate(r.date || date);
              const uniqueKey = `${normalizedLocalDate}-${r.confirmationCode}`;
              // Avoid duplicates if already loaded from blobs
              if (!existingKeys.has(uniqueKey)) {
                allReservations.push({ ...r, date: normalizedLocalDate, source: 'local' });
                existingKeys.add(uniqueKey);
                reservationsFromLocal++;
                localAdded++;
              }
            });
            if (localAdded > 0) {
              console.log(`[loadAllReservations] Local fallback: Added ${localAdded} reservations from ${file}`);
            }
          }
        } catch (err) {
          console.error(`[loadAllReservations] Error reading local file ${file}:`, err.message);
        }
      }
    } catch (dirErr) {
      console.error(`[loadAllReservations] Error reading local directory:`, dirErr.message);
    }
  } else {
    console.log(`[loadAllReservations] Local reservations directory not found`);
  }

  console.log(`[loadAllReservations] Summary: ${allReservations.length} total (${reservationsFromBlob} from blob, ${reservationsFromLocal} from local fallback)`);

  if (!blobStorageWorking && reservationsFromLocal > 0) {
    console.warn(`[loadAllReservations] ⚠️ All ${reservationsFromLocal} reservations came from local fallback - new reservations may be missing!`);
  }

  // Sort by date (newest first), then by time
  allReservations.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return allReservations;
}

async function saveReservations(date, reservations) {
  const normalizedDate = normalizeDate(date);
  const key = `reservations/${normalizedDate}.json`;
  await writeJSON('reservations', key, reservations, { updatedAt: new Date().toISOString() });
}

function calculateSlotAvailability({ reservations, blockedSlots, time, guests, maxCapacity }) {
  const blocked = blockedSlots.find((entry) => entry.time === time);
  const capacity = blocked?.capacity ?? maxCapacity;

  const confirmedGuests = reservations
    .filter((reservation) => reservation.time === time && reservation.status === 'confirmed')
    .reduce((sum, reservation) => sum + Number(reservation.guests || 0), 0);

  const remaining = Math.max(capacity - confirmedGuests, 0);
  const fits = guests ? remaining >= guests : remaining > 0;

  return {
    time,
    capacity,
    reserved: confirmedGuests,
    remaining,
    waitlist: remaining === 0,
    fits
  };
}

async function getAvailability({ date, guests }) {
  const settings = await loadSettings();
  const blockedSlots = await loadBlocked(date);
  const reservations = await loadReservations(date);

  const slots = createTimeSlots(settings.openingHours || DEFAULT_OPENING).map((time) =>
    calculateSlotAvailability({
      reservations,
      blockedSlots,
      time,
      guests,
      maxCapacity: settings.maxCapacity || MAX_CAPACITY_PER_SLOT
    })
  );

  return {
    date,
    timezone: settings.timezone || TIMEZONE,
    slots
  };
}

async function createReservation(payload) {
  const settings = await loadSettings();
  const normalizedTime = normalizeTime(payload.time);
  const normalizedPayloadDate = normalizeDate(payload.date);
  const availability = await getAvailability({ date: normalizedPayloadDate, guests: payload.guests });
  const slot = availability.slots.find((entry) => entry.time === normalizedTime);

  if (!slot) {
    return {
      success: false,
      message: 'Dieser Zeitslot ist nicht verfügbar.'
    };
  }

  const reservation = {
    id: randomUUID(),
    confirmationCode: generateConfirmationCode(),
    date: normalizedPayloadDate,
    time: normalizedTime,
    guests: payload.guests,
    name: sanitizeText(payload.name),
    email: payload.email,
    phone: payload.phone,
    specialRequests: payload.specialRequests,
    status: slot.remaining >= payload.guests ? 'confirmed' : 'waitlisted',
    timezone: settings.timezone || TIMEZONE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await withLock(`reservation:${normalizedPayloadDate}`, async () => {
    const reservations = await loadReservations(normalizedPayloadDate);
    const blockedSlots = await loadBlocked(normalizedPayloadDate);

    const freshSlot = calculateSlotAvailability({
      reservations,
      blockedSlots,
      time: normalizedTime,
      guests: payload.guests,
      maxCapacity: settings.maxCapacity || MAX_CAPACITY_PER_SLOT
    });

    if (freshSlot.remaining >= payload.guests) {
      reservation.status = 'confirmed';
    } else if (!settings.waitlist) {
      throw new Error('Keine Plätze mehr verfügbar.');
    }

    reservations.push(reservation);
    await saveReservations(normalizedPayloadDate, reservations);
  });

  await indexReservation(reservation);

  return {
    success: true,
    reservation
  };
}

async function updateReservationStatus({ date, confirmationCode, status }) {
  // Versuche zuerst das übergebene Datum, dann den Index
  let targetDate = normalizeDate(date);

  // Prüfe ob die Reservierung unter diesem Datum existiert
  let reservations = await loadReservations(targetDate);
  let index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);

  // Falls nicht gefunden, versuche das Datum aus dem Index zu holen
  if (index === -1) {
    const indexedDate = await findReservationDateByCode(confirmationCode);
    if (indexedDate && indexedDate !== targetDate) {
      targetDate = indexedDate;
      reservations = await loadReservations(targetDate);
      index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);
    }
  }

  if (index === -1) {
    throw new Error('Reservierung nicht gefunden.');
  }

  return withLock(`reservation:${targetDate}`, async () => {
    // Lade nochmal innerhalb des Locks um Race Conditions zu vermeiden
    const currentReservations = await loadReservations(targetDate);
    const currentIndex = currentReservations.findIndex((entry) => entry.confirmationCode === confirmationCode);

    if (currentIndex === -1) {
      throw new Error('Reservierung nicht gefunden.');
    }

    currentReservations[currentIndex].status = status;
    currentReservations[currentIndex].updatedAt = new Date().toISOString();
    await saveReservations(targetDate, currentReservations);
    return currentReservations[currentIndex];
  });
}

async function cancelReservation({ confirmationCode, email }) {
  const date = await findReservationDateByCode(confirmationCode);
  if (!date) {
    throw new Error('Reservierung wurde nicht gefunden.');
  }
  const normalizedCancelDate = normalizeDate(date);

  return withLock(`reservation:${normalizedCancelDate}`, async () => {
    const reservations = await loadReservations(normalizedCancelDate);
    const index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);
    if (index === -1) {
      throw new Error('Reservierung wurde nicht gefunden.');
    }

    const reservation = reservations[index];
    if (reservation.email !== email) {
      throw new Error('E-Mail-Adresse stimmt nicht mit der Reservierung überein.');
    }

    reservations[index].status = 'cancelled';
    reservations[index].updatedAt = new Date().toISOString();
    await saveReservations(normalizedCancelDate, reservations);

    return reservations[index];
  });
}

async function deleteReservation({ date, confirmationCode }) {
  // Versuche zuerst das übergebene Datum, dann den Index
  let targetDate = normalizeDate(date);

  // Prüfe ob die Reservierung unter diesem Datum existiert
  let reservations = await loadReservations(targetDate);
  let index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);

  // Falls nicht gefunden, versuche das Datum aus dem Index zu holen
  if (index === -1) {
    const indexedDate = await findReservationDateByCode(confirmationCode);
    if (indexedDate && indexedDate !== targetDate) {
      targetDate = indexedDate;
      reservations = await loadReservations(targetDate);
      index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);
    }
  }

  if (index === -1) {
    throw new Error('Reservierung wurde nicht gefunden.');
  }

  return withLock(`reservation:${targetDate}`, async () => {
    // Lade nochmal innerhalb des Locks um Race Conditions zu vermeiden
    const currentReservations = await loadReservations(targetDate);
    const currentIndex = currentReservations.findIndex((entry) => entry.confirmationCode === confirmationCode);

    if (currentIndex === -1) {
      throw new Error('Reservierung wurde nicht gefunden.');
    }

    const deleted = currentReservations.splice(currentIndex, 1)[0];
    await saveReservations(targetDate, currentReservations);

    // Remove from index
    const reservationIndex = await readJSON('reservations', 'reservation-index.json', {});
    delete reservationIndex[confirmationCode];
    await writeJSON('reservations', 'reservation-index.json', reservationIndex);

    return deleted;
  });
}

async function findReservationDateByCode(confirmationCode) {
  const list = await readJSON('reservations', 'reservation-index.json', {});
  const date = list[confirmationCode] || null;
  // Normalize the date in case old entries have ISO format
  return date ? normalizeDate(date) : null;
}

async function indexReservation(reservation) {
  const index = await readJSON('reservations', 'reservation-index.json', {});
  // Store normalized date to ensure consistent YYYY-MM-DD format
  index[reservation.confirmationCode] = normalizeDate(reservation.date);
  await writeJSON('reservations', 'reservation-index.json', index);
}

module.exports = {
  createReservation,
  getAvailability,
  loadReservations,
  loadAllReservations,
  saveReservations,
  loadBlocked,
  saveBlocked,
  loadSettings,
  updateReservationStatus,
  cancelReservation,
  deleteReservation,
  indexReservation,
  findReservationDateByCode
};
