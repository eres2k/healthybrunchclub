const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async function (event, context) {
  const menuPdfUrl = '/.netlify/functions/menu-pdf-url';

  try {
    const menuDir = path.join(process.cwd(), 'content', 'menu');
    const pdfFilePath = path.join(menuDir, 'menu.pdf');
    let selectedEntry = null;

    if (fs.existsSync(menuDir)) {
      const files = fs
        .readdirSync(menuDir)
        .filter((file) => /\.(md|markdown)$/i.test(file));

      const entries = files
        .map((file) => {
          const filePath = path.join(menuDir, file);
          try {
            const { data } = matter.read(filePath);
            return {
              ...data,
              __filePath: filePath,
            };
          } catch (error) {
            console.warn(`Unable to parse menu entry ${file}:`, error);
            return null;
          }
        })
        .filter(Boolean)
        .filter((entry) => entry.menu_file);

      if (entries.length > 0) {
        selectedEntry = entries.sort((a, b) => {
          const dateA = new Date(a.date || a.upload_date || 0).getTime();
          const dateB = new Date(b.date || b.upload_date || 0).getTime();
          return dateB - dateA;
        })[0];
      }
    }

    const fallbackUrl = '/content/menu/menu.pdf';
    const entryPdfPath = selectedEntry?.menu_file
      ? path.join(process.cwd(), selectedEntry.menu_file.replace(/^\//, ''))
      : null;
    const entryPdfExists = entryPdfPath ? fs.existsSync(entryPdfPath) : false;
    const pdfExists = fs.existsSync(pdfFilePath) || entryPdfExists;
    const resolvedUrl = selectedEntry?.menu_file || fallbackUrl;

    if (!pdfExists) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Kein PDF-Menü verfügbar',
          pdf_url: null,
          metadata: selectedEntry || null,
        }),
      };
    }

    const statsPath = entryPdfExists ? entryPdfPath : pdfExists ? pdfFilePath : null;
    const fileStats = statsPath ? fs.statSync(statsPath) : null;
    const uploadDate =
      selectedEntry?.date ||
      selectedEntry?.upload_date ||
      (fileStats ? fileStats.mtime.toISOString() : null);

    const responsePayload = {
      name:
        selectedEntry?.name ||
        selectedEntry?.title ||
        'Speisekarte',
      description: selectedEntry?.description || '',
      pdf_url: resolvedUrl,
      upload_date: uploadDate,
      url: resolvedUrl,
      timestamp: new Date().toISOString(),
      endpoint: menuPdfUrl,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(responsePayload),
    };
  } catch (error) {
    console.error('Error fetching PDF menu:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Fehler beim Laden des PDF-Menüs',
        details: error.message,
      }),
    };
  }
};
