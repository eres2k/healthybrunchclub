class MenuQRWidget {
  constructor() {
    this.container = null;
    this.activeMenu = null;
    this.qrCodeDataUrl = null;
  }

  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    await this.loadActiveMenu();
    await this.render();
  }

  async loadActiveMenu() {
    try {
      const response = await fetch('/.netlify/functions/get-active-menu');
      const data = await response.json();
      this.activeMenu = data.active;
    } catch (error) {
      console.error('Error loading active menu:', error);
      this.activeMenu = null;
    }
  }

  async generateQRCode(url) {
    try {
      const response = await fetch('/.netlify/functions/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      return data.qrCode;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  async render() {
    if (!this.container) return;

    if (!this.activeMenu) {
      this.container.innerHTML = `
        <div class="menu-qr-widget no-menu">
          <p>Keine aktive Speisekarte verfügbar.</p>
        </div>
      `;
      return;
    }

    const menuUrl = new URL(this.activeMenu.pdf_file, window.location.origin).href;
    const qrCodeUrl = await this.generateQRCode(menuUrl);
    const dateText = this.activeMenu.date
      ? new Date(this.activeMenu.date).toLocaleDateString('de-DE')
      : '';

    this.container.innerHTML = `
      <div class="menu-qr-widget">
        <div class="menu-qr-header">
          <h3>📱 ${this.activeMenu.title}</h3>
          ${dateText ? `<p class="menu-date">${dateText}</p>` : ''}
        </div>

        <div class="menu-qr-content">
          <div class="qr-code-display">
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR Code für ${this.activeMenu.title}">` : '<p>QR-Code konnte nicht geladen werden</p>'}
          </div>

          <div class="menu-actions">
            <a href="${this.activeMenu.pdf_file}" class="btn-primary" target="_blank" download>
              📄 PDF herunterladen
            </a>
            <button type="button" onclick="menuQR.downloadQR()" class="btn-secondary">
              💾 QR-Code herunterladen
            </button>
            <button type="button" onclick="menuQR.printQR()" class="btn-secondary">
              🖨️ QR-Code drucken
            </button>
          </div>

          ${this.activeMenu.description ? `<p class="menu-description">${this.activeMenu.description}</p>` : ''}
        </div>
      </div>
    `;

    this.qrCodeDataUrl = qrCodeUrl;
  }

  downloadQR() {
    if (!this.qrCodeDataUrl || !this.activeMenu) return;

    const link = document.createElement('a');
    link.download = `${this.activeMenu.title.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.href = this.qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printQR() {
    if (!this.qrCodeDataUrl || !this.activeMenu) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>QR Code - ${this.activeMenu.title}</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Lato', sans-serif;
            background: #F5F0E8;
          }
          h1 { color: #1E4A3C; margin-bottom: 20px; }
          img { max-width: 400px; border: 3px solid #1E4A3C; padding: 20px; border-radius: 12px; background: #fff; }
          p { margin-top: 20px; color: #666; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${this.activeMenu.title}</h1>
        <img src="${this.qrCodeDataUrl}" alt="QR Code">
        <p>Scannen Sie diesen Code für unsere Speisekarte</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

const menuQRInstance = new MenuQRWidget();
window.menuQR = menuQRInstance;

