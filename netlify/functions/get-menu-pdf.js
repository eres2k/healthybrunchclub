const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const MENU_TYPES = {
  regular: {
    fileName: 'menu.pdf',
    publicPath: '/content/menu.pdf',
    defaultTitle: 'Speisekarte Download',
    defaultButton: 'Speisekarte Download',
    defaultDownload: 'Healthy-Brunch-Club-Speisekarte.pdf'
  },
  kids: {
    fileName: 'kidsmenu.pdf',
    publicPath: '/content/kidsmenu.pdf',
    defaultTitle: 'Kids Menü Download',
    defaultButton: 'Kids Menü Download',
    defaultDownload: 'Healthy-Brunch-Club-Kids-Menu.pdf'
  }
};

const YAML_CONFIG_PATH = path.join(process.cwd(), 'content', 'pdf-menus', 'menu-pdfs.yml');
const BACKUP_LIMIT = 3;

function buildSuccessResponse(menu) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(menu)
  };
}

function buildErrorResponse(statusCode, message, extra = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: message,
      ...extra
    })
  };
}

function resolveContentPath(configuredPath, contentDir) {
  if (!configuredPath) {
    return null;
  }

  if (configuredPath.startsWith('/')) {
    const cleaned = configuredPath.replace(/^\/+/, '');
    return path.join(process.cwd(), cleaned);
  }

  if (configuredPath.startsWith('content/')) {
    return path.join(process.cwd(), configuredPath);
  }

  return path.join(contentDir, configuredPath);
}

async function backupExistingPdf(targetPath, prefix, contentDir) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '-')
    .replace('Z', '');

  const backupName = `${prefix}-backup-${timestamp}.pdf`;
  const backupPath = path.join(contentDir, backupName);

  await fsPromises.rename(targetPath, backupPath);
  await fsPromises.chmod(backupPath, 0o644);
  console.log(`Backed up ${path.basename(targetPath)} to ${backupName}`);

  return backupPath;
}

async function rotateBackups(prefix, contentDir) {
  try {
    const backups = (await fsPromises.readdir(contentDir))
      .filter(name => name.startsWith(`${prefix}-backup-`) && name.endsWith('.pdf'))
      .sort((a, b) => fs.statSync(path.join(contentDir, b)).mtimeMs - fs.statSync(path.join(contentDir, a)).mtimeMs);

    if (backups.length <= BACKUP_LIMIT) {
      return;
    }

    const toRemove = backups.slice(BACKUP_LIMIT);
    await Promise.allSettled(
      toRemove.map(file => fsPromises.unlink(path.join(contentDir, file)))
    );

    if (toRemove.length) {
      console.log(`Removed ${toRemove.length} old ${prefix} menu backups`);
    }
  } catch (error) {
    console.warn('Unable to rotate PDF backups:', error.message);
  }
}

async function standardiseMenuEntry(type, entry = {}, contentDir) {
  const defaults = MENU_TYPES[type];
  const working = { ...entry };
  const expectedPublicPath = defaults.publicPath;
  const targetPath = path.join(contentDir, defaults.fileName);
  const configuredPath = working.file || working.pdf || working.pdf_file;

  let mutated = false;
  let fileChanged = false;

  const sourcePath = resolveContentPath(configuredPath, contentDir);

  if (configuredPath && configuredPath !== expectedPublicPath && sourcePath && fs.existsSync(sourcePath)) {
    if (sourcePath !== targetPath) {
      await backupExistingPdf(targetPath, defaults.fileName.replace('.pdf', ''), contentDir);
      await fsPromises.rename(sourcePath, targetPath);
      await fsPromises.chmod(targetPath, 0o644);
      await rotateBackups(defaults.fileName.replace('.pdf', ''), contentDir);
      fileChanged = true;
      console.log(`Standardised ${type} menu PDF to ${expectedPublicPath}`);
    }
  } else if (!fs.existsSync(targetPath) && sourcePath && fs.existsSync(sourcePath) && sourcePath !== targetPath) {
    await backupExistingPdf(targetPath, defaults.fileName.replace('.pdf', ''), contentDir);
    await fsPromises.rename(sourcePath, targetPath);
    await fsPromises.chmod(targetPath, 0o644);
    await rotateBackups(defaults.fileName.replace('.pdf', ''), contentDir);
    fileChanged = true;
    console.log(`Moved ${type} menu PDF to ${expectedPublicPath}`);
  }

  if (!fs.existsSync(targetPath)) {
    console.warn(`Expected ${type} menu PDF missing at ${targetPath}`);
  }

  if (working.file !== expectedPublicPath) {
    working.file = expectedPublicPath;
    mutated = true;
  }

  if (!working.button_text) {
    working.button_text = defaults.defaultButton;
    mutated = true;
  }

  if (!working.title) {
    working.title = defaults.defaultTitle;
    mutated = true;
  }

  if (!working.download_filename) {
    working.download_filename = defaults.defaultDownload;
    mutated = true;
  }

  if (!Object.prototype.hasOwnProperty.call(working, 'active')) {
    working.active = true;
    mutated = true;
  }

  if (fileChanged || !working.last_updated) {
    working.last_updated = new Date().toISOString();
    mutated = true;
  }

  return { entry: working, mutated };
}

