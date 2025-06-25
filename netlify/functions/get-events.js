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
          date: getNextMonday(),
          description: "erlebe entspannte lounge-klänge während deines brunches mit unserem special guest dj cosmic kitchen!",
          musicStyle: "downtempo, organic house, world fusion",
          startTime: "9:00 uhr",
          location: "gumpendorfer straße 9, 1060 wien",
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
            
            // Ensure the event has required fields
            if (!data.title || !data.date) {
              console.warn(`Event file ${file} missing required fields`);
              return null;
            }
            
            // Process image path
            let imagePath = '';
            if (data.featuredImage) {
              imagePath = data.featuredImage;
            } else if (data.image) {
              imagePath = data.image;
            }
            
            // Process audio path
            let audioPath = '';
            if (data.audioAnnouncement) {
              audioPath = data.audioAnnouncement;
            } else if (data.audioPreview) {
              audioPath = data.audioPreview;
            }
            
            return {
              title: data.title,
              artist: data.artist || data.title, // Use title as artist if not specified
              date: data.date,
              description: body.trim() || data.description || '',
              location: data.location || 'gumpendorfer straße 9, 1060 wien',
              musicStyle: data.musicStyle || '',
              startTime: data.startTime || '9:00 uhr',
              audioPreview: audioPath,
              audioAnnouncement: audioPath,
              featuredImage: imagePath,
              image: imagePath,
              price: data.price,
              active: data.active !== false // Default to true
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
    
    console.log('Found active events:', activeEvents.length);
    
    // If no events found, return a default upcoming event
    if (activeEvents.length === 0) {
      const defaultEvent = {
        title: "monday vibes",
        artist: "surprise dj",
        date: getNextMonday(),
        description: "jeden montag überraschen wir dich mit großartiger musik zum brunch!",
        location: "gumpendorfer straße 9, 1060 wien",
        musicStyle: "lounge, downtempo, chill",
        startTime: "9:00 uhr",
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
    
    // Return a default event on error
    const fallbackEvent = {
      title: "healthy brunch monday",
      artist: "live music",
      date: getNextMonday(),
      description: "join us for our weekly healthy brunch with live music!",
      location: "gumpendorfer straße 9, 1060 wien",
      startTime: "9:00 uhr",
      active: true
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([fallbackEvent])
    };
  }
};

// Helper function to get next Monday
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  return nextMonday.toISOString();
}
