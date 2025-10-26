const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  try {
    const menuPdfDir = path.join(process.cwd(), 'content', 'menu-pdf');
    
    if (!fs.existsSync(menuPdfDir)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Kein PDF-Menü verfügbar',
          pdf: null 
        })
      };
    }

    const files = fs.readdirSync(menuPdfDir)
      .filter(file => file.endsWith('.md'));

    if (files.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Kein PDF-Menü verfügbar',
          pdf: null 
        })
      };
    }

    const menus = files.map(file => {
      const filePath = path.join(menuPdfDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      return data;
    }).filter(menu => menu.active);

    if (menus.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Kein aktives PDF-Menü verfügbar',
          pdf: null 
        })
      };
    }

    const latestMenu = menus.sort((a, b) => 
      new Date(b.upload_date) - new Date(a.upload_date)
    )[0];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        name: latestMenu.name,
        description: latestMenu.description,
        pdf_url: latestMenu.pdf_file,
        upload_date: latestMenu.upload_date
      })
    };
  } catch (error) {
    console.error('Error fetching PDF menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Fehler beim Laden des PDF-Menüs',
        details: error.message 
      })
    };
  }
};
