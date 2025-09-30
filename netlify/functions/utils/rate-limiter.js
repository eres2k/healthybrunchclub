'use strict';

const { DateTime } = require('luxon');
const { readJSON, writeJSON, withLock } = require('./blob-storage');

const LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_MAX || 5);
const WINDOW_MINUTES = 60;

async function getBucketKey(ip) {
  return `rate-limit/${ip}`;
}

async function checkRateLimit(ip) {
  const key = await getBucketKey(ip);
  const now = DateTime.utc();
  const cutoff = now.minus({ minutes: WINDOW_MINUTES });

  return withLock(`rate-limit:${ip}`, async () => {
    const entries = await readJSON('rateLimits', key, []);
    const recentEntries = entries
      .filter((timestamp) => DateTime.fromISO(timestamp).diff(cutoff).as('minutes') >= 0)
      .slice(-LIMIT_PER_HOUR);

    if (recentEntries.length >= LIMIT_PER_HOUR) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMinutes: Math.ceil(
          DateTime.fromISO(recentEntries[0]).diff(now, 'minutes').minutes * -1
        ) + WINDOW_MINUTES
      };
    }

    recentEntries.push(now.toISO());
    await writeJSON('rateLimits', key, recentEntries);

    return {
      allowed: true,
      remaining: Math.max(LIMIT_PER_HOUR - recentEntries.length, 0)
    };
  });
}

module.exports = {
  checkRateLimit
};
