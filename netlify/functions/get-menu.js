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
    // WICHTIG: Neuer Pfad für menu-categories
    const menuDir = path.join(process.cwd(), 'content', 'menu-categories');
    
    console.log('Looking for menu directory at:', menuDir);
    
    // Check if directory exists
    try {
      await fs.access(menuDir);
    } catch (error) {
      console.error('Menu directory not found:', menuDir);
      
      // Return default menu data if directory doesn't exist
      const defaultMenu = [
        {
          title: "morning rituals",
          order: 1,
          image: "/images/uploads/morning-ritual.jpg",
          items: [
            {
              name: "warmes wasser mit bio-zitrone",
              description: "der perfekte start für deine verdauung",
              tags: ["detox", "vegan"]
            },
            {
              name: "golden milk latte",
              description: "kurkuma, ingwer, zimt & hafermilch",
              tags: ["anti-inflammatory", "lactosefrei"]
            }
          ]
        },
        {
          title: "power bowls",
          order: 2,
          image: "/images/uploads/power-bowl.jpg",
          items: [
            {
              name: "açaí sunrise bowl",
              description: "açaí, banane, beeren, granola, kokosflocken",
              tags: ["superfood", "vegan"]
            },
            {
              name: "premium porridge",
              description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
              tags: ["glutenfrei", "protein"]
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
            const { data } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Ensure the category has the required structure
            if (!data.title) {
              console.warn(`Menu file ${file} missing title`);
              return null;
            }
            
            // Process image path
            let imagePath = '';
            if (data.image) {
              imagePath = data.image;
              // Ensure path starts with /
              if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                imagePath = '/' + imagePath;
              }
            }
            
            return {
              title: data.title,
              order: data.order || 0,
              image: imagePath,
              items: data.items || []
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
    
    console.log('Returning menu categories:', validCategories.length);
    
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
