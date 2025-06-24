const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event, context) => {
  try {
    const eventsDir = path.join(process.cwd(), 'content', 'events');
    
    // Prüfe ob das Verzeichnis existiert
    try {
      await fs.access(eventsDir);
    } catch {
      console.error('Events directory not found:', eventsDir);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Events directory not found' })
      };
    }
    
    const files = await fs.readdir(eventsDir);
    console.log('Found event files:', files);
    
    const events = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(eventsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            console.log('Parsed event:', file, data);
            return data;
          } catch (error) {
            console.error('Error parsing event file:', file, error);
            return null;
          }
        })
    );
    
    // Filter active events and sort by date
    const activeEvents = events
      .filter(event => event !== null && event.active)
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
    console.error('Error in get-events function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to load events', 
        details: error.message,
        stack: error.stack 
      })
    };
  }
};
