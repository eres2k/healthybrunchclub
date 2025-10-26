class AdminMenuManager {
  constructor() {
    this.menus = [];
    this.container = document.getElementById('menu-list-container');
  }

  async init() {
    await this.loadMenus();
    this.render();
  }

  async loadMenus() {
    if (!this.container) return;

    try {
      const response = await fetch('/.netlify/functions/get-active-menu');
      if (!response.ok) {
        throw new Error('Netzwerkfehler');
      }
      const data = await response.json();
      this.menus = Array.isArray(data.menus) ? data.menus : [];
    } catch (error) {
      console.error('Error loading menus:', error);
      this.container.innerHTML = '<p style="color: red;">Fehler beim Laden der Menüs</p>';
    }
  }

  render() {
    if (!this.container) return;

    if (this.menus.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p>Keine Speisekarten vorhanden.</p>
          <p><a href="/admin/#/collections/menu-pdfs/new">Erste Speisekarte hochladen →</a></p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.menus
      .map(
        (menu) => `
      <div class="menu-item ${menu.active ? 'active' : ''}">
        <div class="menu-item-info">
          <h4>
            ${menu.title || 'Unbenanntes Menü'}
            ${menu.active ? '<span class="badge badge-active">AKTIV</span>' : ''}
          </h4>
          ${menu.date ? `<p><strong>Datum:</strong> ${new Date(menu.date).toLocaleDateString('de-DE')}</p>` : ''}
          <p><strong>PDF:</strong> <a href="${menu.pdf_file}" target="_blank" rel="noopener">Ansehen</a></p>
          ${menu.description ? `<p><em>${menu.description}</em></p>` : ''}
        </div>
        <div class="menu-item-actions">
          <a href="/admin/#/collections/menu-pdfs/entries/${menu.slug}" class="btn-secondary">
            ✏️ Bearbeiten
          </a>
          <button type="button" onclick="adminMenuManager.viewQR('${(menu.pdf_file || '').replace(/'/g, \\')}', '${String(menu.title || '').replace(/'/g, '&#39;')}')" class="btn-secondary">
            📱 QR anzeigen
          </button>
        </div>
      </div>
    `
      )
      .join('');
  }

  async viewQR(pdfUrl, title) {
    const fullUrl = new URL(pdfUrl, window.location.origin).href;

    try {
      const response = await fetch('/.netlify/functions/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl })
      });
      if (!response.ok) {
        throw new Error('Netzwerkfehler');
      }
      const data = await response.json();
      if (!data.qrCode) {
        throw new Error('QR-Code nicht verfügbar');
      }

      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 500px; width: 100%;">
          <h3 style="color: #1E4A3C; margin-bottom: 20px;">${title || 'QR-Code'}</h3>
          <img src="${data.qrCode}" style="width: 300px; height: 300px; border: 3px solid #1E4A3C; border-radius: 8px; object-fit: contain;" alt="QR Code">
          <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" onclick="this.closest('div').parentElement.parentElement.remove()" style="padding: 10px 20px; background: #DAC196; border: none; border-radius: 6px; cursor: pointer;">
              Schließen
            </button>
            <a href="${data.qrCode}" download="${(title || 'menu').replace(/\s+/g, '-').toLowerCase()}-qr.png" style="padding: 10px 20px; background: #1E4A3C; color: white; border: none; border-radius: 6px; text-decoration: none; display: inline-block;">
              Herunterladen
            </a>
          </div>
        </div>
      `;
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.remove();
        }
      });
      document.body.appendChild(modal);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Fehler beim Generieren des QR-Codes');
    }
  }
}

const adminMenuManagerInstance = new AdminMenuManager();
window.adminMenuManager = adminMenuManagerInstance;
document.addEventListener('DOMContentLoaded', () => adminMenuManagerInstance.init());
