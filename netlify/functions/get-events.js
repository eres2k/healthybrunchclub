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
      
      // Return empty array if directory doesn't exist
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
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
            const { data, content: bodyContent } = matter(content);
            
            console.log('Parsed event file:', file, data);
            
            // Return event with all possible field names
            return {
              // Standard fields
              title: data.title || data['Event Titel'] || '',
              date: data.date || data.Datum || new Date().toISOString(),
              location: data.location || data.Ort || '',
              description: data.description || data.Beschreibung || bodyContent || '',
              
              // Image fields (check multiple possible names)
              image: data.image || data.featuredImage || data.Bild || '',
              featuredImage: data.featuredImage || data.image || data.Bild || '',
              
              // Audio fields (check multiple possible names)
              audioPreview: data.audioPreview || data.audioAnnouncement || data['Audio Preview'] || data['Audio Ankündigung'] || '',
              audioAnnouncement: data.audioAnnouncement || data.audioPreview || data['Audio Ankündigung'] || '',
              
              // Additional fields
              price: data.price || data.Preis || null,
              artist: data.artist || '',
              musicStyle: data.musicStyle || '',
              startTime: data.startTime || '',
              
              // Content body
              body: bodyContent || '',
              
              // Status
              active: data.active !== false
            };
          } catch (error) {
            console.error('Error parsing event file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and sort by date
    const validEvents = events
      .filter(event => event !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Returning events:', validEvents.length);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validEvents)
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
