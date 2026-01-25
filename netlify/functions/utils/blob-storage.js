'use strict';

const { randomUUID } = require('crypto');
const { getStore } = require('@netlify/blobs');

const STORE_NAMES = {
  reservations: 'reservations',
  blockedDates: 'blocked-dates',
  settings: 'settings',
  rateLimits: 'rate-limits',
  emailLog: 'email-log',
  locks: 'locks',
  chatbotSpam: 'chatbot-spam',
  chatbotLogs: 'chatbot-logs'
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_MS = 150;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const storeCache = new Map();

/**
 * Retry wrapper for blob operations with exponential backoff
 */
async function withRetry(operation, operationName, maxRetries = MAX_RETRIES) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on 404 errors - these are expected "not found" responses
      if (error?.status === 404) {
        throw error;
      }

      // Don't retry on 401/403 - authentication issues won't resolve with retry
      if (error?.status === 401 || error?.status === 403) {
        throw error;
      }

      const isLastAttempt = attempt === maxRetries;
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // exponential backoff

      console.warn(`[${operationName}] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (!isLastAttempt) {
        console.log(`[${operationName}] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`[${operationName}] All ${maxRetries} attempts failed`);
  throw lastError;
}

function getBlobStore(name) {
  if (!STORE_NAMES[name]) {
    throw new Error(`Unbekannter Store: ${name}`);
  }

  if (!storeCache.has(name)) {
    const storeConfig = { name: STORE_NAMES[name] };

    // Support manual configuration when automatic Netlify context detection fails
    // This is needed for local development or when environment isn't fully configured
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
      storeConfig.siteID = process.env.NETLIFY_SITE_ID;
      storeConfig.token = process.env.NETLIFY_AUTH_TOKEN;
    }

    storeCache.set(name, getStore(storeConfig));
  }

  return storeCache.get(name);
}

async function readJSON(storeName, key, fallback = null) {
  const store = getBlobStore(storeName);
  try {
    const payload = await withRetry(
      () => store.get(key, { type: 'json' }),
      `readJSON(${storeName}/${key})`
    );
    if (payload === null || payload === undefined) {
      return fallback;
    }
    return payload;
  } catch (error) {
    if (error?.status === 404) {
      return fallback;
    }
    // Log the error for debugging but don't throw - return fallback instead
    // This ensures the dashboard still loads even if blob storage is unavailable
    console.error(`[readJSON] Error reading ${storeName}/${key} after retries:`, error.message);
    return fallback;
  }
}

async function writeJSON(storeName, key, value, metadata = {}) {
  const store = getBlobStore(storeName);
  await withRetry(
    () => store.set(key, JSON.stringify(value), {
      metadata: { contentType: 'application/json', ...metadata }
    }),
    `writeJSON(${storeName}/${key})`
  );
}

async function deleteKey(storeName, key) {
  const store = getBlobStore(storeName);
  await store.delete(key);
}

async function listKeys(storeName, prefix = '') {
  try {
    const store = getBlobStore(storeName);
    const result = await withRetry(
      () => store.list({ prefix }),
      `listKeys(${storeName}, prefix=${prefix})`
    );
    const keys = result.blobs ? result.blobs.map(blob => blob.key) : [];
    console.log(`[listKeys] Store: ${storeName}, prefix: ${prefix}, found ${keys.length} keys`);
    return keys;
  } catch (error) {
    console.error(`[listKeys] Error listing keys in store ${storeName} with prefix ${prefix} after retries:`, error.message);
    return [];
  }
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
  listKeys,
  withLock
};