async function ensureYamlConfig() {
  try {
    if (!fs.existsSync(YAML_CONFIG_PATH)) {
      return null;
    }

    await fsPromises.mkdir(path.dirname(YAML_CONFIG_PATH), { recursive: true });

    const raw = await fsPromises.readFile(YAML_CONFIG_PATH, 'utf8');
    const parsed = raw.trim() ? yaml.load(raw) : {};
    const contentDir = path.join(process.cwd(), 'content');

    const updated = { ...parsed };
    let configChanged = false;

    for (const type of Object.keys(MENU_TYPES)) {
      const { entry, mutated } = await standardiseMenuEntry(type, updated[type], contentDir);
      updated[type] = entry;
      configChanged = configChanged || mutated;
    }

    if (configChanged) {
      const yamlContent = yaml.dump(updated, { lineWidth: 120, sortKeys: false });
      await fsPromises.writeFile(YAML_CONFIG_PATH, yamlContent, 'utf8');
    }

    return updated;
  } catch (error) {
    console.error('Failed to process YAML menu config:', error);
    return null;
  }
}

async function backupExistingMenuPdf(menuPdfPath, contentDir) {
  return backupExistingPdf(menuPdfPath, 'menu', contentDir);
}

async function rotateMenuBackups(contentDir) {
  return rotateBackups('menu', contentDir);
}

async function ensureMenuPdfFromConfig() {
  const contentDir = path.join(process.cwd(), 'content');
  const configPath = path.join(contentDir, 'menu-pdf-config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const rawConfig = await fsPromises.readFile(configPath, 'utf8');
    const config = rawConfig.trim() ? JSON.parse(rawConfig) : {};

    const menuPdfPath = path.join(contentDir, MENU_TYPES.regular.fileName);
    const configuredPath = config.pdf_file;
    const hasCustomSource = configuredPath && configuredPath !== MENU_TYPES.regular.publicPath;

    let sourcePath = menuPdfPath;
    if (hasCustomSource) {
      sourcePath = resolveContentPath(configuredPath, contentDir);
    }

    let renamed = false;

    if (hasCustomSource && sourcePath && fs.existsSync(sourcePath)) {
      await backupExistingMenuPdf(menuPdfPath, contentDir);
      await fsPromises.rename(sourcePath, menuPdfPath);
      await fsPromises.chmod(menuPdfPath, 0o644);
      console.log(`Renamed ${configuredPath} to ${MENU_TYPES.regular.publicPath}`);
      renamed = true;
      await rotateMenuBackups(contentDir);
    } else if (!fs.existsSync(menuPdfPath) && sourcePath && fs.existsSync(sourcePath) && sourcePath !== menuPdfPath) {
      await fsPromises.rename(sourcePath, menuPdfPath);
      await fsPromises.chmod(menuPdfPath, 0o644);
      console.log(`Standardised menu PDF name at ${MENU_TYPES.regular.publicPath}`);
      renamed = true;
    } else if (hasCustomSource && (!sourcePath || !fs.existsSync(sourcePath))) {
      console.warn(`Configured menu PDF not found: ${configuredPath}`);
    }

    let configChanged = false;

    if (config.pdf_file !== MENU_TYPES.regular.publicPath) {
      config.pdf_file = MENU_TYPES.regular.publicPath;
      configChanged = true;
    }

    if (!config.last_updated || renamed) {
      config.last_updated = new Date().toISOString();
      configChanged = true;
    }

    if (configChanged) {
      await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    }

    return config;
  } catch (error) {
    console.error('Failed to process legacy menu PDF config:', error);
    return null;
  }
}

