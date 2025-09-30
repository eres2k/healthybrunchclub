'use strict';

const { DateTime } = require('luxon');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?43\s?\d{1,4}[\s\/-]?\d{3,12}$/;

/**
 * Bereinigt Texteingaben von potenziell gefährlichen Zeichen.
 * @param {string} value
 * @returns {string}
 */
function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Prüft, ob eine E-Mail-Adresse gültig ist.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * Prüft, ob eine Telefonnummer dem österreichischen Format entspricht.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  return PHONE_REGEX.test(phone.replace(/\s+/g, ''));
}

/**
 * Überprüft das Reservierungspayload.
 * @param {object} payload
 * @returns {{valid: boolean, errors: Record<string,string>, data: object}}
 */
function validateReservationPayload(payload) {
  const errors = {};
  const data = { ...payload };

  data.name = sanitizeText(payload.name);
  data.email = sanitizeText(payload.email).toLowerCase();
  data.phone = sanitizeText(payload.phone || '');
  data.specialRequests = sanitizeText(payload.specialRequests || '');
  data.honeypot = sanitizeText(payload.honeypot || '');

  if (!data.name) {
    errors.name = 'Bitte geben Sie Ihren Namen ein.';
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Bitte geben Sie eine gültige österreichische Telefonnummer ein oder lassen Sie das Feld leer.';
  }

  const guests = Number(payload.guests);
  if (!Number.isFinite(guests) || guests <= 0) {
    errors.guests = 'Bitte geben Sie die Anzahl der Gäste an.';
  } else {
    data.guests = guests;
  }

  if (!payload.date || !DateTime.fromISO(payload.date, { zone: payload.timezone || 'Europe/Vienna' }).isValid) {
    errors.date = 'Bitte wählen Sie ein gültiges Datum.';
  } else {
    data.date = payload.date;
  }

  if (!payload.time) {
    errors.time = 'Bitte wählen Sie eine Uhrzeit.';
  } else {
    data.time = payload.time;
  }

  if (data.honeypot) {
    errors.honeypot = 'Ungültige Eingabe.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data
  };
}

module.exports = {
  sanitizeText,
  isValidEmail,
  isValidPhone,
  validateReservationPayload
};
