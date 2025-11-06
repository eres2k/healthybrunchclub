const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const matter = require('gray-matter');

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Failed to ensure directory exists:', dirPath, error);
  }
}

async function loadMenuData(menuType) {
  const menuDir = path.join(process.cwd(), 'content', `${menuType}-menu`);

  try {
    const files = await fs.readdir(menuDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    if (markdownFiles.length === 0) {
      return null;
    }

    const menus = await Promise.all(
      markdownFiles.map(async (file) => {
        try {
          const filePath = path.join(menuDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const { data } = matter(content);
          return { ...data, filename: file };
        } catch (error) {
          console.error(`Failed to parse menu file ${file}:`, error);
          return null;
        }
      })
    );

    const activeMenus = menus
      .filter((menu) => menu && menu.active)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return activeMenus[0] || null;
  } catch (error) {
    console.error(`Error loading menu data for ${menuType}:`, error);
    return null;
  }
}

async function generateQRCode(url) {
  if (!url) return null;

  try {
    return await QRCode.toDataURL(url, {
      width: 150,
      margin: 1,
      color: {
        dark: '#1E4A3C',
        light: '#FFFBF5',
      },
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
    return null;
  }
}

async function createMenuPDF(menuData, menuType) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const colors =
      menuType === 'kids'
        ? {
            primary: '#FFB5A7',
            secondary: '#B8D4B2',
            text: '#1E4A3C',
            accent: '#F8AD9D',
          }
        : {
            primary: '#1E4A3C',
            secondary: '#8B9474',
            text: '#1E4A3C',
            accent: '#DAC196',
          };

    doc
      .fontSize(32)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text(menuData.title || (menuType === 'kids' ? 'Kids Menü' : 'Speisekarte'), {
        align: 'center',
      });

    if (menuData.subtitle) {
      doc
        .moveDown(0.5)
        .fontSize(14)
        .fillColor(colors.text)
        .font('Helvetica')
        .text(menuData.subtitle, { align: 'center' });
    }

    doc.moveDown(1.5);

    (menuData.categories || []).forEach((category, catIndex) => {
      if (!category) return;

      if (catIndex > 0) {
        doc.moveDown(1.25);
      }

      const icon = menuType === 'kids' ? category.icon || '🍽️' : '';
      doc
        .fontSize(20)
        .fillColor(colors.secondary)
        .font('Helvetica-Bold')
        .text(`${icon ? `${icon} ` : ''}${category.name || 'Kategorie'}`, {
          underline: false,
        });

      doc.moveDown(0.5);

      (category.items || []).forEach((item) => {
        if (!item) return;

        const startY = doc.y;
        doc
          .fontSize(14)
          .fillColor(colors.text)
          .font('Helvetica-Bold')
          .text(item.name || 'Unbenanntes Gericht', { continued: false });

        if (item.price) {
          doc
            .fontSize(14)
            .fillColor(colors.primary)
            .font('Helvetica-Bold')
            .text(`€ ${String(item.price).trim()}`, 450, startY, {
              width: 100,
              align: 'right',
            });
        }

        if (item.description) {
          doc
            .moveDown(0.2)
            .fontSize(11)
            .fillColor(colors.text)
            .font('Helvetica')
            .text(item.description, { width: 400 });
        }

        const extras = [];
        if (item.allergens) extras.push(`Allergene: ${item.allergens}`);
        if (item.vegetarian) extras.push('🌱 Vegetarisch');

        if (extras.length > 0) {
          doc
            .moveDown(0.1)
            .fontSize(9)
            .fillColor('#666666')
            .font('Helvetica-Oblique')
            .text(extras.join(' | '), { width: 400 });
        }

        doc.moveDown(0.8);

        if (doc.y > 700) {
          doc.addPage();
        }
      });
    });

    doc.addPage();

    if (menuData.footer) {
      doc
        .fontSize(10)
        .fillColor('#666666')
        .font('Helvetica')
        .text(menuData.footer, { align: 'center' });
    } else {
      doc
        .fontSize(10)
        .fillColor('#666666')
        .font('Helvetica')
        .text('Alle Preise in Euro. Änderungen vorbehalten.', { align: 'center' });
    }

    if (menuData.qrCodeUrl) {
      try {
        const qrImage = await generateQRCode(menuData.qrCodeUrl);
        if (qrImage) {
          const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');
          doc.image(qrBuffer, 230, doc.y + 20, { width: 120 });
          doc.moveDown(6);
          doc
            .fontSize(10)
            .fillColor(colors.text)
            .text('Scanne für Online-Menü', { align: 'center' });
        }
      } catch (error) {
        console.error('Failed to embed QR code:', error);
      }
    }

    doc
      .fontSize(12)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text('Healthy Brunch Club Wien', 50, 750, { align: 'center' });

    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica')
      .text('www.healthybrunchclub.at', { align: 'center' });

    doc.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { menuType = 'regular' } = event.queryStringParameters || {};

    if (!['regular', 'kids'].includes(menuType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid menu type. Use "regular" or "kids"' }),
      };
    }

    const menuData = await loadMenuData(menuType);

    if (!menuData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `No active ${menuType} menu found` }),
      };
    }

    const pdfBuffer = await createMenuPDF(menuData, menuType);

    const contentDir = path.join(process.cwd(), 'content');
    await ensureDirectoryExists(contentDir);

    const outputFilename = menuType === 'kids' ? 'kidsmenu.pdf' : 'menu.pdf';
    const outputPath = path.join(contentDir, outputFilename);

    await fs.writeFile(outputPath, pdfBuffer);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${menuType}-menu.pdf"`,
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'PDF generation failed', details: error.message }),
    };
  }
};
