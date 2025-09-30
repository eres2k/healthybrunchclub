const assert = require('assert');
const {
  generateTimeSlots,
  calculateAvailability,
  validateAustrianPhone,
  generateConfirmationCode
} = require('./netlify/functions/utils/reservation-utils');

(async () => {
  // Test time slots generation
  const slots = generateTimeSlots('2024-08-01');
  assert(slots.length > 0, 'Time slots should be generated');
  assert(slots[0] === '09:00', 'First slot should start at 09:00');
  assert(slots.includes('20:45'), 'Last slot before closing should be present');

  // Test phone validation
  assert(validateAustrianPhone('+436641234567'), 'Valid Austrian mobile number should pass');
  assert(validateAustrianPhone('06641234567'), 'Valid Austrian local number should pass');
  assert(!validateAustrianPhone('12345'), 'Invalid number should fail');

  // Test confirmation code uniqueness and format
  const code = generateConfirmationCode();
  assert(code.startsWith('HBC'), 'Confirmation code should start with HBC');
  assert(code.length > 6, 'Confirmation code should be sufficiently long');

  // Test availability calculation with existing reservations
  const availability = await calculateAvailability('2024-08-10', [
    { id: '1', time: '09:00', guests: 4, status: 'confirmed' },
    { id: '2', time: '09:00', guests: 10, status: 'confirmed' },
    { id: '3', time: '09:00', guests: 2, status: 'waitlist' }
  ]);
  const nineAmSlot = availability.slots.find(s => s.time === '09:00');
  assert(nineAmSlot.remainingCapacity === (parseInt(process.env.MAX_CAPACITY_PER_SLOT || '40') - 14), 'Capacity should consider only confirmed guests');
  assert(nineAmSlot.waitlist === false || nineAmSlot.remainingCapacity <= 0, 'Waitlist flag should be correct');

  console.log('Reservation system tests passed successfully.');
})().catch(error => {
  console.error('Reservation system tests failed:', error);
  process.exit(1);
});
