const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function parseMetadataFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (ext === '.md' || ext === '.markdown') {
      const { data } = matter(raw);
      return data || {};
    }
    if (ext === '.json') {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.warn(`Unable to parse metadata file ${filePath}:`, error.message);
  }
  return {};
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const normalized = trimmed.replace(/\\/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime()) ? value.toISOString() : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readMenuDirectory() {
  const menuDir = path.join(process.cwd(), 'content', 'menu');
  const result = {
    pdfPath: null,
    metadata: {},
  };

  if (!fs.existsSync(menuDir)) {
    return result;
  }

  const entries = fs.readdirSync(menuDir);
  entries.forEach((entry) => {
    const fullPath = path.join(menuDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      return;
    }

    const ext = path.extname(entry).toLowerCase();
    if (ext === '.pdf' && entry.toLowerCase() === 'menu.pdf') {
      result.pdfPath = fullPath;
      return;
    }

    if (['.md', '.markdown', '.json'].includes(ext)) {
      result.metadata = {
        ...result.metadata,
        ...parseMetadataFile(fullPath),
      };
    }
  });

  if (!result.pdfPath && result.metadata.menu_file) {
    const potentialPath = path.join(process.cwd(), result.metadata.menu_file.replace(/^\//, ''));
    if (fs.existsSync(potentialPath)) {
      result.pdfPath = potentialPath;
    }
  }

  return result;
}

function readLegacyMenu() {
  const legacyDir = path.join(process.cwd(), 'content', 'menu-pdf');
  if (!fs.existsSync(legacyDir)) {
    return null;
  }

  const files = fs.readdirSync(legacyDir).filter((file) => file.endsWith('.md'));
  if (files.length === 0) {
    return null;
  }

  const menus = files.map((file) => {
    const filePath = path.join(legacyDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);
    return data || {};
  }).filter((menu) => menu && menu.active !== false);

  if (menus.length === 0) {
    return null;
  }

  const latestMenu = menus.sort((a, b) => {
    const dateA = new Date(a.upload_date || a.date || 0).getTime();
    const dateB = new Date(b.upload_date || b.date || 0).getTime();
    return dateB - dateA;
  })[0];

  if (!latestMenu || !latestMenu.pdf_file) {
    return null;
  }

  return {
    pdfUrl: normalizeUrl(latestMenu.pdf_file),
    name: latestMenu.name || latestMenu.title || 'PDF Speisekarte',
    description: latestMenu.description || '',
    uploadDate: toIsoString(latestMenu.upload_date || latestMenu.date),
  };
}

exports.handler = async () => {
  try {
    const menuDirectory = readMenuDirectory();
    let pdfUrl = normalizeUrl(menuDirectory.metadata.menu_file || menuDirectory.metadata.pdf_url);

    if (!pdfUrl && menuDirectory.pdfPath) {
      const relativePath = path.relative(process.cwd(), menuDirectory.pdfPath).replace(/\\/g, '/');
      pdfUrl = normalizeUrl(relativePath) || normalizeUrl('/content/menu/menu.pdf');
    }

    let uploadDate = toIsoString(menuDirectory.metadata.date || menuDirectory.metadata.upload_date);
    if (!uploadDate && menuDirectory.pdfPath) {
      const stats = fs.statSync(menuDirectory.pdfPath);
      uploadDate = toIsoString(stats.mtime);
    }

    const payload = {
      url: pdfUrl,
      pdf_url: pdfUrl,
      name: menuDirectory.metadata.name || menuDirectory.metadata.title || 'PDF Speisekarte',
      description: menuDirectory.metadata.description || '',
      upload_date: uploadDate,
      timestamp: new Date().toISOString(),
    };

    if (!pdfUrl) {
      const legacy = readLegacyMenu();
      if (legacy) {
        payload.url = legacy.pdfUrl;
        payload.pdf_url = legacy.pdfUrl;
        payload.name = legacy.name;
        payload.description = legacy.description;
        payload.upload_date = legacy.uploadDate;
      }
    }

    if (!payload.pdf_url) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Kein PDF-Menü verfügbar',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    console.error('Error fetching menu PDF:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Fehler beim Laden des PDF-Menüs',
        details: error.message,
      }),
    };
  }
};
