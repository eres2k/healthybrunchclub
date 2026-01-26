'use strict';

const { readJSON, writeJSON, listKeys } = require('./utils/blob-storage');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json'
};

const DEFAULT_SETTINGS = {
  maxCapacityPerSlot: 40,
  openingHours: { start: '09:00', end: '21:00' },
  slotIntervalMinutes: 15,
  waitlistEnabled: true,
  adminEmails: [],
  sendAdminNotifications: true,
  noShowThreshold: 2,
  autoConfirmReservations: true,
  requirePhoneNumber: false,
  maxGuestsPerReservation: 20,
  minAdvanceBookingHours: 2,
  maxAdvanceBookingDays: 60,
  reminderEmailHoursBeforeReservation: 24,
  cancellationDeadlineHours: 24
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

function authenticate(event, context) {
  const user = context?.clientContext?.user;
  if (user) {
    return user;
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const adminToken = process.env.RESERVATION_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

  if (adminToken && token === adminToken) {
    return { email: 'admin@local', app_metadata: { roles: ['admin'] } };
  }

  throw new Error('Nicht autorisiert. Bitte mit Netlify Identity anmelden.');
}

async function loadSettings() {
  const settings = await readJSON('settings', 'admin-settings.json', {});
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function saveSettings(settings) {
  const current = await loadSettings();
  const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
  await writeJSON('settings', 'admin-settings.json', updated);
  return updated;
}

async function loadAllBlockedSlots() {
  const blockedSlots = [];

  try {
    // List all blocked date files
    const keys = await listKeys('blockedDates', 'blocked/');

    for (const key of keys) {
      // Extract date from key (e.g., "blocked/2026-01-26.json" -> "2026-01-26")
      const match = key.match(/blocked\/(\d{4}-\d{2}-\d{2})\.json/);
      if (match) {
        const date = match[1];
        const slots = await readJSON('blockedDates', key, []);

        if (Array.isArray(slots) && slots.length > 0) {
          slots.forEach(slot => {
            blockedSlots.push({
              date,
              time: slot.time,
              capacity: slot.capacity
            });
          });
        }
      }
    }

    // Sort by date and time
    blockedSlots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

  } catch (error) {
    console.error('[loadAllBlockedSlots] Error:', error.message);
  }

  return blockedSlots;
}

async function deleteBlockedSlot(date, time) {
  const key = `blocked/${date}.json`;
  const slots = await readJSON('blockedDates', key, []);

  const index = slots.findIndex(slot => slot.time === time);
  if (index === -1) {
    throw new Error('Blockierter Slot nicht gefunden.');
  }

  slots.splice(index, 1);

  if (slots.length === 0) {
    // If no more slots, we could delete the file, but for simplicity just write empty array
    await writeJSON('blockedDates', key, []);
  } else {
    await writeJSON('blockedDates', key, slots);
  }

  return { date, time };
}

async function handleGet(event) {
  const { action } = event.queryStringParameters || {};

  if (action === 'blocked-slots') {
    const blockedSlots = await loadAllBlockedSlots();
    return response(200, { blockedSlots });
  }

  const settings = await loadSettings();
  return response(200, { settings });
}

async function handlePost(event) {
  const body = JSON.parse(event.body || '{}');
  const { action } = body;

  if (action === 'delete-blocked-slot') {
    const { date, time } = body;
    if (!date || !time) {
      return response(400, { message: 'Datum und Zeit sind erforderlich.' });
    }
    const deleted = await deleteBlockedSlot(date, time);
    return response(200, { message: 'Blockierter Slot gelöscht.', deleted });
  }

  return response(400, { message: 'Unbekannte Aktion.' });
}

async function handlePut(event) {
  const body = JSON.parse(event.body || '{}');
  const { settings } = body;

  if (!settings || typeof settings !== 'object') {
    return response(400, { message: 'Einstellungen sind erforderlich.' });
  }

  // Validate settings
  const validKeys = Object.keys(DEFAULT_SETTINGS);
  const filteredSettings = {};

  for (const key of validKeys) {
    if (settings[key] !== undefined) {
      filteredSettings[key] = settings[key];
    }
  }

  const updated = await saveSettings(filteredSettings);
  return response(200, { message: 'Einstellungen gespeichert.', settings: updated });
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    authenticate(event, context);
  } catch (error) {
    return response(401, { message: error.message });
  }

  try {
    if (event.httpMethod === 'GET') {
      return await handleGet(event);
    }

    if (event.httpMethod === 'POST') {
      return await handlePost(event);
    }

    if (event.httpMethod === 'PUT') {
      return await handlePut(event);
    }

    return response(405, { message: 'Methode nicht erlaubt.' });
  } catch (error) {
    console.error('Fehler in admin-settings:', error);
    return response(500, { message: 'Interner Fehler: ' + error.message });
  }
};
