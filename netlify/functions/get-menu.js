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
    // First try to load from menu-categories (new structure)
    const categoriesDir = path.join(process.cwd(), 'content', 'menu-categories');
    
    console.log('Looking for menu categories directory at:', categoriesDir);
    
    let menuData = [];
    
    try {
      await fs.access(categoriesDir);
      const categoryFiles = await fs.readdir(categoriesDir);
      console.log('Found category files:', categoryFiles);
      
      menuData = await Promise.all(
        categoryFiles
          .filter(file => file.endsWith('.md'))
          .map(async (file) => {
            try {
              const filePath = path.join(categoriesDir, file);
              const content = await fs.readFile(filePath, 'utf8');
              const { data } = matter(content);
              
              console.log('Parsed category file:', file, data);
              
              if (!data.title) {
                console.warn(`Category file ${file} missing title`);
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
              const items = (data.items || []).map(item => ({
                name: item.name || '',
                description: item.description || '',
                price: item.price || '',
                tags: item.tags || [],
                allergens: item.allergens || '',
                available: item.available !== false
              }));
              
              return {
                title: data.title,
                slug: data.slug || file.replace('.md', ''),
                icon: data.icon || '',
                order: data.order || 0,
                image: imagePath,
                description: data.description || '',
                items: items
              };
            } catch (error) {
              console.error('Error parsing category file:', file, error);
              return null;
            }
          })
      );
      
      // Filter out null values and sort by order
      menuData = menuData
        .filter(cat => cat !== null)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
        
    } catch (error) {
      console.log('Categories directory not found, trying legacy menu structure');
      
      // Fallback: Try to load from legacy menu structure
      const menuDir = path.join(process.cwd(), 'content', 'menu');
      
      try {
        await fs.access(menuDir);
        const files = await fs.readdir(menuDir);
        console.log('Found legacy menu files:', files);
        
        // Group legacy menu items by category
        const categoryMap = new Map();
        
        await Promise.all(
          files
            .filter(file => file.endsWith('.md'))
            .map(async (file) => {
              try {
                const filePath = path.join(menuDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const { data } = matter(content);
                
                if (!data.title || !data.category) {
                  return;
                }
                
                const category = data.category;
                if (!categoryMap.has(category)) {
                  categoryMap.set(category, {
                    title: category.toLowerCase(),
                    icon: getCategoryIcon(category),
                    order: getCategoryOrder(category),
                    items: []
                  });
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
                
                categoryMap.get(category).items.push({
                  name: data.title,
                  description: data.description || '',
                  price: data.price ? `€${data.price}` : '',
                  tags: data.tags || [],
                  image: imagePath,
                  available: data.available !== false
                });
                
              } catch (error) {
                console.error('Error parsing legacy menu file:', file, error);
              }
            })
        );
        
        menuData = Array.from(categoryMap.values())
          .sort((a, b) => (a.order || 0) - (b.order || 0));
          
      } catch (legacyError) {
        console.log('Legacy menu directory also not found, using default data');
        
        // Return default menu data if both directories don't exist
        menuData = [
          {
            title: "morning rituals",
            icon: "🌅",
            order: 1,
            items: [
              {
                name: "warmes wasser mit bio-zitrone",
                description: "der perfekte start für deine verdauung",
                tags: ["detox", "vegan"],
                price: "€3",
                available: true
              },
              {
                name: "golden milk latte",
                description: "kurkuma, ingwer, zimt & hafermilch",
                tags: ["anti-inflammatory", "lactosefrei"],
                price: "€5",
                available: true
              }
            ]
          },
          {
            title: "power bowls",
            icon: "🥣",
            order: 2,
            items: [
              {
                name: "açaí sunrise bowl",
                description: "açaí, banane, beeren, granola, kokosflocken",
                tags: ["superfood", "vegan"],
                price: "€12",
                available: true
              },
              {
                name: "premium porridge",
                description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                tags: ["glutenfrei", "protein"],
                price: "€9",
                available: true
              }
            ]
          }
        ];
      }
    }
    
    console.log('Returning menu categories:', menuData.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(menuData)
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

// Helper functions for legacy menu structure
function getCategoryIcon(category) {
  const iconMap = {
    'Vorspeise': '🥗',
    'Hauptgang': '🍽️',
    'Dessert': '🍰',
    'Getränk': '☕',
    'Special': '⭐'
  };
  return iconMap[category] || '🍴';
}

function getCategoryOrder(category) {
  const orderMap = {
    'Vorspeise': 1,
    'Hauptgang': 2,
    'Dessert': 3,
    'Getränk': 4,
    'Special': 5
  };
  return orderMap[category] || 0;
}
