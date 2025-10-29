#!/bin/bash
# Post-build script to ensure PDF is always named menu.pdf
# This runs after Netlify build to rename any uploaded PDF to menu.pdf

set -euo pipefail

CONTENT_DIR="content"
MENU_FILE="$CONTENT_DIR/menu.pdf"

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
      BACKUP_NAME="menu-backup-$(date +%Y%m%d-%H%M%S).pdf"
      echo "💾 Backing up current menu.pdf → $BACKUP_NAME"
      mv "$MENU_FILE" "$CONTENT_DIR/$BACKUP_NAME"

      BACKUP_LIST=$(ls -1t "$CONTENT_DIR"/menu-backup-*.pdf 2>/dev/null || true)
      if [ -n "$BACKUP_LIST" ]; then
        OLD_BACKUPS=$(printf '%s\n' "$BACKUP_LIST" | tail -n +4)
        if [ -n "$OLD_BACKUPS" ]; then
          while IFS= read -r old_backup; do
            [ -n "$old_backup" ] && rm -f "$old_backup"
          done <<< "$OLD_BACKUPS"
          echo "🗑️  Cleaned up old backups (kept last 3)"
        fi
      fi
    fi

    echo "✅ Renaming '$FILENAME' → 'menu.pdf'"
    mv "$pdf" "$MENU_FILE"
    chmod 644 "$MENU_FILE"
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

echo "✅ PDF menu check complete!"
exit 0
