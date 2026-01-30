#!/usr/bin/env node
/**
 * PDF Menu Processing Script
 *
 * Standardizes all menu PDF filenames and updates the config file.
 * This replaces the previous bash script with a cleaner Node.js implementation.
 *
 * Standard PDF filenames:
 * - HBC_DE_MENU.pdf   - Main German menu
 * - HBC_EN_MENU.pdf   - English menu
 * - HBC_KIDS_MENU.pdf - Kids menu
 * - LASA_DE_MENU.PDF  - LASA menu
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(process.cwd(), 'content');
const CONFIG_FILE = path.join(CONTENT_DIR, 'menu-pdf-config.json');

// Standard filenames for each menu type
const STANDARD_FILENAMES = {
  menu_pdf: 'HBC_DE_MENU.pdf',
  english_menu_pdf: 'HBC_EN_MENU.pdf',
  kids_menu_pdf: 'HBC_KIDS_MENU.pdf',
  lasa_menu_pdf: 'LASA_DE_MENU.PDF'
};

// Public paths (what gets stored in config)
const PUBLIC_PATHS = {
  menu_pdf: '/content/HBC_DE_MENU.pdf',
  english_menu_pdf: '/content/HBC_EN_MENU.pdf',
  kids_menu_pdf: '/content/HBC_KIDS_MENU.pdf',
  lasa_menu_pdf: '/content/LASA_DE_MENU.PDF'
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    log('📝', 'Creating new menu-pdf-config.json');
    return {
      title: 'Speisekarte PDF',
      description: 'Aktuelle Speisekarte des Healthy Brunch Clubs',
      active: true,
      version: '1.0'
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (error) {
    log('⚠️', `Failed to parse config: ${error.message}`);
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
  log('💾', 'Updated menu-pdf-config.json');
}

function resolveSourcePath(configuredPath) {
  if (!configuredPath) return null;

  // Skip external URLs
  if (configuredPath.startsWith('http://') || configuredPath.startsWith('https://')) {
    return null;
  }

  // Handle various path formats
  let cleanPath;
  if (configuredPath.startsWith('/')) {
    cleanPath = configuredPath.slice(1);
  } else {
    cleanPath = configuredPath;
  }

  return path.join(process.cwd(), cleanPath);
}

function isValidPdf(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const stats = fs.statSync(filePath);
  // Must be at least 100 bytes to be a valid PDF
  return stats.size > 100;
}

function processMenuPdf(configKey, config) {
  const standardFilename = STANDARD_FILENAMES[configKey];
  const publicPath = PUBLIC_PATHS[configKey];
  const targetPath = path.join(CONTENT_DIR, standardFilename);
  const configuredPath = config[configKey];

  // If no configured path, check if standard file exists
  if (!configuredPath) {
    if (isValidPdf(targetPath)) {
      return { updated: false, exists: true };
    }
    return { updated: false, exists: false };
  }

  // If already pointing to standard path, verify file exists
  if (configuredPath === publicPath) {
    if (isValidPdf(targetPath)) {
      return { updated: false, exists: true };
    }
    return { updated: false, exists: false };
  }

  // Resolve the source path
  const sourcePath = resolveSourcePath(configuredPath);

  if (!sourcePath || !isValidPdf(sourcePath)) {
    // Source doesn't exist, but maybe target already exists
    if (isValidPdf(targetPath)) {
      return { updated: true, exists: true, message: `Config updated to use existing ${standardFilename}` };
    }
    return { updated: false, exists: false };
  }

  // Source exists and differs from target - need to rename
  const sourceFilename = path.basename(sourcePath);

  if (sourcePath !== targetPath) {
    // Delete existing target if it's a placeholder
    if (fs.existsSync(targetPath)) {
      const targetStats = fs.statSync(targetPath);
      if (targetStats.size < 100) {
        fs.unlinkSync(targetPath);
        log('🗑️', `Removed placeholder ${standardFilename}`);
      } else {
        // Backup existing valid PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `${path.basename(standardFilename, '.pdf')}-backup-${timestamp}.pdf`;
        const backupPath = path.join(CONTENT_DIR, backupName);
        fs.renameSync(targetPath, backupPath);
        log('📦', `Backed up existing ${standardFilename} to ${backupName}`);
      }
    }

    // Rename source to standard name
    fs.renameSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, 0o644);
    log('✅', `Renamed ${sourceFilename} → ${standardFilename}`);

    return { updated: true, exists: true };
  }

  return { updated: false, exists: true };
}

function cleanOldBackups() {
  const MAX_BACKUPS_PER_TYPE = 2;

  try {
    const files = fs.readdirSync(CONTENT_DIR);
    const backupPatterns = ['menu-backup-', 'kidsmenu-backup-', 'menu-english-backup-', 'lasa-english-backup-'];

    for (const pattern of backupPatterns) {
      const backups = files
        .filter(f => f.startsWith(pattern) && f.endsWith('.pdf'))
        .map(f => ({
          name: f,
          path: path.join(CONTENT_DIR, f),
          mtime: fs.statSync(path.join(CONTENT_DIR, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (backups.length > MAX_BACKUPS_PER_TYPE) {
        const toRemove = backups.slice(MAX_BACKUPS_PER_TYPE);
        for (const backup of toRemove) {
          fs.unlinkSync(backup.path);
          log('🗑️', `Removed old backup: ${backup.name}`);
        }
      }
    }
  } catch (error) {
    log('⚠️', `Failed to clean backups: ${error.message}`);
  }
}

function main() {
  log('🔍', 'Processing PDF menus...');

  // Ensure content directory exists
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const config = loadConfig();
  let configChanged = false;
  const results = {};

  // Process each menu type
  for (const [configKey, publicPath] of Object.entries(PUBLIC_PATHS)) {
    const result = processMenuPdf(configKey, config);
    results[configKey] = result;

    if (result.updated || config[configKey] !== publicPath) {
      if (result.exists) {
        config[configKey] = publicPath;
        configChanged = true;
      }
    }

    if (result.message) {
      log('ℹ️', result.message);
    }
  }

  // Remove legacy/redundant fields
  if (config.pdf_file) {
    delete config.pdf_file;
    configChanged = true;
    log('🧹', 'Removed legacy pdf_file field');
  }

  // Update timestamp if changes were made
  if (configChanged) {
    config.last_updated = new Date().toISOString();
    saveConfig(config);
  }

  // Clean up old backups
  cleanOldBackups();

  // Summary
  log('', '');
  log('📋', 'PDF Menu Status:');

  const labels = {
    menu_pdf: 'Main Menu (DE)',
    english_menu_pdf: 'English Menu',
    kids_menu_pdf: 'Kids Menu',
    lasa_menu_pdf: 'LASA Menu (DE)'
  };

  for (const [key, result] of Object.entries(results)) {
    const status = result.exists ? '✅' : '⚠️  MISSING';
    const filename = STANDARD_FILENAMES[key];
    log('  ', `${status} ${labels[key]} (${filename})`);
  }

  // Check if main menu exists (warn if missing, but don't fail build)
  if (!results.menu_pdf.exists) {
    log('', '');
    log('⚠️', 'WARNING: Main menu PDF (HBC_DE_MENU.pdf) is missing!');
    log('  ', 'Upload the main menu PDF to content/HBC_DE_MENU.pdf');
  }

  log('', '');
  log('✨', 'PDF processing complete!');
}

main();
