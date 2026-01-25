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
  const key = `blocked/${date}.json`;
  return readJSON('blockedDates', key, []);
}

async function saveBlocked(date, blocked) {
  const key = `blocked/${date}.json`;
  await writeJSON('blockedDates', key, blocked);
}

async function loadReservations(date) {
  const key = `reservations/${date}.json`;
  const reservations = await readJSON('reservations', key, []);
  return Array.isArray(reservations) ? reservations : [];
}

async function loadAllReservations() {
  const allReservations = [];

  // First try to load from blob storage
  const keys = await listKeys('reservations', 'reservations/');

  for (const key of keys) {
    // Skip the index file
    if (key === 'reservation-index.json') continue;

    // Extract date from key (format: reservations/YYYY-MM-DD.json)
    const match = key.match(/reservations\/(\d{4}-\d{2}-\d{2})\.json/);
    if (!match) continue;

    const date = match[1];
    const reservations = await readJSON('reservations', key, []);

    if (Array.isArray(reservations)) {
      reservations.forEach(r => {
        allReservations.push({ ...r, date: r.date || date });
      });
    }
  }

  // Fallback: If no reservations found in blobs, try local filesystem
  if (allReservations.length === 0) {
    const localReservationsDir = path.join(process.cwd(), 'reservations');
    if (fs.existsSync(localReservationsDir)) {
      const files = fs.readdirSync(localReservationsDir);
      for (const file of files) {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
        if (!match) continue;

        const date = match[1];
        const filePath = path.join(localReservationsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const reservations = JSON.parse(content);
          if (Array.isArray(reservations)) {
            reservations.forEach(r => {
              allReservations.push({ ...r, date: r.date || date });
            });
          }
        } catch (err) {
          console.error(`Error reading local file ${file}:`, err);
        }
      }
    }
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
  const key = `reservations/${date}.json`;
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
  const availability = await getAvailability({ date: payload.date, guests: payload.guests });
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
    date: payload.date,
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

  await withLock(`reservation:${payload.date}`, async () => {
    const reservations = await loadReservations(payload.date);
    const blockedSlots = await loadBlocked(payload.date);

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
    await saveReservations(payload.date, reservations);
  });

  await indexReservation(reservation);

  return {
    success: true,
    reservation
  };
}

async function updateReservationStatus({ date, confirmationCode, status }) {
  return withLock(`reservation:${date}`, async () => {
    const reservations = await loadReservations(date);
    const index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);
    if (index === -1) {
      throw new Error('Reservierung nicht gefunden.');
    }

    reservations[index].status = status;
    reservations[index].updatedAt = new Date().toISOString();
    await saveReservations(date, reservations);
    return reservations[index];
  });
}

async function cancelReservation({ confirmationCode, email }) {
  const date = await findReservationDateByCode(confirmationCode);
  if (!date) {
    throw new Error('Reservierung wurde nicht gefunden.');
  }

  return withLock(`reservation:${date}`, async () => {
    const reservations = await loadReservations(date);
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
    await saveReservations(date, reservations);

    return reservations[index];
  });
}

async function deleteReservation({ date, confirmationCode }) {
  return withLock(`reservation:${date}`, async () => {
    const reservations = await loadReservations(date);
    const index = reservations.findIndex((entry) => entry.confirmationCode === confirmationCode);
    if (index === -1) {
      throw new Error('Reservierung wurde nicht gefunden.');
    }

    const deleted = reservations.splice(index, 1)[0];
    await saveReservations(date, reservations);

    // Remove from index
    const reservationIndex = await readJSON('reservations', 'reservation-index.json', {});
    delete reservationIndex[confirmationCode];
    await writeJSON('reservations', 'reservation-index.json', reservationIndex);

    return deleted;
  });
}

async function findReservationDateByCode(confirmationCode) {
  const list = await readJSON('reservations', 'reservation-index.json', {});
  return list[confirmationCode] || null;
}

async function indexReservation(reservation) {
  const index = await readJSON('reservations', 'reservation-index.json', {});
  index[reservation.confirmationCode] = reservation.date;
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
