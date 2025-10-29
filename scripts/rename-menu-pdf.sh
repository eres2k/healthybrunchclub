#!/bin/bash
# PDF Auto-Rename Script - Läuft nach Build
# Sicher: Berührt keine anderen Dateien oder Funktionen

set -e  # Exit bei Fehler

CONTENT_DIR="content"
TARGET_FILE="menu.pdf"

echo "🔍 PDF Auto-Rename Script gestartet..."

# Prüfe ob content/ Verzeichnis existiert
if [ ! -d "$CONTENT_DIR" ]; then
  echo "⚠️  Content-Verzeichnis nicht gefunden - überspringe"
  exit 0
fi

# Finde alle PDFs außer menu.pdf
shopt -s nullglob
pdf_files=("$CONTENT_DIR"/*.pdf)

# Filtere menu.pdf raus
new_pdfs=()
for pdf in "${pdf_files[@]}"; do
  basename_pdf=$(basename "$pdf")
  if [ "$basename_pdf" != "$TARGET_FILE" ]; then
    new_pdfs+=("$pdf")
  fi
done

# Wenn neue PDFs gefunden
if [ ${#new_pdfs[@]} -gt 0 ]; then
  # Nimm die neueste (erste in der Liste)
  newest_pdf="${new_pdfs[0]}"
  newest_name=$(basename "$newest_pdf")
  
  echo "📄 Neue PDF gefunden: $newest_name"
  
  # Backup alte menu.pdf falls vorhanden
  if [ -f "$CONTENT_DIR/$TARGET_FILE" ]; then
    backup_name="menu-backup-$(date +%Y%m%d-%H%M%S).pdf"
    echo "💾 Backup erstellt: $backup_name"
    mv "$CONTENT_DIR/$TARGET_FILE" "$CONTENT_DIR/$backup_name"
  fi
  
  # Rename zu menu.pdf
  echo "✅ Umbenennen: $newest_name → $TARGET_FILE"
  mv "$newest_pdf" "$CONTENT_DIR/$TARGET_FILE"
  
  echo "✨ PDF erfolgreich zu menu.pdf umbenannt!"
else
  if [ -f "$CONTENT_DIR/$TARGET_FILE" ]; then
    echo "✅ menu.pdf existiert bereits - keine Änderung nötig"
  else
    echo "ℹ️  Keine PDF-Dateien gefunden"
  fi
fi

echo "✅ Script erfolgreich beendet"
exit 0
