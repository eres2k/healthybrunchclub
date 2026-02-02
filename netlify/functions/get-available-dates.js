'use strict';

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { loadReservations, loadBlocked } = require('./utils/reservation-utils');
const { readJSON } = require('./utils/blob-storage');

const DEFAULT_MAX_CAPACITY = 40;

/**
 * Load admin settings to get maxCapacityPerSlot
 */
async function loadAdminSettings() {
  const settings = await readJSON('settings', 'admin-settings.json', {});
  return {
    maxCapacityPerSlot: settings.maxCapacityPerSlot || DEFAULT_MAX_CAPACITY
  };
}

function formatTimeSlot(time) {
  if (typeof time === 'number' || !Number.isNaN(Number(time))) {
    const totalMinutes = parseInt(time, 10);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  if (typeof time === 'string' && time.includes(':')) {
    return time;
  }
  return time;
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) {
    return [];
  }

  return slots.map((slot) => {
    if (slot && typeof slot === 'object') {
      const timeValue = slot.time ?? slot.slot ?? slot.start ?? slot.startTime ?? slot;
      return {
        ...slot,
        time: formatTimeSlot(timeValue)
      };
    }
    const formattedTime = formatTimeSlot(slot);
    return {
      time: formattedTime
    };
  });
}

/**
 * Calculate slot availability by checking existing reservations and blocked slots
 * Uses maxCapacityPerSlot from admin settings instead of per-slot max_guests
 */
async function enrichSlotsWithAvailability(date, slots) {
  try {
    const reservations = await loadReservations(date);
    const blockedSlots = await loadBlocked(date);
    const adminSettings = await loadAdminSettings();
    const maxCapacity = adminSettings.maxCapacityPerSlot;

    return slots.map((slot) => {
      const slotTime = slot.time;

      // Check if slot is blocked
      const blocked = blockedSlots.find((b) => b.time === slotTime);
      const effectiveCapacity = blocked?.capacity !== undefined ? blocked.capacity : maxCapacity;

      // Count confirmed reservations for this slot
      const confirmedGuests = reservations
        .filter((r) => r.time === slotTime && r.status === 'confirmed')
        .reduce((sum, r) => sum + Number(r.guests || 0), 0);

      // Count pending reservations as well (they might be confirmed)
      const pendingGuests = reservations
        .filter((r) => r.time === slotTime && r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.guests || 0), 0);

      const totalReserved = confirmedGuests + pendingGuests;
      const remaining = Math.max(effectiveCapacity - totalReserved, 0);
      const isFull = remaining === 0;
      const isBlocked = blocked?.capacity === 0;

      return {
        time: slot.time,
        capacity: effectiveCapacity,
        reserved: totalReserved,
        confirmed: confirmedGuests,
        pending: pendingGuests,
        remaining,
        available: !isBlocked && remaining > 0,
        waitlist: isFull && !isBlocked,
        blocked: isBlocked
      };
    });
  } catch (error) {
    console.error(`Error enriching slots for ${date}:`, error);
    // Return slots without availability info as fallback
    return slots.map((slot) => ({
      time: slot.time,
      available: true,
      remaining: DEFAULT_MAX_CAPACITY
    }));
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const contentDir = path.join(__dirname, '../../content/available-dates');

    try {
      await fs.access(contentDir);
    } catch {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ availableDates: [] })
      };
    }

    const files = await fs.readdir(contentDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const availableDates = await Promise.all(
      mdFiles.map(async (file) => {
        const content = await fs.readFile(path.join(contentDir, file), 'utf8');
        const { data } = matter(content);

        const dateObj = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateObj >= today) {
          const normalizedSlots = normalizeSlots(data.slots || []);
          // Enrich slots with actual availability data
          const enrichedSlots = await enrichSlotsWithAvailability(data.date, normalizedSlots);

          // Check if any slots are still available
          const hasAvailableSlots = enrichedSlots.some((slot) => slot.available);
          const totalRemaining = enrichedSlots.reduce((sum, slot) => sum + (slot.remaining || 0), 0);

          return {
            date: data.date,
            title: data.title || 'Verfügbar',
            slots: enrichedSlots,
            note: data.note || '',
            hasAvailableSlots,
            totalRemaining
          };
        }
        return null;
      })
    );

    const validDates = availableDates
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ availableDates: validDates })
    };
  } catch (error) {
    console.error('Error loading available dates:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load available dates' })
    };
  }
};
