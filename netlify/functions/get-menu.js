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
      
      // Return empty array if directory doesn't exist
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }
    
    const files = await fs.readdir(menuDir);
    console.log('Found menu files:', files);
    
    // Parse individual menu items from CMS
    const menuItems = await Promise.all(
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
            
            // Process audio file path
            let audioPath = '';
            if (data.audioFile) {
              if (data.audioFile.startsWith('http')) {
                audioPath = data.audioFile;
              } else if (data.audioFile.startsWith('/')) {
                audioPath = data.audioFile;
              } else {
                audioPath = `/content/audio/${data.audioFile}`;
              }
            }
            
            // Determine tags based on category and content
            const tags = generateTags(data.title, data.description, data.category);
            
            return {
              name: data.title,
              description: data.description,
              price: data.price ? `€${data.price}` : null,
              category: data.category,
              image: imagePath,
              audioFile: audioPath,
              tags: tags,
              available: data.available !== false
            };
          } catch (error) {
            console.error('Error parsing menu file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and return flat array
    const validItems = menuItems.filter(item => item !== null);
    
    console.log('Returning menu items:', validItems.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validItems)
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

// Helper function to generate tags based on item properties
function generateTags(title, description, category) {
  const tags = [];
  const text = `${title} ${description}`.toLowerCase();
  
  // Category-based tags
  if (category === 'Getränk') {
    if (text.includes('kaffee') || text.includes('coffee')) tags.push('koffein');
    if (text.includes('matcha')) tags.push('energy', 'antioxidants');
    if (text.includes('golden milk') || text.includes('kurkuma')) tags.push('anti-inflammatory');
    if (text.includes('wasser') || text.includes('zitrone')) tags.push('detox');
    if (!text.includes('milch') && !text.includes('milk')) tags.push('vegan');
    if (text.includes('hafermilch') || text.includes('soja') || text.includes('mandel')) tags.push('lactosefrei');
  }
  
  if (category === 'Vorspeise' || category === 'Hauptgang') {
    if (text.includes('açaí') || text.includes('acai')) tags.push('superfood');
    if (text.includes('vegan') || (!text.includes('ei') && !text.includes('egg') && !text.includes('käse') && !text.includes('fleisch'))) tags.push('vegan');
    if (text.includes('glutenfrei') || text.includes('gluten-free')) tags.push('glutenfrei');
    if (text.includes('protein') || text.includes('ei') || text.includes('egg')) tags.push('protein');
    if (text.includes('quinoa') || text.includes('hummus')) tags.push('protein-rich');
  }
  
  if (category === 'Dessert') {
    if (text.includes('raw') || text.includes('roh')) tags.push('raw');
    if (text.includes('sugar-free') || text.includes('zuckerfrei')) tags.push('no-sugar');
    if (text.includes('vegan')) tags.push('vegan');
    tags.push('sweet');
  }
  
  // General tags
  if (text.includes('bio') || text.includes('organic')) tags.push('bio');
  if (text.includes('regional') || text.includes('lokal')) tags.push('regional');
  
  // Return unique tags
  return [...new Set(tags)];
}
