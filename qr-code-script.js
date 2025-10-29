const MENU_PDF_PATH = '/content/menu/menu.pdf';
const FALLBACK_URL = `${window.location.origin}${MENU_PDF_PATH}`;
let qrCodeInstance = null;
let activeUrl = FALLBACK_URL;

const elements = {
  qrcode: document.getElementById('qrcode'),
  sizeSelector: document.getElementById('size-selector'),
  downloadBtn: document.getElementById('download-btn'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  menuUrl: document.getElementById('menu-url'),
  menuMeta: document.getElementById('menu-meta'),
  status: document.getElementById('qr-status')
};

function setStatus(message, type = 'info') {
  if (!elements.status) return;
  if (!message) {
    elements.status.hidden = true;
    elements.status.textContent = '';
    elements.status.className = 'qr-status';
    return;
  }

  elements.status.hidden = false;
  elements.status.textContent = message;
  elements.status.className = `qr-status qr-status-${type}`;
}

function resolveUrl(url) {
  if (!url) return FALLBACK_URL;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.href;
  } catch (error) {
    return FALLBACK_URL;
  }
}

function updateMenuDetails(url, timestamp) {
  const resolvedUrl = resolveUrl(url);
  activeUrl = resolvedUrl;
  elements.menuUrl.textContent = resolvedUrl;
  if (timestamp) {
    const formatted = new Date(timestamp).toLocaleString('de-AT');
    elements.menuMeta.textContent = `Zuletzt aktualisiert: ${formatted}`;
    elements.menuMeta.hidden = false;
  } else {
    elements.menuMeta.hidden = true;
    elements.menuMeta.textContent = '';
  }
}

function clearQRCode() {
  if (elements.qrcode) {
    elements.qrcode.innerHTML = '';
  }
  qrCodeInstance = null;
}

function generateQRCode(size) {
  if (!elements.qrcode) return;
  clearQRCode();

  qrCodeInstance = new QRCode(elements.qrcode, {
    text: activeUrl,
    width: size,
    height: size,
    colorDark: '#1E4A3C',
    colorLight: '#F5F0E8',
    correctLevel: QRCode.CorrectLevel.H
  });
}

async function ensurePdfExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function initialiseGenerator() {
  setStatus('Lade aktuelle Speisekarte…');

  try {
    const response = await fetch('/.netlify/functions/get-menu-pdf', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      updateMenuDetails(data.url, data.timestamp);
    } else {
      updateMenuDetails(FALLBACK_URL);
    }
  } catch (error) {
    updateMenuDetails(FALLBACK_URL);
  }

  const size = parseInt(elements.sizeSelector.value, 10) || 256;
  const pdfAvailable = await ensurePdfExists(activeUrl);

  if (!pdfAvailable) {
    setStatus('Aktuell ist keine PDF-Speisekarte verfügbar. Bitte laden Sie eine Datei im CMS hoch.', 'warning');
    elements.downloadBtn.disabled = true;
  } else {
    setStatus('Speisekarte erfolgreich geladen.');
    elements.downloadBtn.disabled = false;
    setTimeout(() => setStatus(null), 4000);
  }

  generateQRCode(size);
}

function downloadQRCode() {
  const canvas = elements.qrcode.querySelector('canvas');
  const img = elements.qrcode.querySelector('img');
  let dataUrl;

  if (canvas) {
    dataUrl = canvas.toDataURL('image/png');
  } else if (img) {
    dataUrl = img.src;
  }

  if (!dataUrl) {
    setStatus('Download nicht möglich. Bitte versuchen Sie es erneut.', 'error');
    return;
  }

  const link = document.createElement('a');
  link.download = 'healthy-brunch-club-menu-qr.png';
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function attachEventListeners() {
  if (elements.sizeSelector) {
    elements.sizeSelector.addEventListener('change', (event) => {
      const newSize = parseInt(event.target.value, 10) || 256;
      generateQRCode(newSize);
    });
  }

  if (elements.regenerateBtn) {
    elements.regenerateBtn.addEventListener('click', () => {
      const currentSize = parseInt(elements.sizeSelector.value, 10) || 256;
      generateQRCode(currentSize);
    });
  }

  if (elements.downloadBtn) {
    elements.downloadBtn.addEventListener('click', downloadQRCode);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  attachEventListeners();
  initialiseGenerator();
});
