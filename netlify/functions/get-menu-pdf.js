/**
 * Get Menu PDF API
 *
 * Returns information about available menu PDFs.
 * PDF standardization happens at build time via scripts/process-menu-pdfs.js
 */

const fs = require('fs');
const path = require('path');

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Standard public paths for all menu PDFs
const MENU_PATHS = {
  main: '/content/HBC_DE_MENU.pdf',
  english: '/content/HBC_EN_MENU.pdf',
  kids: '/content/HBC_KIDS_MENU.pdf',
  lasa: '/content/LASA_DE_MENU.PDF'
};

function loadConfig() {
  const configPath = path.join(process.cwd(), 'content', 'menu-pdf-config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return raw.trim() ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to parse menu-pdf-config.json:', error.message);
    return null;
  }
}

function checkPdfExists(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) return false;

  const stats = fs.statSync(fullPath);
  return stats.size > 100; // Must be more than 100 bytes to be valid
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const config = loadConfig();

    if (!config || config.active === false) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Kein aktives PDF-Menü verfügbar',
          menus: null
        })
      };
    }

    // Build response with available menus
    const menus = {
      main: checkPdfExists(MENU_PATHS.main)
        ? { url: MENU_PATHS.main, label: 'Speisekarte' }
        : null,
      english: checkPdfExists(MENU_PATHS.english)
        ? { url: MENU_PATHS.english, label: 'English Menu' }
        : null,
      kids: checkPdfExists(MENU_PATHS.kids)
        ? { url: MENU_PATHS.kids, label: 'Kinderkarte' }
        : null,
      lasa: checkPdfExists(MENU_PATHS.lasa)
        ? { url: MENU_PATHS.lasa, label: 'LASA Menu' }
        : null
    };

    // Main response (for backward compatibility)
    const response = {
      name: config.title || 'Speisekarte PDF',
      description: config.description || '',
      pdf_url: MENU_PATHS.main,
      upload_date: config.last_updated || null,
      version: config.version || null,
      active: config.active !== false,
      menus
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in get-menu-pdf:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Fehler beim Laden der Menü-Informationen',
        details: error.message
      })
    };
  }
};
