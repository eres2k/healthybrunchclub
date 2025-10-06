'use strict';

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
    console.error('Fehler in get-availability:', error);
    console.error('Stack trace:', error.stack); // Mehr Debug-Info
    return createResponse(500, { 
      message: 'Interner Server Fehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
