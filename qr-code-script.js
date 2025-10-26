const sizeSelector = document.getElementById('size-selector');
const downloadPngButton = document.getElementById('download-btn');
const downloadSvgButton = document.getElementById('download-svg-btn');
const regenerateButton = document.getElementById('regenerate-btn');
const menuUrlElement = document.getElementById('menu-url');
const menuMetaElement = document.getElementById('menu-meta');
const statusMessageElement = document.getElementById('status-message');
const qrCanvasContainer = document.getElementById('qrcode');
const qrSvgContainer = document.getElementById('qrcode-svg');

let currentMenuUrl = null;
let currentSize = parseInt(sizeSelector.value, 10) || 256;
let isInitializing = false;

function setStatus(message, type = 'info') {
    statusMessageElement.textContent = message;
    statusMessageElement.className = `status-message status-${type}`;
}

function setControlsDisabled(disabled) {
    [sizeSelector, downloadPngButton, downloadSvgButton, regenerateButton].forEach((element) => {
        if (!element) return;
        element.disabled = disabled;
        element.setAttribute('aria-disabled', String(disabled));
    });
}

function generateQRCode(size, url) {
    if (!url) {
        return;
    }

    qrCanvasContainer.innerHTML = '';
    qrSvgContainer.innerHTML = '';

    new QRCode(qrCanvasContainer, {
        text: url,
        width: size,
        height: size,
        colorDark: '#1E4A3C',
        colorLight: '#F5F0E8',
        correctLevel: QRCode.CorrectLevel.H,
    });

    new QRCode(qrSvgContainer, {
        text: url,
        width: size,
        height: size,
        colorDark: '#1E4A3C',
        colorLight: '#F5F0E8',
        correctLevel: QRCode.CorrectLevel.H,
        useSVG: true,
    });
}

async function ensurePdfAvailable(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`PDF antwortete mit Status ${response.status}`);
        }
        return true;
    } catch (error) {
        console.warn('PDF konnte nicht verifiziert werden:', error);
        return false;
    }
}

function updateMenuDetails(data, resolvedUrl) {
    menuUrlElement.textContent = resolvedUrl;
    menuUrlElement.href = resolvedUrl;

    const details = [];
    if (data.name) {
        details.push(data.name);
    }
    if (data.description) {
        details.push(data.description);
    }
    if (data.upload_date) {
        const formatted = new Date(data.upload_date).toLocaleString('de-AT');
        details.push(`Aktualisiert: ${formatted}`);
    }

    menuMetaElement.textContent = details.join(' • ');
}

async function loadMenuUrl() {
    if (isInitializing) return;
    isInitializing = true;
    setControlsDisabled(true);
    setStatus('Lade aktuelle Speisekarte...', 'info');

    try {
        const response = await fetch('/.netlify/functions/get-menu-pdf', {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Serverantwort: ${response.status}`);
        }

        const data = await response.json();
        const menuUrl = data.url || data.pdf_url || data.menu_file;

        if (!menuUrl) {
            throw new Error('Keine Menü-URL verfügbar.');
        }

        const resolvedUrl = new URL(menuUrl, window.location.origin).href;
        const pdfExists = await ensurePdfAvailable(resolvedUrl);

        if (!pdfExists) {
            throw new Error('Die Speisekarte konnte nicht gefunden werden. Bitte erneut hochladen.');
        }

        currentMenuUrl = resolvedUrl;
        updateMenuDetails(data, resolvedUrl);
        currentSize = parseInt(sizeSelector.value, 10) || 256;
        generateQRCode(currentSize, currentMenuUrl);
        setStatus('QR-Code erfolgreich generiert.', 'success');
        setControlsDisabled(false);
    } catch (error) {
        console.error('Fehler beim Laden der Speisekarte:', error);
        currentMenuUrl = null;
        menuUrlElement.textContent = 'Keine Speisekarte verfügbar';
        menuUrlElement.removeAttribute('href');
        menuMetaElement.textContent = '';
        setStatus(error.message || 'Die Speisekarte konnte nicht geladen werden.', 'error');
        setControlsDisabled(true);
    } finally {
        isInitializing = false;
    }
}

function downloadCanvasAsPng() {
    const canvas = qrCanvasContainer.querySelector('canvas');
    if (!canvas) {
        setStatus('Der QR-Code steht noch nicht zur Verfügung.', 'error');
        return;
    }
    canvas.toBlob((blob) => {
        if (!blob) {
            setStatus('Der QR-Code konnte nicht exportiert werden.', 'error');
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'healthy-brunch-club-menu-qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

function downloadSvg() {
    const svgElement = qrSvgContainer.querySelector('svg');
    if (!svgElement) {
        setStatus('Der QR-Code steht noch nicht zur Verfügung.', 'error');
        return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'healthy-brunch-club-menu-qr.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

sizeSelector.addEventListener('change', (event) => {
    const selectedSize = parseInt(event.target.value, 10);
    if (!Number.isNaN(selectedSize)) {
        currentSize = selectedSize;
        if (currentMenuUrl) {
            generateQRCode(currentSize, currentMenuUrl);
            setStatus('QR-Code aktualisiert.', 'success');
        }
    }
});

downloadPngButton.addEventListener('click', () => {
    if (!currentMenuUrl) {
        setStatus('Bitte laden Sie zuerst die Speisekarte.', 'error');
        return;
    }
    downloadCanvasAsPng();
});

downloadSvgButton.addEventListener('click', () => {
    if (!currentMenuUrl) {
        setStatus('Bitte laden Sie zuerst die Speisekarte.', 'error');
        return;
    }
    downloadSvg();
});

regenerateButton.addEventListener('click', () => {
    if (!currentMenuUrl) {
        setStatus('Bitte laden Sie zuerst die Speisekarte.', 'error');
        return;
    }
    generateQRCode(currentSize, currentMenuUrl);
    setStatus('QR-Code neu generiert.', 'success');
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMenuUrl, { once: true });
} else {
    loadMenuUrl();
}
