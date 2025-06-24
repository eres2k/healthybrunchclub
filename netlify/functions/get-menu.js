const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  try {
    // Verwende process.cwd() für den korrekten Pfad in Netlify
    const menuDir = path.join(process.cwd(), 'content', 'menu');
    
    // Prüfe ob das Verzeichnis existiert
    try {
      await fs.access(menuDir);
    } catch {
      console.error('Menu directory not found:', menuDir);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Menu directory not found' })
      };
    }
    
    const files = await fs.readdir(menuDir);
    console.log('Found files:', files);
    
    const menuCategories = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            console.log('Parsed file:', file, data);
            return data;
          } catch (error) {
            console.error('Error parsing file:', file, error);
            return null;
          }
        })
    );
    
    // Filtere null-Werte und sortiere
    const validCategories = menuCategories
      .filter(cat => cat !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(validCategories)
    };
  } catch (error) {
    console.error('Error in get-menu function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to load menu', 
        details: error.message,
        stack: error.stack 
      })
    };
  }
};
