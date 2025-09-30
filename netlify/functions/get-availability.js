'use strict';

const path = require('path');
const fs = require('fs').promises;
const { getAvailability } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Methode nicht erlaubt' })
    };
  }

  const { date, guests } = event.queryStringParameters || {};

  if (!date) {
    return {
      statusCode: 400,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Datum erforderlich' })
    };
  }

  try {
    const availability = await getAvailability({
      date,
      guests: guests ? Number.parseInt(guests, 10) : null
    });

    const cmsBlocked = await loadCMSBlockedReservations(date);

    if (Array.isArray(cmsBlocked) && cmsBlocked.length > 0) {
      availability.slots = availability.slots.map((slot) => {
        const cmsBlock = cmsBlocked.find((block) => block.time === slot.time);
        if (cmsBlock) {
          const blockedSeats = Number(cmsBlock.blocked_seats || 0);
          slot.capacity = Math.max(0, slot.capacity - blockedSeats);
          slot.remaining = Math.max(0, slot.remaining - blockedSeats);
          slot.cmsBlocked = true;
          slot.blockReason = cmsBlock.reason;
        }
        return slot;
      });
    }

    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(availability)
    };
  } catch (error) {
    console.error('Fehler in get-availability:', error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ message: 'Interner Server Fehler' })
    };
  }
};

async function loadCMSBlockedReservations(date) {
  try {
    const filePath = path.join(process.cwd(), 'content', 'blocked-reservations', `${date}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`CMS-Blockierungsdatei konnte nicht gelesen werden (${date}):`, error);
      }
      return [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der CMS-Blockierungen:', error);
    return [];
  }
}
