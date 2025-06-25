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
      
      // Return default event data
      const defaultEvents = [
        {
          title: "next monday special",
          artist: "dj cosmic kitchen",
          date: getNextMonday(),
          description: "erlebe entspannte lounge-klänge während deines brunches!",
          musicStyle: "downtempo, organic house",
          startTime: "9:00 uhr",
          active: true
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultEvents)
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
            const { data, content: body } = matter(content);
            
            console.log('Parsed event file:', file, data);
            
            if (!data.title || !data.date) {
              console.warn(`Event file ${file} missing required fields`);
              return null;
            }
            
            // Process the event data from the markdown file
            return {
              title: data.title.toLowerCase(),
              artist: data.title, // Using title as artist name from the example
              date: data.date,
              location: data.location || 'Wien',
              description: body.trim() || data.description || '',
              musicStyle: data.musicStyle || 'electronic, lounge',
              startTime: data.startTime || '9:00 uhr',
              price: data.price,
              featuredImage: data.featuredImage || '',
              audioAnnouncement: data.audioAnnouncement || '',
              active: true // Assuming all events in the folder are active
            };
          } catch (error) {
            console.error('Error parsing event file:', file, error);
            return null;
          }
        })
    );
    
    // Filter out null values and only return future events
    const now = new Date();
    const activeEvents = events
      .filter(event => event !== null)
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Returning active events:', activeEvents.length);
    
    // If no events found, return a default upcoming event
    if (activeEvents.length === 0) {
      const defaultEvent = {
        title: "dj osive",
        artist: "DJ OSIVE",
        date: "2025-06-30T19:00:37.689Z",
        location: "Wien",
        description: "Bester DJ",
        musicStyle: "electronic, house",
        startTime: "19:00 uhr",
        featuredImage: "/images/uploads/osive.png",
        audioAnnouncement: "/images/uploads/artist1.mp3",
        active: true
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([defaultEvent])
      };
    }
    
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

// Helper function to get next Monday
function getNextMonday() {
  const today = new Date();
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  return nextMonday.toISOString();
}
