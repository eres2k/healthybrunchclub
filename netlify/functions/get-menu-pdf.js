const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const MENU_PUBLIC_PATH = '/content/menu.pdf';

async function backupExistingMenuPdf(menuPdfPath, contentDir) {
  if (!fs.existsSync(menuPdfPath)) {
    return null;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '-')
    .replace('Z', '');
  const backupName = `menu-backup-${timestamp}.pdf`;
  const backupPath = path.join(contentDir, backupName);

  await fsPromises.rename(menuPdfPath, backupPath);
  await fsPromises.chmod(backupPath, 0o644);
  console.log(`Backed up existing menu.pdf to ${backupName}`);

  return backupPath;
}

async function rotateBackups(contentDir) {
  try {
    const backups = (await fsPromises.readdir(contentDir))
      .filter(name => name.startsWith('menu-backup-') && name.endsWith('.pdf'))
      .sort((a, b) => fs.statSync(path.join(contentDir, b)).mtimeMs - fs.statSync(path.join(contentDir, a)).mtimeMs);

    const MAX_BACKUPS = 3;
    if (backups.length <= MAX_BACKUPS) {
      return;
    }

    const toRemove = backups.slice(MAX_BACKUPS);
    await Promise.allSettled(
      toRemove.map(file => fsPromises.unlink(path.join(contentDir, file)))
    );
    if (toRemove.length) {
      console.log(`Removed ${toRemove.length} old menu.pdf backups`);
    }
  } catch (error) {
    console.warn('Unable to rotate menu.pdf backups:', error.message);
  }
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

    const menuPdfPath = path.join(contentDir, 'menu.pdf');
    const configuredPath = config.pdf_file;
    const hasCustomSource = configuredPath && configuredPath !== MENU_PUBLIC_PATH;

    let sourcePath = menuPdfPath;
    if (hasCustomSource) {
      if (configuredPath.startsWith('/')) {
        const cleaned = configuredPath.replace(/^\/+/, '');
        sourcePath = path.join(process.cwd(), cleaned);
      } else if (configuredPath.startsWith('content/')) {
        sourcePath = path.join(process.cwd(), configuredPath);
      } else {
        sourcePath = path.join(contentDir, configuredPath);
      }
    }

    let renamed = false;

    if (hasCustomSource && fs.existsSync(sourcePath)) {
      await backupExistingMenuPdf(menuPdfPath, contentDir);
      await fsPromises.rename(sourcePath, menuPdfPath);
      await fsPromises.chmod(menuPdfPath, 0o644);
      console.log(`Renamed ${configuredPath} to ${MENU_PUBLIC_PATH}`);
      renamed = true;
      await rotateBackups(contentDir);
    } else if (!fs.existsSync(menuPdfPath) && fs.existsSync(sourcePath) && sourcePath !== menuPdfPath) {
      await fsPromises.rename(sourcePath, menuPdfPath);
      await fsPromises.chmod(menuPdfPath, 0o644);
      console.log(`Standardised menu PDF name at ${MENU_PUBLIC_PATH}`);
      renamed = true;
    } else if (hasCustomSource && !fs.existsSync(sourcePath)) {
      console.warn(`Configured menu PDF not found: ${configuredPath}`);
    }

    let configChanged = false;

    if (config.pdf_file !== MENU_PUBLIC_PATH) {
      config.pdf_file = MENU_PUBLIC_PATH;
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
    console.error('Failed to process menu PDF config:', error);
    return null;
  }
}

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

function buildNotFoundResponse(message) {
  return {
    statusCode: 404,
    body: JSON.stringify({
      error: message,
      pdf: null
    })
  };
}

async function ensureMenuPdfExists() {
  const contentDir = path.join(process.cwd(), 'content');
  const menuPdfPath = path.join(contentDir, 'menu.pdf');

  try {
    // Find all PDF files in content directory
    const files = await fsPromises.readdir(contentDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('No PDF files found');
      return;
    }

    // Get stats for all PDFs
    const pdfStats = await Promise.all(
      pdfFiles.map(async file => {
        const filePath = path.join(contentDir, file);
        const stat = await fsPromises.stat(filePath);
        return { file, path: filePath, mtime: stat.mtime };
      })
    );

    // Sort by modification time, newest first
    const sortedPdfs = pdfStats.sort((a, b) => b.mtime - a.mtime);
    const latestPdf = sortedPdfs[0];

    // If the latest PDF is not menu.pdf, rename it
    if (latestPdf.file !== 'menu.pdf') {
      // Backup current menu.pdf if it exists
      if (fs.existsSync(menuPdfPath)) {
        await backupExistingMenuPdf(menuPdfPath, contentDir);
      }

      console.log(`Renaming ${latestPdf.file} to menu.pdf`);
      await fsPromises.rename(latestPdf.path, menuPdfPath);
      await fsPromises.chmod(menuPdfPath, 0o644);

      // Rotate backups
      await rotateBackups(contentDir);
    }

  } catch (error) {
    console.error('Error ensuring menu.pdf exists:', error);
  }
}

exports.handler = async () => {
  try {
    await ensureMenuPdfExists();
    const config = await ensureMenuPdfFromConfig();

    if (config && config.active !== false) {
      return buildSuccessResponse({
        name: config.title || config.name || 'Speisekarte PDF',
        description: config.description || '',
        pdf_url: MENU_PUBLIC_PATH, // Always use menu.pdf for QR codes
        upload_date: config.last_updated || new Date().toISOString(),
        version: config.version || undefined
      });
    }

    const menuPdfDir = path.join(process.cwd(), 'content', 'menu-pdf');

    if (!fs.existsSync(menuPdfDir)) {
      return buildNotFoundResponse('Kein PDF-Menü verfügbar');
    }

    const files = fs.readdirSync(menuPdfDir).filter(file => file.endsWith('.md'));

    if (files.length === 0) {
      return buildNotFoundResponse('Kein PDF-Menü verfügbar');
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
      return buildNotFoundResponse('Kein aktives PDF-Menü verfügbar');
    }

    const latestMenu = menus.sort(
      (a, b) => new Date(b.upload_date) - new Date(a.upload_date)
    )[0];

    return buildSuccessResponse({
      name: latestMenu.name,
      description: latestMenu.description,
      pdf_url: latestMenu.pdf_file,
      upload_date: latestMenu.upload_date
    });
  } catch (error) {
    console.error('Error fetching PDF menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Fehler beim Laden des PDF-Menüs',
        details: error.message
      })
    };
  }
};
