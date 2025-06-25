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
    // Use the correct path for Netlify build environment
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
          image: "/content/images/morning-ritual.jpg",
          items: [
            {
              name: "warmes wasser mit bio-zitrone",
              description: "der perfekte start für deine verdauung",
              tags: ["detox", "vegan"],
              price: 4.9
            },
            {
              name: "golden milk latte",
              description: "kurkuma, ingwer, zimt & hafermilch",
              tags: ["anti-inflammatory", "lactosefrei"],
              price: 6.5
            },
            {
              name: "matcha zeremonie",
              description: "ceremonial grade matcha, aufgeschäumt mit hafermilch",
              tags: ["energy", "vegan"],
              price: 7.9
            }
          ]
        },
        {
          title: "power bowls",
          icon: "🥣",
          order: 2,
          image: "/content/images/power-bowl.jpg",
          items: [
            {
              name: "açaí sunrise bowl",
              description: "açaí, banane, beeren, granola, kokosflocken",
              tags: ["superfood", "vegan"],
              price: 12.9
            },
            {
              name: "premium porridge",
              description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
              tags: ["glutenfrei", "protein"],
              price: 9.9
            },
            {
              name: "buddha bowl deluxe",
              description: "quinoa, hummus, grillgemüse, tahini-dressing",
              tags: ["protein", "vegan"],
              price: 14.9
            }
          ]
        },
        {
          title: "healthy toasts",
          icon: "🍞",
          order: 3,
          image: "/content/images/toast.jpg",
          items: [
            {
              name: "avocado dream toast",
              description: "vollkornbrot, avocado, pochiertes ei, kresse, limette",
              tags: ["vegetarisch", "protein"],
              price: 11.9
            },
            {
              name: "hummus power toast",
              description: "sauerteigbrot, hausgemachter hummus, gegrilltes gemüse, granatapfel",
              tags: ["vegan", "protein"],
              price: 10.9
            },
            {
              name: "salmon wellness toast",
              description: "dinkelbrot, frischkäse, räucherlachs, dill, kapern",
              tags: ["omega-3", "protein"],
              price: 13.9
            }
          ]
        },
        {
          title: "fresh juices",
          icon: "🥤",
          order: 4,
          image: "/content/images/juices.jpg",
          items: [
            {
              name: "green detox",
              description: "spinat, gurke, apfel, sellerie, ingwer, zitrone",
              tags: ["detox", "vegan", "raw"],
              price: 7.9
            },
            {
              name: "immunity booster",
              description: "orange, karotte, ingwer, kurkuma, schwarzer pfeffer",
              tags: ["vitamin-c", "vegan"],
              price: 7.5
            },
            {
              name: "berry antioxidant",
              description: "heidelbeeren, himbeeren, erdbeeren, acai, kokoswasser",
              tags: ["antioxidants", "vegan", "superfood"],
              price: 8.9
            }
          ]
        },
        {
          title: "specialty coffee",
          icon: "☕",
          order: 5,
          image: "/content/images/coffee.jpg",
          items: [
            {
              name: "flat white",
              description: "doppelter espresso mit samtiger mikromilch",
              tags: ["koffein"],
              price: 4.5
            },
            {
              name: "oat cappuccino",
              description: "single origin espresso mit cremiger hafermilch",
              tags: ["lactosefrei"],
              price: 4.9
            },
            {
              name: "iced vanilla latte",
              description: "cold brew, vanillesirup, mandelmilch, eiswürfel",
              tags: ["koffein", "lactosefrei"],
              price: 5.5
            }
          ]
        },
        {
          title: "sweet treats",
          icon: "🧁",
          order: 6,
          image: "/content/images/sweets.jpg",
          items: [
            {
              name: "raw energy balls",
              description: "datteln, mandeln, kakao, kokos (3 stück)",
              tags: ["raw", "vegan", "glutenfrei"],
              price: 6.9
            },
            {
              name: "chia pudding deluxe",
              description: "chiasamen, mandelmilch, beeren, mandelmus, agavensirup",
              tags: ["vegan", "glutenfrei", "protein"],
              price: 7.9
            },
            {
              name: "banana bread slice",
              description: "hausgemachtes bananenbrot mit walnüssen",
              tags: ["vegetarisch"],
              price: 4.5
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
            
            // Process image path - ensure it's properly formatted
            let imagePath = '';
            if (data.image) {
              // Handle both relative and absolute paths
              if (data.image.startsWith('http')) {
                imagePath = data.image;
              } else if (data.image.startsWith('/')) {
                imagePath = data.image;
              } else {
                imagePath = `/content/images/${data.image}`;
              }
            }
            
            return {
              title: data.title,
              icon: data.icon || '',
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
