'use strict';

const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');
const { readJSON, writeJSON, withLock } = require('./blob-storage');
const { sanitizeText } = require('./validation');

async function loadCMSTimeSlots(date) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const matter = require('gray-matter');

    const patterns = [
      `${date}.md`,
      `${date}.markdown`,
      `${date.split('-').join('-')}.md`
    ];

    for (const pattern of patterns) {
      const filePath = path.join(process.cwd(), 'content', 'time-slots', pattern);

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(fileContent);

        if (data.slots && Array.isArray(data.slots)) {
          console.log(`Loaded CMS slots for ${date}:`, data.slots.length, 'slots');

          return {
            openingTime: data.opening_time || '09:00',
            closingTime: data.closing_time || '21:00',
            slots: data.slots.map((slot) => ({
              time: normalizeTime(slot.time),
              capacity: parseInt(slot.capacity, 10) || MAX_CAPACITY_PER_SLOT,
              blocked: Boolean(slot.blocked),
              reason: slot.reason || null
            }))
          };
        }
      } catch (err) {
        continue;
      }
    }

    console.log(`No CMS slots found for ${date}, using defaults`);
    return null;
  } catch (error) {
    console.error('Error loading CMS time slots:', error);
    return null;
  }
}

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

  const cmsData = await loadCMSTimeSlots(date);
  const usingCMS = Boolean(cmsData && cmsData.slots && cmsData.slots.length > 0);

  let timeSlots;
  const slotConfigs = {};

  if (usingCMS) {
    timeSlots = cmsData.slots.map((slot) => slot.time);

    cmsData.slots.forEach((slot) => {
      slotConfigs[slot.time] = {
        capacity: slot.capacity,
        blocked: slot.blocked,
        reason: slot.reason
      };
    });

    console.log(`Using ${timeSlots.length} CMS-defined slots for ${date}`);
  } else {
    const openingHours = cmsData
      ? { start: cmsData.openingTime, end: cmsData.closingTime }
      : settings.openingHours || DEFAULT_OPENING;

    timeSlots = createTimeSlots(openingHours);
    console.log(`Generated ${timeSlots.length} default slots for ${date}`);
  }

  const slots = timeSlots.map((time) => {
    const cmsConfig = slotConfigs[time] || {};
    const blockConfig = blockedSlots.find((b) => b.time === time);

    const capacity =
      cmsConfig.capacity ??
      blockConfig?.capacity ??
      settings.maxCapacity ??
      MAX_CAPACITY_PER_SLOT;

    const isBlocked = Boolean(
      cmsConfig.blocked ||
      blockConfig?.blocked ||
      (typeof blockConfig?.capacity === 'number' && blockConfig.capacity <= 0)
    );

    const blockReason = cmsConfig.reason || blockConfig?.reason || null;

    const effectiveCapacity = isBlocked ? 0 : capacity;

    const slot = calculateSlotAvailability({
      reservations,
      blockedSlots,
      time,
      guests,
      maxCapacity: effectiveCapacity
    });

    slot.capacity = effectiveCapacity;

    if (isBlocked) {
      slot.blocked = true;
      slot.blockReason = blockReason;
      slot.blockedReason = blockReason;
      slot.remaining = 0;
      slot.fits = false;
    } else if (blockReason) {
      slot.blockReason = blockReason;
      slot.blockedReason = blockReason;
    }

    return slot;
  });

  return {
    date,
    timezone: settings.timezone || TIMEZONE,
    slots,
    source: usingCMS ? 'cms' : 'generated'
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
  saveReservations,
  loadBlocked,
  saveBlocked,
  loadSettings,
  updateReservationStatus,
  cancelReservation,
  indexReservation,
  findReservationDateByCode
};
