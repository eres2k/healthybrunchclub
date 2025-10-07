'use strict';

const { randomUUID } = require('crypto');
const { getStore } = require('@netlify/blobs');

const STORE_NAMES = {
  reservations: 'reservations',
  blockedDates: 'blocked-dates',
  settings: 'settings',
  rateLimits: 'rate-limits',
  emailLog: 'email-log',
  locks: 'locks'
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_MS = 150;

const storeCache = new Map();

function getBlobStore(name) {
  if (!STORE_NAMES[name]) {
    throw new Error(`Unbekannter Store: ${name}`);
  }

  if (!storeCache.has(name)) {
    storeCache.set(name, getStore({ name: STORE_NAMES[name] }));
  }

  return storeCache.get(name);
}

async function readJSON(storeName, key, fallback = null) {
  const store = getBlobStore(storeName);
  try {
    const payload = await store.get(key, { type: 'json' });
    if (payload === null || payload === undefined) {
      return fallback;
    }
    return payload;
  } catch (error) {
    if (error?.status === 404) {
      return fallback;
    }
    throw error;
  }
}

async function writeJSON(storeName, key, value, metadata = {}) {
  const store = getBlobStore(storeName);
  await store.set(key, JSON.stringify(value), {
    metadata: { contentType: 'application/json', ...metadata }
  });
}

async function deleteKey(storeName, key) {
  const store = getBlobStore(storeName);
  await store.delete(key);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireLock(lockKey, { timeoutMs = DEFAULT_TIMEOUT_MS, retryMs = DEFAULT_RETRY_MS } = {}) {
  const lockStore = getBlobStore('locks');
  const token = randomUUID();
  const expiresAt = Date.now() + timeoutMs;

  while (Date.now() < expiresAt) {
    let currentValue = null;
    try {
      currentValue = await lockStore.get(lockKey, { type: 'text' });
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    if (!currentValue) {
      await lockStore.set(lockKey, token, {
        metadata: {
          contentType: 'text/plain',
          acquiredAt: new Date().toISOString()
        }
      });
      const storedToken = await lockStore.get(lockKey, { type: 'text' });
      if (storedToken === token) {
        return token;
      }
    }
    await delay(retryMs);
  }

  throw new Error('Konnte Sperre nicht erwerben. Bitte erneut versuchen.');
}

async function releaseLock(lockKey, token) {
  const lockStore = getBlobStore('locks');
  let storedToken = null;
  try {
    storedToken = await lockStore.get(lockKey, { type: 'text' });
  } catch (error) {
    if (error?.status === 404) {
      return;
    }
    throw error;
  }
  if (storedToken === token) {
    await lockStore.delete(lockKey);
  }
}

async function withLock(lockKey, handler, options = {}) {
  const token = await acquireLock(lockKey, options);
  try {
    return await handler();
  } finally {
    await releaseLock(lockKey, token);
  }
}

module.exports = {
  STORE_NAMES,
  getBlobStore,
  readJSON,
  writeJSON,
  deleteKey,
  withLock
};
