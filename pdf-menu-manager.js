/**
 * PDF Menu & QR Code Manager
 * Handles PDF menu display and QR code generation
 */

class PDFMenuManager {
  constructor() {
    this.pdfData = null;
    this.qrCodeContainer = null;
    this.init();
  }

  async init() {
    try {
      await this.loadPDFMenu();
      this.setupUI();
    } catch (error) {
      console.error('Error initializing PDF Menu Manager:', error);
    }
  }

  async loadPDFMenu() {
    try {
      const response = await fetch('/.netlify/functions/get-menu-pdf');
      const data = await response.json();
      
      if (response.ok && data.pdf_url) {
        this.pdfData = data;
        return data;
      } else {
        console.log('No active PDF menu found');
        return null;
      }
    } catch (error) {
      console.error('Error loading PDF menu:', error);
      return null;
    }
  }

  setupUI() {
    if (!this.pdfData) return;

    const menuSection = document.querySelector('.pdf-menu-content') || document.querySelector('.pdf-menu-section');
    if (menuSection) {
      this.renderPDFMenu(menuSection);
    }

    this.setupModal();
  }

  renderPDFMenu(container) {
    const pdfUrl = this.pdfData.pdf_url;
    const fullPdfUrl = window.location.origin + pdfUrl;

    container.innerHTML = `
      <div class="pdf-menu-card">
        <div class="pdf-menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h3>${this.pdfData.name}</h3>
        ${this.pdfData.description ? `<p class="pdf-description">${this.pdfData.description}</p>` : ''}
        <div class="pdf-actions">
          <a href="${pdfUrl}" target="_blank" class="btn-primary pdf-download-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Menü herunterladen
          </a>
          <button class="btn-secondary qr-code-btn" data-url="${fullPdfUrl}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            QR-Code anzeigen
          </button>
        </div>
        ${this.pdfData.upload_date ? `<p class="upload-date">Aktualisiert: ${new Date(this.pdfData.upload_date).toLocaleDateString('de-AT')}</p>` : ''}
      </div>
    `;

    const qrButton = container.querySelector('.qr-code-btn');
    if (qrButton) {
      qrButton.addEventListener('click', () => this.showQRCode(fullPdfUrl));
    }
  }

  setupModal() {
    if (!document.getElementById('qr-modal')) {
      const modalHTML = `
        <div id="qr-modal" class="qr-modal">
          <div class="qr-modal-content">
            <span class="qr-modal-close">&times;</span>
            <h2>QR-Code für Menü</h2>
            <div id="qr-code-display"></div>
            <p class="qr-instructions">Scannen Sie diesen QR-Code, um das Menü auf Ihrem Smartphone zu öffnen</p>
            <button class="btn-primary download-qr-btn">QR-Code herunterladen</button>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      const modal = document.getElementById('qr-modal');
      const closeBtn = modal.querySelector('.qr-modal-close');
      
      closeBtn.onclick = () => modal.style.display = 'none';
      window.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      };
    }
  }

  showQRCode(url) {
    const modal = document.getElementById('qr-modal');
    const qrDisplay = document.getElementById('qr-code-display');
    
    qrDisplay.innerHTML = '';

    const qrcode = new QRCode(qrDisplay, {
      text: url,
      width: 256,
      height: 256,
      colorDark: '#1E4A3C',
      colorLight: '#FFFBF5',
      correctLevel: QRCode.CorrectLevel.H
    });

    const downloadBtn = modal.querySelector('.download-qr-btn');
    downloadBtn.onclick = () => this.downloadQRCode(qrDisplay);

    modal.style.display = 'block';
  }

  downloadQRCode(container) {
    const canvas = container.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
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
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pdfMenuManager = new PDFMenuManager();
  });
} else {
  window.pdfMenuManager = new PDFMenuManager();
}
