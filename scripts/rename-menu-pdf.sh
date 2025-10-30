#!/bin/bash
# Post-build script to ensure PDF is always named menu.pdf
# This runs after Netlify build to rename any uploaded PDF to menu.pdf

set -euo pipefail

CONTENT_DIR="content"
MENU_FILE="$CONTENT_DIR/menu.pdf"
CONFIG_FILE="$CONTENT_DIR/menu-pdf-config.json"
MENU_PUBLIC_PATH="/content/menu.pdf"

export CONFIG_FILE MENU_PUBLIC_PATH

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

  if (data.pdf_file !== menuPublicPath) {
    data.pdf_file = menuPublicPath;
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

echo "🔍 Healthy Brunch Club - PDF Menu Check..."

# Ensure the content directory exists
mkdir -p "$CONTENT_DIR"

FOUND_NEW_PDF=false

pdf_candidates=$(ls -1t "$CONTENT_DIR"/*.pdf 2>/dev/null || true)

while IFS= read -r pdf; do
  [ -f "$pdf" ] || continue
  FILENAME=$(basename "$pdf")

  case "$FILENAME" in
    menu.pdf) continue ;;
    menu-backup-*.pdf) continue ;;
  esac

  if [ -n "$FILENAME" ]; then
    if [ -f "$MENU_FILE" ] && [ ! "$pdf" -nt "$MENU_FILE" ]; then
      continue
    fi

    echo "📄 Found new PDF upload: $FILENAME"
    FOUND_NEW_PDF=true

    if [ -f "$MENU_FILE" ]; then
      echo "�️  Deleting existing menu.pdf"
      rm -f "$MENU_FILE"
    fi

    echo "✅ Renaming '$FILENAME' → 'menu.pdf'"
    mv "$pdf" "$MENU_FILE"
    chmod 644 "$MENU_FILE"
    update_config "true"
    echo "✨ PDF successfully updated!"

    break
  fi
done <<< "$pdf_candidates"

if [ "$FOUND_NEW_PDF" = false ]; then
  if [ -f "$CONTENT_DIR/menu.pdf" ]; then
    echo "✅ menu.pdf already exists and is current"
  else
    echo "⚠️  WARNING: No menu.pdf found! Please upload a PDF via CMS."
    exit 1
  fi
fi

update_config "false"

echo "✅ PDF menu check complete!"
exit 0
