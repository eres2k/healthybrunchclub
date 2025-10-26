class AdminMenuManager {
  constructor() {
    this.menus = [];
    this.container = document.getElementById('admin-menu-list');
  }

  async init() {
    await this.loadMenus();
    this.render();
  }

  async loadMenus() {
    if (!this.container) {
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/get-all-menus');
      const data = await response.json();

      if (data.success) {
        this.menus = data.menus;
      } else {
        this.menus = [];
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      this.container.innerHTML = '<p style="color: red; text-align: center;">Fehler beim Laden der Menüs</p>';
    }
  }

  render() {
    if (!this.container) {
      return;
    }

    if (!this.menus || this.menus.length === 0) {
      this.container.innerHTML = `
        <div class="no-menus">
          <p>📄 Noch keine Menüs vorhanden</p>
          <p><a href="/admin/#/collections/menu-collection/new">Erstes Menü jetzt hochladen →</a></p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.menus
      .map((menu) => this.renderMenuItem(menu))
      .join('');
  }

  renderMenuItem(menu) {
    const formattedDate = menu.date
      ? new Date(menu.date).toLocaleDateString('de-DE')
      : 'Unbekannt';

    return `
      <div class="menu-item ${menu.isOriginal ? 'original' : ''}">
        <div class="menu-item-info">
          <h4>
            ${menu.title}
            ${menu.isOriginal ? ' <span class="badge-original">Original</span>' : ''}
            ${menu.active === false ? ' <span style="color: #999;">(Inaktiv)</span>' : ''}
          </h4>
          <p><strong>📅 Datum:</strong> ${formattedDate}</p>
          <p><strong>📄 PDF:</strong> <a href="${menu.pdf_file}" target="_blank" rel="noopener">${menu.pdf_file}</a></p>
          ${menu.description ? `<p><strong>📝 Beschreibung:</strong> ${menu.description}</p>` : ''}
          <p><strong>🔢 Sortierung:</strong> ${menu.order || 0}</p>
        </div>

        <div class="menu-item-actions">
          ${!menu.isOriginal ? `
            <a href="/admin/#/collections/menu-collection/entries/${menu.id}" class="btn-secondary">
              ✏️ Bearbeiten
            </a>
          ` : ''}
          <button type="button" onclick="adminManager.viewPDF('${menu.pdf_file}')" class="btn-secondary">
            👁️ PDF ansehen
          </button>
          <button type="button" onclick="adminManager.showQR('${menu.pdf_file}', '${menu.title.replace(/'/g, "\\'")}')" class="btn-secondary">
            📱 QR anzeigen
          </button>
          <button type="button" onclick="adminManager.downloadQR('${menu.pdf_file}', '${menu.title.replace(/'/g, "\\'")}')" class="btn-secondary">
            💾 QR speichern
          </button>
        </div>
      </div>
    `;
  }

  viewPDF(pdfUrl) {
    const newWindow = window.open(pdfUrl, '_blank');
    if (newWindow) {
      newWindow.opener = null;
    }
  }

  async showQR(pdfUrl, title) {
    const fullUrl = `${window.location.origin}${pdfUrl}`;

    try {
      const response = await fetch('/.netlify/functions/generate-menu-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, title })
      });

      const data = await response.json();

      if (data.success) {
        this.displayQRModal(data.qrCode, title, fullUrl);
      } else {
        alert('Fehler beim Generieren des QR-Codes.');
      }
    } catch (error) {
      alert(`Fehler beim Generieren des QR-Codes: ${error.message}`);
    }
  }

  displayQRModal(qrCodeUrl, title, pdfUrl) {
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.innerHTML = `
      <div class="qr-modal-content">
        <h3>${title}</h3>
        <img src="${qrCodeUrl}" alt="QR Code">
        <p style="font-size: 12px; color: #999; margin: 10px 0;">${pdfUrl}</p>
        <div class="qr-modal-actions">
          <button type="button" onclick="this.closest('.qr-modal').remove()" class="btn-secondary">
            Schließen
          </button>
          <a href="${qrCodeUrl}" download="${title.replace(/\s+/g, '-').toLowerCase()}-qr.png" class="btn-primary">
            💾 Herunterladen
          </a>
          <button type="button" onclick="adminManager.printQRFromModal('${qrCodeUrl}', '${title.replace(/'/g, "\\'")}')" class="btn-secondary">
            🖨️ Drucken
          </button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  async downloadQR(pdfUrl, title) {
    const fullUrl = `${window.location.origin}${pdfUrl}`;

    try {
      const response = await fetch('/.netlify/functions/generate-menu-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, title })
      });

      const data = await response.json();

      if (data.success) {
        const link = document.createElement('a');
        link.href = data.qrCode;
        link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Fehler beim Download des QR-Codes.');
      }
    } catch (error) {
      alert(`Fehler beim Download: ${error.message}`);
    }
  }

  printQRFromModal(qrCodeUrl, title) {
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
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: 'Lato', Arial, sans-serif;
            background: #F5F0E8;
          }
          h1 {
            color: #1E4A3C;
            font-family: 'Playfair Display', serif;
            margin-bottom: 30px;
          }
          img {
            width: 400px;
            height: 400px;
            border: 4px solid #1E4A3C;
            border-radius: 12px;
          }
          p {
            margin-top: 30px;
            color: #666;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <h1>🌿 ${title}</h1>
        <img src="${qrCodeUrl}" alt="QR Code">
        <p>Healthy Brunch Club - healthybrunchclub.at</p>
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

    this.container.innerHTML = `
      <div class="menu-loader">
        <div class="loader-spinner"></div>
        <p>Aktualisiere...</p>
      </div>
    `;

    await this.init();
  }
}

window.adminManager = new AdminMenuManager();
document.addEventListener('DOMContentLoaded', () => window.adminManager.init());
