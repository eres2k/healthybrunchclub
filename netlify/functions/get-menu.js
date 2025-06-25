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
      
      // Return default categories if directory doesn't exist
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }
    
    const files = await fs.readdir(menuDir);
    console.log('Found menu files:', files);
    
    const menuCategories = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Check if this is a category with items or a single item
            if (data.items && Array.isArray(data.items)) {
              // This is a category with multiple items
              return {
                title: data.title || '',
                icon: data.icon || '',
                order: data.order || 999,
                image: data.image || '',
                items: data.items.map(item => ({
                  name: item.name || '',
                  description: item.description || '',
                  price: item.price ? `€${item.price}` : '',
                  tags: item.tags || []
                }))
              };
            } else {
              // This is a single item - convert to category format
              return {
                title: data.category || 'Sonstiges',
                icon: '',
                order: 999,
                image: data.image || '',
                items: [{
                  name: data.title || '',
                  description: data.description || '',
                  price: data.price ? `€${data.price}` : '',
                  tags: data.available ? ['verfügbar'] : []
                }]
              };
            }
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and merge categories with same title
    const validCategories = menuCategories.filter(cat => cat !== null);
    
    // Merge categories with the same title
    const mergedCategories = {};
    validCategories.forEach(cat => {
      if (!mergedCategories[cat.title]) {
        mergedCategories[cat.title] = cat;
      } else {
        // Merge items
        mergedCategories[cat.title].items = [
          ...mergedCategories[cat.title].items,
          ...cat.items
        ];
      }
    });
    
    // Convert back to array and sort by order
    const finalCategories = Object.values(mergedCategories)
      .sort((a, b) => (a.order || 999) - (b.order || 999));
    
    console.log('Returning menu categories:', finalCategories.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(finalCategories)
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
