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
      
      // Return default menu data
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
          title: "power bowls",
          icon: "🥣",
          order: 2,
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
    
    // Parse individual menu items from markdown files
    const menuItems = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            if (!data.title) {
              console.warn(`Menu file ${file} missing title`);
              return null;
            }
            
            // Create a menu item from the markdown frontmatter
            return {
              name: data.title,
              description: data.description || '',
              category: data.category || 'Sonstiges',
              price: data.price,
              available: data.available !== false,
              image: data.image || '',
              audioFile: data.audioFile || '',
              tags: [] // You could derive tags from category or other fields
            };
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values
    const validItems = menuItems.filter(item => item !== null && item.available);
    
    // Group items by category
    const categoriesMap = new Map();
    
    validItems.forEach(item => {
      const category = item.category.toLowerCase();
      
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          title: category,
          icon: getCategoryIcon(category),
          order: getCategoryOrder(category),
          items: []
        });
      }
      
      categoriesMap.get(category).items.push({
        name: item.name.toLowerCase(),
        description: item.description.toLowerCase(),
        price: item.price ? `€${item.price}` : '',
        tags: getTags(item)
      });
    });
    
    // Convert map to array and sort by order
    const menuCategories = Array.from(categoriesMap.values())
      .sort((a, b) => a.order - b.order);
    
    console.log('Returning menu categories:', menuCategories);
    
    // If no categories found, return default menu
    if (menuCategories.length === 0) {
      const defaultMenu = [
        {
          title: "morning rituals",
          icon: "🌅",
          order: 1,
          items: [
            {
              name: "kaffee",
              description: "TEST",
              price: "€100",
              tags: ["heißgetränk"]
            }
          ]
        },
        {
          title: "vorspeisen",
          icon: "🥗",
          order: 2,
          items: [
            {
              name: "noch was",
              description: "test",
              price: "€50",
              tags: ["starter"]
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

// Helper function to get category icon
function getCategoryIcon(category) {
  const icons = {
    'vorspeise': '🥗',
    'hauptgang': '🍽️',
    'dessert': '🍰',
    'getränk': '☕',
    'frühstück': '🌅',
    'bowl': '🥣',
    'smoothie': '🥤'
  };
  
  return icons[category.toLowerCase()] || '🍴';
}

// Helper function to get category order
function getCategoryOrder(category) {
  const order = {
    'frühstück': 1,
    'vorspeise': 2,
    'bowl': 3,
    'hauptgang': 4,
    'dessert': 5,
    'getränk': 6,
    'smoothie': 7
  };
  
  return order[category.toLowerCase()] || 99;
}

// Helper function to generate tags
function getTags(item) {
  const tags = [];
  
  // Add tags based on category
  if (item.category === 'Getränk') {
    if (item.name.includes('kaffee') || item.name.includes('coffee')) {
      tags.push('koffein');
    }
    if (item.name.includes('tee') || item.name.includes('tea')) {
      tags.push('teein');
    }
  }
  
  // Add price range tags
  if (item.price) {
    if (item.price < 10) tags.push('budget');
    else if (item.price > 50) tags.push('premium');
  }
  
  return tags;
}
