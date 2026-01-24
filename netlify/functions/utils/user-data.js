'use strict';

/**
 * Extracts user data from the request event
 * - IP address
 * - Geolocation (country, city, region) from Netlify headers
 * - OS and browser from User-Agent
 */

function getClientIp(event) {
  return event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['x-real-ip'] ||
         event.headers['client-ip'] ||
         event.headers['x-nf-client-connection-ip'] ||
         'unknown';
}

function getGeolocation(event) {
  const headers = event.headers || {};

  // Netlify provides geo data in these headers
  const country = headers['x-country'] || headers['x-nf-country'] || null;
  const city = headers['x-city'] || headers['x-nf-city'] || null;
  const region = headers['x-region'] || headers['x-nf-region'] || null;

  // Try to parse x-nf-geo header if available (contains JSON)
  let nfGeo = null;
  if (headers['x-nf-geo']) {
    try {
      nfGeo = JSON.parse(headers['x-nf-geo']);
    } catch (e) {
      // Ignore parse errors
    }
  }

  return {
    country: nfGeo?.country?.code || country || null,
    countryName: nfGeo?.country?.name || getCountryName(country) || null,
    city: nfGeo?.city || city || null,
    region: nfGeo?.subdivision?.name || region || null,
    timezone: nfGeo?.timezone || null
  };
}

function parseUserAgent(event) {
  const ua = event.headers['user-agent'] || '';

  return {
    os: detectOS(ua),
    browser: detectBrowser(ua),
    device: detectDevice(ua),
    raw: ua.substring(0, 200) // Store first 200 chars of raw UA
  };
}

function detectOS(ua) {
  const uaLower = ua.toLowerCase();

  // Mobile OS detection first (more specific)
  if (/iphone|ipad|ipod/.test(uaLower)) {
    const match = ua.match(/OS (\d+[._]\d+)/);
    const version = match ? match[1].replace('_', '.') : '';
    if (/ipad/.test(uaLower)) return `iPadOS${version ? ' ' + version : ''}`;
    return `iOS${version ? ' ' + version : ''}`;
  }

  if (/android/.test(uaLower)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    const version = match ? match[1] : '';
    return `Android${version ? ' ' + version : ''}`;
  }

  // Desktop OS
  if (/windows nt 10/.test(uaLower)) return 'Windows 10/11';
  if (/windows nt 6\.3/.test(uaLower)) return 'Windows 8.1';
  if (/windows nt 6\.2/.test(uaLower)) return 'Windows 8';
  if (/windows nt 6\.1/.test(uaLower)) return 'Windows 7';
  if (/windows/.test(uaLower)) return 'Windows';

  if (/mac os x/.test(uaLower)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    const version = match ? match[1].replace('_', '.') : '';
    return `macOS${version ? ' ' + version : ''}`;
  }

  if (/cros/.test(uaLower)) return 'Chrome OS';
  if (/linux/.test(uaLower)) return 'Linux';
  if (/ubuntu/.test(uaLower)) return 'Ubuntu';

  return 'Unknown';
}

function detectBrowser(ua) {
  const uaLower = ua.toLowerCase();

  // Order matters - check more specific patterns first
  if (/edg\//.test(uaLower)) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge${match ? ' ' + match[1] : ''}`;
  }

  if (/opr\/|opera/.test(uaLower)) {
    const match = ua.match(/OPR\/(\d+)/);
    return `Opera${match ? ' ' + match[1] : ''}`;
  }

  if (/firefox\//.test(uaLower)) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox${match ? ' ' + match[1] : ''}`;
  }

  if (/samsungbrowser/.test(uaLower)) {
    const match = ua.match(/SamsungBrowser\/(\d+)/);
    return `Samsung Browser${match ? ' ' + match[1] : ''}`;
  }

  // Safari detection (must come before Chrome, as Chrome also includes "Safari")
  if (/safari\//.test(uaLower) && !/chrome|chromium|crios/.test(uaLower)) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari${match ? ' ' + match[1] : ''}`;
  }

  // Chrome/Chromium variants
  if (/crios/.test(uaLower)) {
    const match = ua.match(/CriOS\/(\d+)/);
    return `Chrome iOS${match ? ' ' + match[1] : ''}`;
  }

  if (/chrome\//.test(uaLower)) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome${match ? ' ' + match[1] : ''}`;
  }

  // Mobile apps / WebViews
  if (/instagram/.test(uaLower)) return 'Instagram App';
  if (/fban|fbav/.test(uaLower)) return 'Facebook App';
  if (/twitter/.test(uaLower)) return 'Twitter App';
  if (/snapchat/.test(uaLower)) return 'Snapchat App';
  if (/tiktok/.test(uaLower)) return 'TikTok App';

  return 'Unknown';
}

function detectDevice(ua) {
  const uaLower = ua.toLowerCase();

  if (/iphone/.test(uaLower)) return 'iPhone';
  if (/ipad/.test(uaLower)) return 'iPad';
  if (/ipod/.test(uaLower)) return 'iPod';

  if (/android/.test(uaLower)) {
    if (/mobile/.test(uaLower)) return 'Android Phone';
    if (/tablet/.test(uaLower)) return 'Android Tablet';
    return 'Android Device';
  }

  if (/mobile|phone/.test(uaLower)) return 'Mobile';
  if (/tablet/.test(uaLower)) return 'Tablet';

  return 'Desktop';
}

// Common country codes to names
function getCountryName(code) {
  if (!code) return null;

  const countries = {
    'AT': 'Österreich',
    'DE': 'Deutschland',
    'CH': 'Schweiz',
    'US': 'USA',
    'GB': 'Großbritannien',
    'FR': 'Frankreich',
    'IT': 'Italien',
    'ES': 'Spanien',
    'NL': 'Niederlande',
    'BE': 'Belgien',
    'PL': 'Polen',
    'CZ': 'Tschechien',
    'HU': 'Ungarn',
    'SK': 'Slowakei',
    'SI': 'Slowenien',
    'HR': 'Kroatien',
    'RO': 'Rumänien',
    'BG': 'Bulgarien',
    'SE': 'Schweden',
    'NO': 'Norwegen',
    'DK': 'Dänemark',
    'FI': 'Finnland',
    'PT': 'Portugal',
    'GR': 'Griechenland',
    'TR': 'Türkei',
    'RU': 'Russland',
    'UA': 'Ukraine',
    'JP': 'Japan',
    'CN': 'China',
    'KR': 'Südkorea',
    'IN': 'Indien',
    'AU': 'Australien',
    'CA': 'Kanada',
    'BR': 'Brasilien',
    'MX': 'Mexiko',
    'AR': 'Argentinien'
  };

  return countries[code.toUpperCase()] || code;
}

/**
 * Extracts all user data from the request event
 */
function extractUserData(event) {
  const ip = getClientIp(event);
  const geo = getGeolocation(event);
  const userAgent = parseUserAgent(event);

  return {
    ip: ip !== 'unknown' ? ip : null,
    country: geo.country,
    countryName: geo.countryName,
    city: geo.city,
    region: geo.region,
    timezone: geo.timezone,
    os: userAgent.os,
    browser: userAgent.browser,
    device: userAgent.device
  };
}

module.exports = {
  extractUserData,
  getClientIp,
  getGeolocation,
  parseUserAgent
};
