#!/bin/bash
# Post-build script to ensure PDF is always named menu.pdf
# This runs after Netlify build to rename any uploaded PDF to menu.pdf

CONTENT_DIR="content"

echo "🔍 Checking for uploaded PDF files..."

# Find all PDF files except menu.pdf
for pdf in "$CONTENT_DIR"/*.pdf; do
  if [ -f "$pdf" ] && [ "$(basename "$pdf")" != "menu.pdf" ]; then
    echo "📄 Found uploaded PDF: $(basename "$pdf")"
    
    # Backup existing menu.pdf if it exists
    if [ -f "$CONTENT_DIR/menu.pdf" ]; then
      BACKUP_NAME="menu-backup-$(date +%Y%m%d-%H%M%S).pdf"
      echo "💾 Backing up existing menu.pdf to $BACKUP_NAME"
      mv "$CONTENT_DIR/menu.pdf" "$CONTENT_DIR/$BACKUP_NAME"
    fi
    
    # Rename new PDF to menu.pdf
    echo "✅ Renaming to menu.pdf"
    mv "$pdf" "$CONTENT_DIR/menu.pdf"
    echo "✨ PDF successfully renamed!"
    exit 0
  fi
done

if [ -f "$CONTENT_DIR/menu.pdf" ]; then
  echo "✅ menu.pdf already exists"
else
  echo "⚠️  No menu.pdf found"
fi
