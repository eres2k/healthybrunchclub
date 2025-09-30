#!/usr/bin/env node
/* eslint-disable no-console */
const fetchFn = (...args) => {
  if (typeof fetch === 'function') {
    return fetch(...args);
  }
  return import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};

async function main() {
  const base = process.env.NETLIFY_DEV_URL || 'http://localhost:8888';
  const today = new Date().toISOString().split('T')[0];

  console.log('Prüfe Verfügbarkeit für', today);
  const availability = await fetchFn(`${base}/.netlify/functions/get-availability?date=${today}`).then((res) => res.json());
  console.log('Slots:', availability.slots?.length || 0);

  if (!availability.slots?.length) {
    console.log('Keine Slots verfügbar – Test beendet.');
    return;
  }

  const slot = availability.slots.find((entry) => entry.remaining > 0) || availability.slots[0];
  const payload = {
    date: today,
    time: slot.time,
    guests: 2,
    name: 'Test Gast',
    email: 'gast@example.com',
    phone: '+43 660 0000000'
  };

  console.log('Sende Testreservierung…');
  const reservation = await fetchFn(`${base}/.netlify/functions/create-reservation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then((res) => res.json());

  console.log('Antwort:', reservation);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
