'use strict';

const fs = require('fs').promises;
const path = require('path');
const { getAvailability } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseDateKey(date) {
  if (!date || typeof date !== 'string') return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

async function loadFallbackConfig() {
  try {
    const filePath = path.join(process.cwd(), 'content', 'reservierung', 'standard.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Fallback-Konfiguration konnte nicht geladen werden.', error);
    return null;
  }
}

async function buildFallbackAvailability({ date, guests }) {
  const config = await loadFallbackConfig();
  const fallbackTimezone = (config && config.timezone) || 'Europe/Vienna';
  const defaultCapacity = Number(config?.max_guests_per_reservation) || 20;

  const parsedDate = parseDateKey(date);
  if (!parsedDate) {
    return { date, timezone: fallbackTimezone, slots: [] };
  }

  const dayKey = WEEKDAY_KEYS[parsedDate.getUTCDay()];
  const opening = config?.opening_hours?.[dayKey];

  if (!opening || opening.open === false) {
    return { date, timezone: fallbackTimezone, slots: [] };
  }

  const slots = (opening.slots || []).map((slot) => {
    const slotCapacity = Number(slot.capacity || slot.max_guests || opening.max_guests || defaultCapacity);
    const remaining = Math.max(slotCapacity, 0);
    const fits = guests ? remaining >= Number(guests) : remaining > 0;
    return {
      time: slot.time,
      capacity: slotCapacity,
      reserved: 0,
      remaining,
      waitlist: remaining === 0,
      fits
    };
  });

  return { date, timezone: fallbackTimezone, slots };
}

// CMS Blockierungen laden - MUSS VOR handler definiert werden
async function loadCMSBlockedReservations(date) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(process.cwd(), 'content', 'blocked-reservations', `${date}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Datei existiert nicht - das ist OK
      return [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der CMS-Blockierungen:', error);
    return [];
  }
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
    return createResponse(405, { message: 'Methode nicht erlaubt' });
  }

  const { date, guests } = event.queryStringParameters || {};

  if (!date) {
    return createResponse(400, { message: 'Datum erforderlich' });
  }

  try {
    const availability = await getAvailability({
      date,
      guests: guests ? parseInt(guests, 10) : null
    });

    // CMS Blockierungen laden und anwenden
    const cmsBlocked = await loadCMSBlockedReservations(date);

    if (Array.isArray(cmsBlocked) && cmsBlocked.length > 0) {
      availability.slots = (availability.slots || []).map((slot) => {
        const block = cmsBlocked.find((entry) => entry.time === slot.time);
        if (block) {
          const blockedSeats = Number(block.blocked_seats || 0);
          if (blockedSeats > 0) {
            const originalCapacity = Number(slot.capacity || 0);
            const remaining = Number(slot.remaining ?? originalCapacity - Number(slot.reserved || 0));
            slot.capacity = Math.max(0, originalCapacity - blockedSeats);
            slot.remaining = Math.max(0, remaining - blockedSeats);
            slot.cmsBlocked = true;
            if (block.reason) {
              slot.blockReason = block.reason;
            }
          }
        }
        return slot;
      });
    }

    return createResponse(200, availability);
  } catch (error) {
    if (error && (error.name === 'MissingBlobsEnvironmentError' || error.message?.includes('Netlify Blobs'))) {
      console.warn('Netlify Blobs Umgebung fehlt – nutze statische Fallback-Verfügbarkeit.');
      const fallback = await buildFallbackAvailability({ date, guests: guests ? parseInt(guests, 10) : null });
      return createResponse(200, fallback);
    }

    console.error('Fehler in get-availability:', error);
    console.error('Stack trace:', error.stack); // Mehr Debug-Info
    return createResponse(500, {
      message: 'Interner Server Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
