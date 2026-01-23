'use strict';

const { readJSON, writeJSON } = require('./blob-storage');

const STORE_NAME = 'chatbotSpam';

// Rate limiting config
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

// Spam patterns (regex)
const SPAM_PATTERNS = [
  /(?:https?:\/\/|www\.)[^\s]+/gi, // URLs
  /(?:buy|sell|click|subscribe|discount|free|winner|lottery|casino|viagra|crypto|bitcoin|nft)/gi,
  /(?:make\s+money|earn\s+\$|act\s+now|limited\s+time)/gi,
  /[A-Z]{10,}/g, // Excessive caps (10+ consecutive caps)
  /(.)\1{5,}/g, // Repeated characters (6+ same char)
  /[\u0400-\u04FF]{20,}/g, // Long Cyrillic text (potential spam)
];

// Abuse patterns that warrant immediate block
const ABUSE_PATTERNS = [
  /(?:fuck|shit|ass|bitch|dick|cock|cunt|nigger|faggot)/gi,
  /(?:kill|murder|bomb|terrorist|attack)/gi,
];

function getClientIp(event) {
  return event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['x-real-ip'] ||
         event.headers['client-ip'] ||
         'unknown';
}

function normalizeMessage(message) {
  return message.toLowerCase().trim();
}

function detectSpamPatterns(message) {
  const normalized = normalizeMessage(message);
  const matches = [];

  for (const pattern of SPAM_PATTERNS) {
    const match = normalized.match(pattern);
    if (match && match.length > 0) {
      matches.push({ pattern: pattern.source, count: match.length });
    }
  }

  return matches;
}

function detectAbusePatterns(message) {
  const normalized = normalizeMessage(message);

  for (const pattern of ABUSE_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

async function getRateLimitData(ip) {
  const key = `rate:${ip}`;
  const data = await readJSON(STORE_NAME, key, {
    requests: [],
    blocked: false,
    blockedUntil: null,
    spamScore: 0
  });
  return data;
}

async function updateRateLimitData(ip, data) {
  const key = `rate:${ip}`;
  await writeJSON(STORE_NAME, key, data);
}

async function checkSpamFilter(event, message) {
  const ip = getClientIp(event);
  const now = Date.now();

  // Get existing data
  const data = await getRateLimitData(ip);

  // Check if currently blocked
  if (data.blocked && data.blockedUntil > now) {
    const remainingMinutes = Math.ceil((data.blockedUntil - now) / 60000);
    return {
      allowed: false,
      reason: 'rate_limited',
      message: `Zu viele Anfragen. Bitte warte ${remainingMinutes} Minuten.`,
      ip
    };
  }

  // Reset block if expired
  if (data.blocked && data.blockedUntil <= now) {
    data.blocked = false;
    data.blockedUntil = null;
    data.spamScore = Math.max(0, data.spamScore - 5); // Decay score
  }

  // Check for abuse patterns (immediate block)
  if (detectAbusePatterns(message)) {
    data.blocked = true;
    data.blockedUntil = now + BLOCK_DURATION_MS * 2; // Double block for abuse
    data.spamScore += 20;
    await updateRateLimitData(ip, data);

    return {
      allowed: false,
      reason: 'abuse',
      message: 'Diese Nachricht enthält unangemessene Inhalte.',
      ip
    };
  }

  // Check for spam patterns
  const spamMatches = detectSpamPatterns(message);
  if (spamMatches.length > 0) {
    const spamIncrease = spamMatches.reduce((sum, m) => sum + m.count, 0);
    data.spamScore += spamIncrease;

    if (data.spamScore >= 10) {
      data.blocked = true;
      data.blockedUntil = now + BLOCK_DURATION_MS;
      await updateRateLimitData(ip, data);

      return {
        allowed: false,
        reason: 'spam',
        message: 'Spam erkannt. Bitte stelle Fragen zu unserem Essen und unseren Terminen.',
        ip
      };
    }
  }

  // Clean old requests outside window
  data.requests = data.requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  // Check rate limit
  if (data.requests.length >= MAX_REQUESTS_PER_WINDOW) {
    data.blocked = true;
    data.blockedUntil = now + BLOCK_DURATION_MS;
    await updateRateLimitData(ip, data);

    return {
      allowed: false,
      reason: 'rate_limited',
      message: 'Zu viele Anfragen. Bitte warte einen Moment.',
      ip
    };
  }

  // Add current request
  data.requests.push(now);

  // Decay spam score over time
  if (data.spamScore > 0) {
    data.spamScore = Math.max(0, data.spamScore - 0.5);
  }

  await updateRateLimitData(ip, data);

  return {
    allowed: true,
    reason: null,
    message: null,
    ip,
    requestCount: data.requests.length,
    spamScore: data.spamScore
  };
}

async function logSpamAttempt(ip, message, reason) {
  const key = `log:${new Date().toISOString().split('T')[0]}`;
  const log = await readJSON(STORE_NAME, key, []);

  log.push({
    timestamp: new Date().toISOString(),
    ip,
    reason,
    messagePreview: message.substring(0, 100)
  });

  // Keep only last 100 entries per day
  if (log.length > 100) {
    log.splice(0, log.length - 100);
  }

  await writeJSON(STORE_NAME, key, log);
}

module.exports = {
  checkSpamFilter,
  logSpamAttempt,
  getClientIp,
  detectSpamPatterns,
  detectAbusePatterns
};
