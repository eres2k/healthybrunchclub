// netlify/functions/get-menu.js
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  try {
    const menuDir = path.join(process.cwd(), 'content/menu');
    const files = await fs.readdir(menuDir);
    
    const menuCategories = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          const filePath = path.join(menuDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const { data } = matter(content);
          return data;
        })
    );
    
    // Sort by order field
    menuCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
      body: JSON.stringify(menuCategories)
    };
  } catch (error) {
    console.error('Error reading menu files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load menu' })
    };
  }
};