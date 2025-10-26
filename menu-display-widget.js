class MenuDisplayWidget {
  constructor() {
    this.menus = [];
    this.qrCodes = new Map();
    this.container = null;
  }

  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container not found:', containerId);
      return;
    }

    this.showLoader();
    await this.loadMenus();
    await this.generateQRCodes();
    this.render();
  }

  showLoader() {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = `
      <div class="menu-loader">
        <div class="loader-spinner"></div>
        <p>Lade Speisekarten...</p>
      </div>
    `;
  }

  async loadMenus() {
    try {
      const response = await fetch('/.netlify/functions/get-all-menus');
      const data = await response.json();

      if (data.success) {
        this.menus = data.menus.filter((menu) => menu.active !== false);
      } else {
        this.menus = [];
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      this.menus = [];
    }
  }

  async generateQRCodes() {
    const baseUrl = window.location.origin;

    for (const menu of this.menus) {
      const fullUrl = `${baseUrl}${menu.pdf_file}`;

      try {
        const response = await fetch('/.netlify/functions/generate-menu-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: fullUrl,
            title: menu.title
          })
        });

        const data = await response.json();

        if (data.success) {
          this.qrCodes.set(menu.id, data.qrCode);
        }
      } catch (error) {
        console.error(`Error generating QR for ${menu.title}:`, error);
      }
    }
  }

  render() {
    if (!this.container) {
      return;
    }

    if (this.menus.length === 0) {
      this.container.innerHTML = `
        <div class="no-menus">
          <p>Keine Speisekarten verfügbar.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="menu-grid">
        ${this.menus.map((menu) => this.renderMenuCard(menu)).join('')}
      </div>
    `;
  }

  renderMenuCard(menu) {
    const qrCode = this.qrCodes.get(menu.id);
    const date = menu.date
      ? new Date(menu.date).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';

    return `
      <div class="menu-card" data-menu-id="${menu.id}">
        <div class="menu-card-header">
          <h3>${menu.title}</h3>
          ${menu.isOriginal ? '<span class="badge-original">Original</span>' : ''}
          ${date ? `<p class="menu-date">${date}</p>` : ''}
        </div>

        <div class="menu-card-body">
          ${qrCode
            ? `
              <div class="qr-display">
                <img src="${qrCode}" alt="QR Code für ${menu.title}">
              </div>
            `
            : '<div class="qr-placeholder">QR wird generiert...</div>'}

          ${menu.description
            ? `
              <p class="menu-description">${menu.description}</p>
            `
            : ''}
        </div>

        <div class="menu-card-actions">
          <a href="${menu.pdf_file}" class="btn-action btn-view" target="_blank" rel="noopener">
            📄 PDF ansehen
          </a>
          <button type="button" onclick="menuWidget.downloadPDF('${menu.pdf_file}', '${menu.title.replace(/'/g, "\\'")}')" class="btn-action btn-download">
            💾 Herunterladen
          </button>
          <button type="button" onclick="menuWidget.downloadQR('${menu.id}', '${menu.title.replace(/'/g, "\\'")}')" class="btn-action btn-qr">
            📱 QR speichern
          </button>
          <button type="button" onclick="menuWidget.printQR('${menu.id}', '${menu.title.replace(/'/g, "\\'")}')" class="btn-action btn-print">
            🖨️ QR drucken
          </button>
        </div>
      </div>
    `;
  }

  downloadPDF(pdfUrl, title) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadQR(menuId, title) {
    const qrCode = this.qrCodes.get(menuId);
    if (!qrCode) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printQR(menuId, title) {
    const qrCode = this.qrCodes.get(menuId);
    if (!qrCode) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    printWindow.opener = null;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR Code - ${title}</title>
        <style>
          @page { margin: 2cm; }
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Lato', 'Arial', sans-serif;
            padding: 20px;
            background: #F5F0E8;
          }
          .print-container {
            text-align: center;
            max-width: 600px;
          }
          h1 {
            color: #1E4A3C;
            font-family: 'Playfair Display', serif;
            margin-bottom: 10px;
            font-size: 32px;
          }
          .subtitle {
            color: #8B9474;
            margin-bottom: 30px;
            font-size: 18px;
          }
          .qr-container {
            background: white;
            padding: 30px;
            border: 4px solid #1E4A3C;
            border-radius: 12px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          img {
            width: 400px;
            height: 400px;
            display: block;
          }
          .instructions {
            margin-top: 30px;
            padding: 20px;
            background: #F5F0E8;
            border-radius: 8px;
            color: #1E4A3C;
          }
          .instructions p {
            margin: 10px 0;
            line-height: 1.6;
          }
          .footer {
            margin-top: 30px;
            color: #999;
            font-size: 14px;
          }
          @media print {
            body { padding: 0; }
            .instructions { page-break-before: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <h1>🌿 Healthy Brunch Club</h1>
          <div class="subtitle">${title}</div>

          <div class="qr-container">
            <img src="${qrCode}" alt="QR Code">
          </div>

          <div class="instructions">
            <p><strong>📱 Scannen Sie diesen QR-Code</strong></p>
            <p>um unsere Speisekarte auf Ihrem Smartphone zu öffnen</p>
          </div>

          <div class="footer">
            <p>healthybrunchclub.at</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  async refresh() {
    if (!this.container) {
      return;
    }

    await this.init(this.container.id);
  }
}

window.menuWidget = new MenuDisplayWidget();
