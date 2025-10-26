const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const menuItemsDir = path.join(process.cwd(), 'content', 'menu-items');

    if (!fs.existsSync(menuItemsDir)) {
      fs.mkdirSync(menuItemsDir, { recursive: true });
    }

    const files = fs
      .readdirSync(menuItemsDir)
      .filter((file) => file.endsWith('.json'));

    const menus = files.map((file) => {
      const filePath = path.join(menuItemsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      return {
        ...data,
        id: file.replace(/\.json$/, ''),
        filename: file
      };
    });

    menus.sort((a, b) => (a.order || 0) - (b.order || 0));

    const originalMenuPath = path.join(process.cwd(), 'content', 'menu.pdf');
    if (fs.existsSync(originalMenuPath)) {
      const stats = fs.statSync(originalMenuPath);
      menus.unshift({
        id: 'original-menu',
        title: 'Hauptspeisekarte',
        pdf_file: '/content/menu.pdf',
        description: 'Original Speisekarte',
        date: stats.mtime.toISOString(),
        active: true,
        order: -1,
        isOriginal: true
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        menus,
        count: menus.length
      })
    };
  } catch (error) {
    console.error('Error loading menus:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to load menus',
        details: error.message
      })
    };
  }
};
