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
    
    try {
      await fs.access(menuDir);
    } catch (error) {
      console.error('Menu directory not found:', menuDir);
      
      // Return default menu data if directory doesn't exist
      const defaultMenu = [
        {
          title: "morning rituals",
          icon: "🌅",
          order: 1,
          available: true,
          items: [
            {
              name: "warmes wasser mit bio-zitrone",
              description: "der perfekte start für deine verdauung",
              price: "€3",
              tags: ["detox", "vegan"],
              available: true
            },
            {
              name: "golden milk latte",
              description: "kurkuma, ingwer, zimt & hafermilch",
              price: "€5",
              tags: ["anti-inflammatory", "lactosefrei"],
              available: true
            }
          ]
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultMenu)
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
            const { data, content: markdownContent } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Skip if category is not available or missing title
            if (!data.title || data.available === false) {
              console.log(`Skipping unavailable category: ${file}`);
              return null;
            }
            
            // Process image path
            let imagePath = '';
            if (data.image) {
              if (data.image.startsWith('http')) {
                imagePath = data.image;
              } else if (data.image.startsWith('/')) {
                imagePath = data.image;
              } else {
                imagePath = `/content/images/${data.image}`;
              }
            }
            
            // Process menu items
            const items = (data.items || [])
              .filter(item => item.available !== false) // Only show available items
              .map(item => ({
                name: item.name || '',
                description: item.description || '',
                price: item.price || '',
                tags: Array.isArray(item.tags) ? item.tags : [],
                allergens: item.allergens || '',
                available: item.available !== false
              }));
            
            // Skip categories with no available items
            if (items.length === 0) {
              console.log(`Skipping category with no available items: ${file}`);
              return null;
            }
            
            return {
              title: data.title,
              slug: data.slug || file.replace('.md', ''),
              icon: data.icon || '🍴',
              order: data.order || 0,
              image: imagePath,
              description: data.description || '',
              content: markdownContent || '',
              available: data.available !== false,
              items: items
            };
            
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and sort by order
    const validCategories = menuCategories
      .filter(cat => cat !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    console.log(`Returning ${validCategories.length} menu categories`);
    
    // Log the structure for debugging
    validCategories.forEach(cat => {
      console.log(`Category: ${cat.title}, Items: ${cat.items.length}`);
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validCategories)
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
