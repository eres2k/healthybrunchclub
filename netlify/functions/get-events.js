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
    const eventsDir = path.join(process.cwd(), 'content', 'events');
    
    console.log('Looking for events directory at:', eventsDir);
    
    // Check if directory exists
    try {
      await fs.access(eventsDir);
    } catch (error) {
      console.error('Events directory not found:', eventsDir);
      
      // Return default event data if directory doesn't exist
      const defaultEvents = [
        {
          title: "next monday special",
          artist: "dj cosmic kitchen",
          date: "2025-01-27T09:00:00+01:00",
          description: "erlebe entspannte lounge-klänge während deines brunches mit unserem special guest dj cosmic kitchen!",
          musicStyle: "downtempo, organic house, world fusion",
          startTime: "9:00 uhr",
          audioPreview: "/dj-preview.mp3",
          active: true
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultEvents.filter(event => event.active))
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
            
            console.log('Parsed event file:', file, data);
            
            // Ensure the event has the required structure
            if (!data.title || !data.date) {
              console.warn(`Event file ${file} missing required fields`);
              return null;
            }
            
            return {
              title: data.title,
              artist: data.artist || '',
              date: data.date,
              description: data.description || '',
              musicStyle: data.musicStyle || '',
              startTime: data.startTime || '',
              audioPreview: data.audioPreview || '',
              active: data.active !== false // Default to true unless explicitly set to false
            };
          } catch (error) {
            console.error('Error parsing event file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and only return active events
    const activeEvents = events
      .filter(event => event !== null && event.active)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Returning active events:', activeEvents.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activeEvents)
    };
    
  } catch (error) {
    console.error('Error in get-events function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load events', 
        details: error.message 
      })
    };
  }
};

// package.json dependencies you'll need
/*
{
  "dependencies": {
    "gray-matter": "^4.0.3"
  }
}
*/
