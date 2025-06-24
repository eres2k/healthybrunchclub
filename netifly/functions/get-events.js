// netlify/functions/get-events.js
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  try {
    const eventsDir = path.join(process.cwd(), 'content/events');
    const files = await fs.readdir(eventsDir);
    
    const events = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          const filePath = path.join(eventsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const { data } = matter(content);
          return data;
        })
    );
    
    // Filter active events and sort by date
    const activeEvents = events
      .filter(event => event.active)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(activeEvents)
    };
  } catch (error) {
    console.error('Error reading event files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load events' })
    };
  }
};