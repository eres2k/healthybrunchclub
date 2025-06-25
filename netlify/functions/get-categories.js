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
    const categoriesDir = path.join(process.cwd(), 'content', 'categories');
    
    console.log('Looking for categories directory at:', categoriesDir);
    
    // Default categories if directory doesn't exist
    const defaultCategories = [
      { title: 'morning rituals', icon: '🌅', order: 1, active: true },
      { title: 'eggs & stories', icon: '🍳', order: 2, active: true },
      { title: 'power bowls', icon: '🥣', order: 3, active: true },
      { title: 'sweet treats', icon: '🍰', order: 4, active: true },
      { title: 'drinks & juices', icon: '🥤', order: 5, active: true }
    ];
    
    // Check if directory exists
    try {
      await fs.access(categoriesDir);
    } catch (error) {
      console.log('Categories directory not found, returning defaults');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultCategories)
      };
    }
    
    const files = await fs.readdir(categoriesDir);
    console.log('Found category files:', files);
    
    const categories = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(categoriesDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            
            return {
              title: data.title,
              order: data.order || 99,
              description: data.description || '',
              image: data.image || '',
              active: data.active !== false
            };
          } catch (error) {
            console.error('Error parsing category file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and inactive categories, then sort
    const activeCategories = categories
      .filter(cat => cat !== null && cat.active)
      .sort((a, b) => a.order - b.order);
    
    console.log('Returning categories:', activeCategories.length);
    
    // If no categories found, return defaults
    if (activeCategories.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultCategories)
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activeCategories)
    };
    
  } catch (error) {
    console.error('Error in get-categories function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load categories', 
        details: error.message 
      })
    };
  }
};
