## 📄 PDF-Menü Management

### Upload-Prozess

1. **Via CMS Admin** (`/admin`):
   - Gehe zu "Speisekarten PDF"
   - Lade neue PDF-Datei hoch
   - Datei wird automatisch als `menu.pdf` gespeichert
   - Alte Version wird als Backup gesichert

2. **Automatische Verarbeitung**:
   - Script läuft bei jedem Build
   - PDF wird zu `menu.pdf` umbenannt
   - Alte Backups werden rotiert (max. 3)
   - QR-Code bleibt gültig

3. **QR-Code URLs**:
   - Produktiv: `https://healthybrunchclub.at/content/menu.pdf`
   - Alle Redirects zeigen auf diese fixe URL

### Manueller Upload (Fallback)

Falls das automatische System nicht funktioniert:

```bash
# 1. PDF ins content-Verzeichnis kopieren
cp neues-menu.pdf content/

# 2. Script manuell ausführen
bash scripts/rename-menu-pdf.sh

# 3. Änderungen committen
git add content/menu.pdf
git commit -m "Update menu PDF"
git push
```

### Troubleshooting

**Problem:** PDF wird nicht umbenannt
```bash
# Check Script-Permissions
chmod +x scripts/rename-menu-pdf.sh

# Manual run
bash scripts/rename-menu-pdf.sh

# Check logs
netlify deploy --prod --debug
```

**Problem:** QR-Code zeigt alte Version
```bash
# Clear Netlify Cache
netlify deploy --clear-cache --prod

# Check redirect
curl -I https://healthybrunchclub.at/content/menu.pdf
```

## 🚀 Deployment-Schritte

### 1. Lokale Tests

```bash
# 1. Dependencies installieren
npm install

# 2. Script ausführbar machen
chmod +x scripts/rename-menu-pdf.sh

# 3. Test-PDF erstellen
cp test-menu.pdf content/test-speisekarte.pdf

# 4. Script testen
npm run build

# 5. Prüfen ob umbenennung funktioniert
ls -la content/*.pdf
```

### 2. Git Commit & Push

```bash
git add .
git commit -m "Fix: Automatische PDF-Umbenennung für QR-Code"
git push origin main
```

### 3. Netlify Deployment

Netlify deployt automatisch nach dem Push. Prüfe:
1. Build-Logs auf Fehler
2. PDF-Link funktioniert: `https://healthybrunchclub.at/content/menu.pdf`
3. QR-Code aktualisiert sich

## 🧪 Testing-Checkliste

Nach Deployment:

- [ ] Neues PDF via CMS hochladen
- [ ] Build-Logs prüfen: `🔍 Healthy Brunch Club - PDF Menu Check...`
- [ ] Script zeigt: `✅ Renaming '...' → 'menu.pdf'`
- [ ] `/content/menu.pdf` zeigt neue Version
- [ ] QR-Code funktioniert
- [ ] Alte Version liegt als `menu-backup-*.pdf`
- [ ] Mobile & Desktop Test

## 📱 QR-Code Generierung

Der QR-Code zeigt immer auf die fixe URL:

```
https://healthybrunchclub.at/content/menu.pdf
```

### QR-Code neu generieren (falls nötig)

1. Website öffnen: https://www.qr-code-generator.com/
2. URL eingeben: `https://healthybrunchclub.at/content/menu.pdf`
3. Design:
   - Farbe: `#1E4A3C` (Forest Green)
   - Logo: Healthy Brunch Club Logo (optional)
4. Download als PNG (mindestens 1024x1024px)
5. Ausdrucken und in Restaurant platzieren

## 🎯 Vorteile dieser Lösung

✅ **Automatisch**: PDF wird bei jedem Upload umbenannt  
✅ **QR-Code bleibt gültig**: Fixe URL `/content/menu.pdf`  
✅ **Backup-System**: Alte Versionen werden gesichert  
✅ **Kein manueller Eingriff**: Alles via CMS  
✅ **Fehlersicher**: Script prüft und loggt alles  
✅ **Sauber**: Alte Backups werden rotiert

## 🆘 Support

Bei Problemen:

1. Netlify Build-Logs prüfen
2. Script manuell ausführen: `bash scripts/rename-menu-pdf.sh`
3. Netlify Support kontaktieren (bei Deployment-Problemen)

**Healthy Brunch Club Wien** 🥑🍳  
Website: https://healthybrunchclub.at  
Letzte Aktualisierung: Oktober 2025
