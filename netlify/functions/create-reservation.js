const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');
const {
  calculateAvailability,
  loadReservationsForDate,
  generateConfirmationCode,
  validateAustrianPhone
} = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email-service');
const BlobStorage = require('./utils/blob-storage');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // Sanitize and validate inputs
    const reservation = {
      id: uuidv4(),
      confirmationCode: generateConfirmationCode(),
      date: validator.isDate(body.date) ? body.date : null,
      time: validator.matches(body.time, /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) ? body.time : null,
      guests: validator.isInt(body.guests + '', { min: 1, max: 20 }) ? parseInt(body.guests) : null,
      name: sanitizeHtml(body.name, { allowedTags: [], allowedAttributes: {} }),
      email: validator.isEmail(body.email) ? validator.normalizeEmail(body.email) : null,
      phone: body.phone,
      specialRequests: sanitizeHtml(body.specialRequests || '', { allowedTags: [], allowedAttributes: {} }),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ip: event.headers['x-forwarded-for'] || event.headers['client-ip']
    };

    // Validate required fields
    if (!reservation.date || !reservation.time || !reservation.guests || 
        !reservation.name || !reservation.email || !reservation.phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' })
      };
    }

    // Validate phone number
    if (!validateAustrianPhone(reservation.phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Bitte geben Sie eine gültige österreichische Telefonnummer ein.' })
      };
    }

    // Rate limiting check
    const rateLimiter = new BlobStorage('rate-limits');
    const rateLimitKey = `ip-${reservation.ip}-${new Date().toISOString().slice(0, 13)}`; // Per hour
    const attempts = await rateLimiter.get(rateLimitKey) || 0;
    
    if (attempts >= 5) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' })
      };
    }

    // Load existing reservations and check availability
    const existingReservations = await loadReservationsForDate(reservation.date);
    const availability = await calculateAvailability(reservation.date, existingReservations);
    
    const selectedSlot = availability.slots.find(s => s.time === reservation.time);
    
    if (!selectedSlot || selectedSlot.remainingCapacity < reservation.guests) {
      // Check if we should add to waitlist
      if (selectedSlot && selectedSlot.waitlist) {
        reservation.status = 'waitlist';
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Dieser Zeitpunkt ist leider nicht mehr verfügbar.',
            alternativeSlots: availability.slots.filter(s => s.available).slice(0, 3)
          })
        };
      }
    } else {
      reservation.status = 'confirmed';
    }

    // Save reservation using atomic operation to prevent double-booking
    const storage = new BlobStorage('reservations');
    await storage.atomic(
      `date-${reservation.date}`,
      async (current) => {
        // Re-check availability inside atomic operation
        const currentAvailability = await calculateAvailability(reservation.date, current);
        const slot = currentAvailability.slots.find(s => s.time === reservation.time);
        
        if (!slot || (slot.remainingCapacity < reservation.guests && reservation.status === 'confirmed')) {
          throw new Error('Slot no longer available');
        }
        
        return [...current, reservation];
      }
    );

    // Update rate limit
    await rateLimiter.set(rateLimitKey, attempts + 1);

    // Send confirmation emails
    try {
      await sendReservationEmails(reservation);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue - reservation is saved
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        confirmationCode: reservation.confirmationCode,
        reservation: {
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          name: reservation.name,
          status: reservation.status
        },
        message: reservation.status === 'waitlist' 
          ? 'Sie wurden auf die Warteliste gesetzt. Wir kontaktieren Sie, falls ein Platz frei wird.'
          : 'Ihre Reservierung wurde bestätigt!'
      })
    };

  } catch (error) {
    console.error('Reservation error:', error);
    
    if (error.message === 'Slot no longer available') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Dieser Zeitpunkt wurde gerade von einem anderen Gast gebucht. Bitte wählen Sie einen anderen Zeitpunkt.' })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.' })
    };
  }
};
