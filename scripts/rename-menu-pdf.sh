#!/bin/bash
# Post-build script to ensure PDF is always named menu.pdf
# This runs after Netlify build to rename any uploaded PDF to menu.pdf

set -euo pipefail

CONTENT_DIR="content"
MENU_FILE="$CONTENT_DIR/menu.pdf"
KIDSMENU_FILE="$CONTENT_DIR/kidsmenu.pdf"
CONFIG_FILE="$CONTENT_DIR/menu-pdf-config.json"
MENU_PUBLIC_PATH="/content/menu.pdf"
KIDSMENU_PUBLIC_PATH="/content/kidsmenu.pdf"

export CONFIG_FILE MENU_PUBLIC_PATH KIDSMENU_PUBLIC_PATH

update_config() {
  local update_timestamp="$1"
  export UPDATE_TIMESTAMP="$update_timestamp"

  if [ ! -f "$CONFIG_FILE" ]; then
    unset UPDATE_TIMESTAMP
    return
  fi

  node <<'NODE'
const fs = require('fs');

const configPath = process.env.CONFIG_FILE;
const menuPublicPath = process.env.MENU_PUBLIC_PATH;
const updateTimestamp = process.env.UPDATE_TIMESTAMP === 'true';

if (!configPath || !fs.existsSync(configPath)) {
  process.exit(0);
}

try {
  const raw = fs.readFileSync(configPath, 'utf8');
  const data = raw.trim() ? JSON.parse(raw) : {};
  let changed = false;

  if (data.menu_pdf !== menuPublicPath) {
    data.menu_pdf = menuPublicPath;
    changed = true;
  }

  if (data.pdf_file !== menuPublicPath) {
    data.pdf_file = menuPublicPath;
    changed = true;
  }

  if (data.kids_menu_pdf !== process.env.KIDSMENU_PUBLIC_PATH) {
    data.kids_menu_pdf = process.env.KIDSMENU_PUBLIC_PATH;
    changed = true;
  }

  if (updateTimestamp || !data.last_updated) {
    data.last_updated = new Date().toISOString();
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');
    console.log('🛠️  Updated menu-pdf-config.json');
  }
} catch (error) {
  console.error('⚠️  Failed to update menu-pdf-config.json:', error);
  process.exit(1);
}
NODE

  unset UPDATE_TIMESTAMP
}

load_config_paths() {
  if [ ! -f "$CONFIG_FILE" ]; then
    return
  fi

  local output
  if ! output=$(node <<'NODE'
const fs = require('fs');

const configPath = process.env.CONFIG_FILE;
if (!configPath || !fs.existsSync(configPath)) {
  process.exit(0);
}

try {
  const raw = fs.readFileSync(configPath, 'utf8');
  const data = raw.trim() ? JSON.parse(raw) : {};
  console.log(data.menu_pdf || '');
  console.log(data.kids_menu_pdf || '');
} catch (error) {
  console.error('⚠️  Failed to read menu-pdf-config.json:', error);
  process.exit(1);
}
NODE
  ); then
    echo "⚠️  Failed to read existing PDF configuration"
    exit 1
  fi

  CONFIG_MENU_PATH=$(printf '%s' "$output" | sed -n '1p')
  CONFIG_KIDSMENU_PATH=$(printf '%s' "$output" | sed -n '2p')
}

rename_pdf_if_needed() {
  local source_path="$1"
  local target_file="$2"
  local target_public_path="$3"
  local label="$4"
  local updated_flag="$5"

  if [ -z "$source_path" ] || [ "$source_path" = "$target_public_path" ]; then
    return 1
  fi

  local source_basename
  source_basename=$(basename "$source_path")
  local source_file="$CONTENT_DIR/$source_basename"

  if [ ! -f "$source_file" ]; then
    return 1
  fi

  echo "📄 Found new $label PDF upload: $source_basename"

  if [ -f "$target_file" ]; then
    echo "🗑️  Deleting existing $(basename "$target_file")"
    rm -f "$target_file"
  fi

  echo "✅ Renaming '$source_basename' → '$(basename "$target_file")'"
  mv "$source_file" "$target_file"
  chmod 644 "$target_file"

  eval "$updated_flag=true"
  return 0
}

echo "🔍 Healthy Brunch Club - PDF Menu Check..."

# Ensure the content directory exists
mkdir -p "$CONTENT_DIR"

load_config_paths

MENU_UPDATED=false
KIDSMENU_UPDATED=false

rename_pdf_if_needed "$CONFIG_KIDSMENU_PATH" "$KIDSMENU_FILE" "$KIDSMENU_PUBLIC_PATH" "kids menu" KIDSMENU_UPDATED || true
rename_pdf_if_needed "$CONFIG_MENU_PATH" "$MENU_FILE" "$MENU_PUBLIC_PATH" "menu" MENU_UPDATED || true

if [ "$MENU_UPDATED" = true ] || [ "$KIDSMENU_UPDATED" = true ]; then
  update_config "true"
  echo "✨ PDF configuration updated!"
else
  if [ -f "$MENU_FILE" ]; then
    echo "✅ menu.pdf already exists and is current"
  else
    echo "⚠️  WARNING: No menu.pdf found! Please upload a PDF via CMS."
    exit 1
  fi

  if [ -f "$KIDSMENU_FILE" ]; then
    echo "✅ kidsmenu.pdf already exists and is current"
  else
    echo "⚠️  WARNING: No kidsmenu.pdf found! Please upload a PDF via CMS."
  fi

  update_config "false"
fi

echo "✅ PDF menu check complete!"
exit 0
