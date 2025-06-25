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
    let menuItems = [];
    
    try {
      await fs.access(menuDir);
      const files = await fs.readdir(menuDir);
      console.log('Found menu files:', files);
      
      // Parse each markdown file
      const parsedItems = await Promise.all(
        files
          .filter(file => file.endsWith('.md'))
          .map(async (file) => {
            try {
              const filePath = path.join(menuDir, file);
              const content = await fs.readFile(filePath, 'utf8');
              const { data } = matter(content);
              
              console.log('Parsed menu file:', file, data);
              
              // Ensure the item has required fields
              if (!data.title) {
                console.warn(`Menu file ${file} missing title`);
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
              
              // Format price properly
              let formattedPrice = '';
              if (data.price) {
                if (typeof data.price === 'number') {
                  formattedPrice = `€${(data.price / 100).toFixed(2)}`;
                } else {
                  formattedPrice = data.price;
                }
              }
              
              return {
                name: data.title,
                description: data.description || '',
                price: formattedPrice,
                category: data.category || 'Uncategorized',
                image: imagePath,
                available: data.available !== false,
                tags: data.tags || [],
                allergens: data.allergens || []
              };
            } catch (error) {
              console.error('Error parsing menu file:', file, error);
              return null;
            }
          })
      );
      
      // Filter out null values
      menuItems = parsedItems.filter(item => item !== null);
      
    } catch (error) {
      console.error('Menu directory not found:', menuDir);
    }
    
    // Group items by category and create structured menu
    const categorizedMenu = {};
    
    menuItems.forEach(item => {
      if (!categorizedMenu[item.category]) {
        categorizedMenu[item.category] = {
          title: getCategoryDisplayName(item.category),
          icon: getCategoryIcon(item.category),
          order: getCategoryOrder(item.category),
          items: []
        };
      }
      
      categorizedMenu[item.category].items.push({
        name: item.name,
        description: item.description,
        price: item.price,
        tags: Array.isArray(item.tags) ? item.tags : [],
        available: item.available,
        image: item.image,
        allergens: item.allergens
      });
    });
    
    // Convert to array
    let menuArray = Object.values(categorizedMenu);
    
    // Add default "morning rituals" category if no items exist
    if (menuArray.length === 0 || !menuArray.find(cat => cat.title.toLowerCase().includes('morning'))) {
      menuArray.unshift({
        title: "morning rituals",
        icon: "🌅",
        order: 1,
        items: [
          {
            name: "warmes wasser mit bio-zitrone",
            description: "der perfekte start für deine verdauung und den stoffwechsel",
            price: "€3.00",
            tags: ["detox", "vegan", "alkalisierend"],
            available: true,
            allergens: []
          },
          {
            name: "golden milk latte",
            description: "kurkuma, ingwer, zimt, schwarzer pfeffer mit hafermilch",
            price: "€5.50",
            tags: ["anti-inflammatory", "lactosefrei", "ayurvedisch"],
            available: true,
            allergens: []
          },
          {
            name: "matcha zeremonie",
            description: "ceremonial grade matcha, aufgeschäumt mit traditionellem bambusquirl",
            price: "€6.00",
            tags: ["energy", "antioxidants", "ritual"],
            available: true,
            allergens: []
          }
        ]
      });
    }
    
    // Add "power bowls" category if not present
    if (!menuArray.find(cat => cat.title.toLowerCase().includes('bowl'))) {
      menuArray.push({
        title: "power bowls",
        icon: "🥣",
        order: 2,
        items: [
          {
            name: "açaí sunrise bowl",
            description: "açaí, banane, beeren, granola, kokosflocken, chiasamen",
            price: "€12.90",
            tags: ["superfood", "vegan", "antioxidants"],
            available: true,
            allergens: ["nüsse"]
          },
          {
            name: "premium porridge",
            description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln, ahornsirup",
            price: "€9.50",
            tags: ["glutenfrei", "protein", "fiber"],
            available: true,
            allergens: ["nüsse", "gluten"]
          },
          {
            name: "buddha bowl deluxe",
            description: "quinoa, hummus, geröstetes gemüse, avocado, tahini-dressing",
            price: "€14.50",
            tags: ["protein-rich", "vegan", "vollwertig"],
            available: true,
            allergens: ["sesam"]
          }
        ]
      });
    }
    
    // Sort by order
    menuArray.sort((a, b) => (a.order || 999) - (b.order || 999));
    
    console.log('Returning structured menu with', menuArray.length, 'categories');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(menuArray)
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

// Helper functions for category mapping
function getCategoryDisplayName(category) {
  const mapping = {
    'Vorspeise': 'appetizer & starters',
    'Hauptgang': 'main bowls', 
    'Dessert': 'sweet treats',
    'Getränk': 'beverages & elixirs'
  };
  return mapping[category] || category.toLowerCase();
}

function getCategoryIcon(category) {
  const mapping = {
    'Vorspeise': '🥗',
    'Hauptgang': '🍲',
    'Dessert': '🍯',
    'Getränk': '☕'
  };
  return mapping[category] || '🍴';
}

function getCategoryOrder(category) {
  const mapping = {
    'morning rituals': 1,
    'Vorspeise': 2,
    'Hauptgang': 3,
    'power bowls': 4,
    'Getränk': 5,
    'Dessert': 6
  };
  return mapping[category] || 999;
}
