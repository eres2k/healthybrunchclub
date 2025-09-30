#!/usr/bin/env node
const assert = require('assert');
const {
  generateTimeSlots,
  validateAustrianPhone,
  calculateAvailability
} = require('./netlify/functions/utils/reservation-utils');

(async () => {
  const slots = generateTimeSlots('2024-01-01');
  assert(slots.length > 0, 'Should generate time slots');
  assert.strictEqual(slots[0], '09:00', 'First slot should start at 09:00');

  assert(validateAustrianPhone('+436601234567'), 'Should validate Austrian phone number with +43');
  assert(validateAustrianPhone('06601234567'), 'Should validate Austrian phone number with leading zero');
  assert(!validateAustrianPhone('12345'), 'Should reject invalid number');

  const availability = await calculateAvailability('2024-01-01', []);
  assert(availability.available, 'Availability should be true for empty day');
  console.log('Reservation utilities tests passed.');
})();
