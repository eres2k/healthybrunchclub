const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const menuDir = path.join(process.cwd(), 'content', 'menu');
    
    console.log('Looking for menu directory at:', menuDir);
    
    // Check if directory exists
    try {
      await fs.access(menuDir);
    } catch (error) {
      console.error('Menu directory not found:', menuDir);
      
      // Return empty array if directory doesn't exist
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }
    
    const files = await fs.readdir(menuDir);
    console.log('Found menu files:', files);
    
    const menuItems = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data, content: bodyContent } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Return the menu item with all its data
            return {
              title: data.title || '',
              description: data.description || '',
              price: data.price || null,
              category: data.category || 'Sonstiges',
              image: data.image || '',
              available: data.available !== false,
              audioFile: data.audioFile || '',
              body: bodyContent || ''
            };
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and only return available items
    const validMenuItems = menuItems
      .filter(item => item !== null && item.available);
    
    console.log('Returning menu items:', validMenuItems.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validMenuItems)
    };
    
  } catch (error) {
    console.error('Error in get-menu function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load menu', 
        details: error.message 
      })
    };
  }
};
