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
            },
            {
              name: "matcha zeremonie",
              description: "ceremonial grade matcha, aufgeschäumt",
              tags: ["energy", "antioxidants"]
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
            },
            {
              name: "buddha bowl deluxe",
              description: "quinoa, hummus, grillgemüse, tahini-dressing",
              tags: ["protein-rich", "vegan"]
            }
          ]
        },
        {
          title: "klassiker neu interpretiert",
          icon: "🍳",
          order: 3,
          items: [
            {
              name: "eggs benedict deluxe",
              description: "bio-eier, avocado, spinat, hollandaise",
              tags: ["protein", "vegetarisch"]
            },
            {
              name: "french toast heaven",
              description: "brioche, ahornsirup, beeren, vanillecreme",
              tags: ["süß", "indulgent"]
            },
            {
              name: "avocado toast supreme",
              description: "vollkornbrot, avocado, pochiertes ei, dukkah",
              tags: ["trendy", "instagram-worthy"]
            }
          ]
        },
        {
          title: "drinks & elixiere",
          icon: "🥤",
          order: 4,
          items: [
            {
              name: "immunity booster juice",
              description: "ingwer, kurkuma, orange, karotte",
              tags: ["vitamin c", "detox"]
            },
            {
              name: "green goddess smoothie",
              description: "spinat, banane, mango, spirulina",
              tags: ["superfood", "energie"]
            },
            {
              name: "kombucha selection",
              description: "hausgemachte kombucha, verschiedene sorten",
              tags: ["probiotisch", "erfrischend"]
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
    
    // First, let's try to parse individual menu items from the CMS
    const menuItems = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            
            console.log('Parsed menu file:', file, data);
            
            // Check if this is an individual menu item (has category field)
            if (data.category && data.title) {
              return {
                category: data.category,
                item: {
                  name: data.title,
                  description: data.description || '',
                  price: data.price,
                  available: data.available !== false,
                  tags: data.tags || [],
                  image: data.image
                }
              };
            }
            
            return null;
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values
    const validItems = menuItems.filter(item => item !== null);
    
    // Group items by category
    const categoryMap = {
      'Vorspeise': { title: 'vorspeisen', icon: '🥗', order: 1, items: [] },
      'Hauptgang': { title: 'hauptgänge', icon: '🍳', order: 2, items: [] },
      'Dessert': { title: 'desserts', icon: '🍰', order: 3, items: [] },
      'Getränk': { title: 'getränke', icon: '☕', order: 4, items: [] }
    };
    
    // Add default categories if they don't exist
    const defaultCategories = {
      'morning rituals': { title: 'morning rituals', icon: '🌅', order: 0, items: [] },
      'power bowls': { title: 'power bowls', icon: '🥣', order: 1, items: [] }
    };
    
    // Populate categories with items
    validItems.forEach(({ category, item }) => {
      if (categoryMap[category]) {
        categoryMap[category].items.push(item);
      }
    });
    
    // Convert to array and filter out empty categories
    let menuCategories = Object.values(categoryMap)
      .filter(cat => cat.items.length > 0)
      .sort((a, b) => a.order - b.order);
    
    // If no items found, return default menu
    if (menuCategories.length === 0) {
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
    
    console.log('Returning menu categories:', menuCategories.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(menuCategories)
    };
    
  } catch (error) {
    console.error('Error in get-menu function:', error);
    
    // Return a minimal menu on error
    const fallbackMenu = [
      {
        title: "today's specials",
        icon: "🍽️",
        order: 1,
        items: [
          {
            name: "healthy breakfast bowl",
            description: "a nutritious start to your day",
            tags: ["healthy", "fresh"]
          }
        ]
      }
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackMenu)
    };
  }
};
