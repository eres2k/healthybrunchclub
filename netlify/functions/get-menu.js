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
      
      // Return default menu data if directory doesn't exist
      const defaultMenu = [
        {
          title: "morning rituals",
          icon: "🌅",
          order: 1,
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
          title: "eggs & stories",
          icon: "🍳",
          order: 2,
          items: [
            {
              name: "classic eggs benedict",
              description: "pochierte bio-eier, sauce hollandaise, spinat",
              tags: ["protein", "klassiker"]
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
    
    // Create a map to group items by category
    const categoryMap = new Map();
    
    // Define category metadata (icons and order)
    const categoryMetadata = {
      'morning rituals': { icon: '🌅', order: 1 },
      'eggs & stories': { icon: '🍳', order: 2 },
      'power bowls': { icon: '🥣', order: 3 },
      'sweet treats': { icon: '🍰', order: 4 },
      'drinks & juices': { icon: '🥤', order: 5 },
      'specials': { icon: '✨', order: 6 },
      'sonstiges': { icon: '🍴', order: 99 }
    };
    
    // Process each menu item file
    await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Skip items that are not available
            if (data.available === false) {
              return;
            }
            
            // Create menu item object
            const menuItem = {
              name: data.title || '',
              description: data.description || '',
              price: data.price ? `€${data.price}` : '',
              tags: []
            };
            
            // Add tags based on data
            if (data.audioFile) {
              menuItem.tags.push('audio preview');
            }
            
            // Get or create category
            const category = data.category || 'sonstiges';
            
            if (!categoryMap.has(category)) {
              const metadata = categoryMetadata[category] || { 
                icon: '🍴', 
                order: 99
              };
              
              categoryMap.set(category, {
                title: category,
                icon: metadata.icon,
                order: metadata.order,
                items: []
              });
            }
            
            // Add item to category
            categoryMap.get(category).items.push(menuItem);
            
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
          }
        })
    );
    
    // Convert map to array and sort
    const menuCategories = Array.from(categoryMap.values())
      .sort((a, b) => a.order - b.order);
    
    console.log('Returning menu categories:', menuCategories.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(menuCategories)
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
