const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  try {
    // Ensure the latest PDF is menu.pdf
    await ensureLatestPdfIsMenu();

    const menuPdfPath = path.join(process.cwd(), 'content', 'menu.pdf');

    // Check if menu.pdf exists
    try {
      await fs.access(menuPdfPath);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Menu PDF not found' })
      };
    }

    // Read the PDF file
    const pdfBuffer = await fs.readFile(menuPdfPath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="menu.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error serving menu PDF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to serve menu PDF', details: error.message })
    };
  }
};

async function ensureLatestPdfIsMenu() {
  const contentDir = path.join(process.cwd(), 'content');
  const menuPdfPath = path.join(contentDir, 'menu.pdf');

  try {
    // Find all PDF files in content directory
    const files = await fs.readdir(contentDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('No PDF files found');
      return;
    }

    // Get stats for all PDFs
    const pdfStats = await Promise.all(
      pdfFiles.map(async file => {
        const filePath = path.join(contentDir, file);
        const stat = await fs.stat(filePath);
        return { file, path: filePath, mtime: stat.mtime };
      })
    );

    // Sort by modification time, newest first
    const sortedPdfs = pdfStats.sort((a, b) => b.mtime - a.mtime);
    const latestPdf = sortedPdfs[0];

    // If the latest PDF is not menu.pdf, copy its content to menu.pdf
    if (latestPdf.file !== 'menu.pdf') {
      console.log(`Updating menu.pdf with content from ${latestPdf.file}`);
      const latestContent = await fs.readFile(latestPdf.path);
      await fs.writeFile(menuPdfPath, latestContent);
    }

  } catch (error) {
    console.error('Error ensuring latest PDF is menu.pdf:', error);
  }
}