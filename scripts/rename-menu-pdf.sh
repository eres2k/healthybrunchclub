#!/bin/bash
# Post-build script to ensure PDF is always named menu.pdf
# This runs after Netlify build to rename any uploaded PDF to menu.pdf

CONTENT_DIR="content"

echo "🔍 Healthy Brunch Club - PDF Menu Check..."

# Ensure content directory exists
mkdir -p "$CONTENT_DIR"

FOUND_NEW_PDF=false

get_mtime() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo 0
    return
  fi

  if stat -c %Y "$file_path" >/dev/null 2>&1; then
    stat -c %Y "$file_path"
  else
    stat -f %m "$file_path"
  fi
}

MENU_FILE="$CONTENT_DIR/menu.pdf"
MENU_MTIME=$(get_mtime "$MENU_FILE")

backup_and_replace() {
  local source_path="$1"
  local filename="$2"

  echo "📄 Found new PDF upload: $filename"
  FOUND_NEW_PDF=true

  if [ -f "$MENU_FILE" ]; then
    BACKUP_NAME="menu-backup-$(date +%Y%m%d-%H%M%S).pdf"
    echo "💾 Backing up current menu.pdf → $BACKUP_NAME"
    mv "$MENU_FILE" "$CONTENT_DIR/$BACKUP_NAME"

    ls -t "$CONTENT_DIR"/menu-backup-*.pdf 2>/dev/null | tail -n +4 | xargs -r rm
    echo "🗑️  Cleaned up old backups (kept last 3)"
  fi

  echo "✅ Renaming '$filename' → 'menu.pdf'"
  mv "$source_path" "$MENU_FILE"
  echo "✨ PDF successfully updated!"

  chmod 644 "$MENU_FILE"
}

# Collect PDF candidates sorted by modification date (newest first)
mapfile -t PDF_CANDIDATES < <(ls -t "$CONTENT_DIR"/*.pdf 2>/dev/null || true)

for pdf in "${PDF_CANDIDATES[@]}"; do
  if [ -f "$pdf" ]; then
    FILENAME=$(basename "$pdf")

    if [ "$FILENAME" != "menu.pdf" ] && [[ "$FILENAME" != menu-backup-*.pdf ]]; then
      PDF_MTIME=$(get_mtime "$pdf")

      if [ "$MENU_MTIME" -eq 0 ] || [ "$PDF_MTIME" -gt "$MENU_MTIME" ]; then
        backup_and_replace "$pdf" "$FILENAME"
        break
      fi
    fi
  fi
done

if [ "$FOUND_NEW_PDF" = false ]; then
  if [ -f "$CONTENT_DIR/menu.pdf" ]; then
    echo "✅ menu.pdf already exists and is current"
  else
    echo "⚠️  WARNING: No menu.pdf found! Please upload a PDF via CMS."
    exit 1
  fi
fi

echo "✅ PDF menu check complete!"
exit 0