async function loadLegacyCollection() {
  const menuPdfDir = path.join(process.cwd(), 'content', 'menu-pdf');

  if (!fs.existsSync(menuPdfDir)) {
    return null;
  }

  const files = fs.readdirSync(menuPdfDir).filter(file => file.endsWith('.md'));

  if (files.length === 0) {
    return null;
  }

  const menus = files
    .map(file => {
      const filePath = path.join(menuPdfDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      return data;
    })
    .filter(menu => menu.active);

  if (menus.length === 0) {
    return null;
  }

  const latestMenu = menus.sort(
    (a, b) => new Date(b.upload_date || b.date || 0) - new Date(a.upload_date || a.date || 0)
  )[0];

  return {
    name: latestMenu.name,
    description: latestMenu.description,
    pdf_url: latestMenu.pdf_file,
    upload_date: latestMenu.upload_date || latestMenu.date
  };
}

function mapEntryToResponse(type, entry) {
  const defaults = MENU_TYPES[type];

  return {
    type,
    name: entry.title || entry.name || defaults.defaultTitle,
    description: entry.description || '',
    pdf_url: entry.file || entry.pdf_url || defaults.publicPath,
    button_text: entry.button_text || defaults.defaultButton,
    download_filename: entry.download_filename || defaults.defaultDownload,
    qr_url: entry.qr_url || entry.qrCodeUrl || null,
    active: entry.active !== false,
    version: entry.version || undefined,
    last_updated: entry.last_updated || entry.updated_at || entry.upload_date || null
  };
}

exports.handler = async (event) => {
  const requestedType = (event?.queryStringParameters?.menuType || 'regular').toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(MENU_TYPES, requestedType)) {
    return buildErrorResponse(400, 'Ungültiger Menü-Typ', {
      allowed: Object.keys(MENU_TYPES)
    });
  }

  try {
    const yamlConfig = await ensureYamlConfig();

    if (yamlConfig && yamlConfig[requestedType]) {
      const response = mapEntryToResponse(requestedType, yamlConfig[requestedType]);
      return buildSuccessResponse(response);
    }

    if (requestedType !== 'regular') {
      return buildErrorResponse(404, 'Kein PDF-Menü für diesen Typ verfügbar');
    }

    const legacyConfig = await ensureMenuPdfFromConfig();

    if (legacyConfig && legacyConfig.active !== false) {
      return buildSuccessResponse({
        type: 'regular',
        name: legacyConfig.title || legacyConfig.name || 'Speisekarte PDF',
        description: legacyConfig.description || '',
        pdf_url: MENU_TYPES.regular.publicPath,
        button_text: MENU_TYPES.regular.defaultButton,
        download_filename: MENU_TYPES.regular.defaultDownload,
        qr_url: legacyConfig.qr_url || legacyConfig.qrCodeUrl || null,
        active: true,
        version: legacyConfig.version || undefined,
        last_updated: legacyConfig.last_updated || new Date().toISOString()
      });
    }

    const legacyCollection = await loadLegacyCollection();

    if (legacyCollection) {
      return buildSuccessResponse({
        type: 'regular',
        name: legacyCollection.name || 'Speisekarte PDF',
        description: legacyCollection.description || '',
        pdf_url: legacyCollection.pdf_url || MENU_TYPES.regular.publicPath,
        button_text: MENU_TYPES.regular.defaultButton,
        download_filename: MENU_TYPES.regular.defaultDownload,
        qr_url: null,
        active: true,
        last_updated: legacyCollection.upload_date || new Date().toISOString()
      });
    }

    return buildErrorResponse(404, 'Kein PDF-Menü verfügbar');
  } catch (error) {
    console.error('Error fetching PDF menu:', error);
    return buildErrorResponse(500, 'Fehler beim Laden des PDF-Menüs', {
      details: error.message
    });
  }
};
