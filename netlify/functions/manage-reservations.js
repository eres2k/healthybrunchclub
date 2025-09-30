const {
  loadReservationsForDate,
  saveReservationsForDate,
  calculateAvailability
} = require('./utils/reservation-utils');
const BlobStorage = require('./utils/blob-storage');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Verify admin authentication
 */
function verifyAdmin(event) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  const adminToken = process.env.RESERVATION_ADMIN_TOKEN;
  if (!adminToken) {
    throw new Error('Admin token not configured');
  }
  
  if (token !== adminToken) {
    // Could also use JWT verification here for more security
    throw new Error('Invalid token');
  }
  
  return true;
}

/**
 * Export reservations as CSV
 */
function exportAsCSV(reservations) {
  const headers = ['ID', 'Bestätigungscode', 'Datum', 'Zeit', 'Name', 'Personen', 'E-Mail', 'Telefon', 'Status', 'Besondere Wünsche', 'Erstellt am'];
  
  const rows = reservations.map(r => [
    r.id,
    r.confirmationCode,
    r.date,
    r.time,
    r.name,
    r.guests,
    r.email,
    r.phone,
    r.status,
    r.specialRequests?.replace(/[\n,]/g, ' ') || '',
    r.createdAt
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

exports.handler = async (event, context) => {
  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: DEFAULT_HEADERS,
      body: ''
    };
  }
  
  try {
    // Verify admin access
    verifyAdmin(event);
    
    const { date, id, action } = event.queryStringParameters || {};
    
    switch (event.httpMethod) {
      case 'GET': {
        if (!date) {
          return {
            statusCode: 400,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ error: 'Date parameter is required' })
          };
        }
        
        const reservations = await loadReservationsForDate(date);
        const availability = await calculateAvailability(date, reservations);
        
        // Check if CSV export is requested
        if (action === 'export') {
          const csv = exportAsCSV(reservations);
          return {
            statusCode: 200,
            headers: {
              ...DEFAULT_HEADERS,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="reservations-${date}.csv"`
            },
            body: csv
          };
        }
        
        return {
          statusCode: 200,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            date,
            reservations,
            availability,
            summary: {
              total: reservations.length,
              confirmed: reservations.filter(r => r.status === 'confirmed').length,
              waitlist: reservations.filter(r => r.status === 'waitlist').length,
              cancelled: reservations.filter(r => r.status === 'cancelled').length,
              totalGuests: reservations.filter(r => r.status !== 'cancelled')
                .reduce((sum, r) => sum + r.guests, 0)
            }
          })
        };
      }
      
      case 'PUT': {
        if (!date || !id) {
          return {
            statusCode: 400,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ error: 'Date and ID parameters are required' })
          };
        }
        
        const updates = JSON.parse(event.body || '{}');
        const reservations = await loadReservationsForDate(date);
        const index = reservations.findIndex(r => r.id === id);
        
        if (index === -1) {
          return {
            statusCode: 404,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ error: 'Reservation not found' })
          };
        }
        
        // Update reservation
        reservations[index] = {
          ...reservations[index],
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin'
        };
        
        await saveReservationsForDate(date, reservations);
        
        return {
          statusCode: 200,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            success: true,
            reservation: reservations[index]
          })
        };
      }
      
      case 'DELETE': {
        if (!date || !id) {
          return {
            statusCode: 400,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ error: 'Date and ID parameters are required' })
          };
        }
        
        const reservations = await loadReservationsForDate(date);
        const index = reservations.findIndex(r => r.id === id);
        
        if (index === -1) {
          return {
            statusCode: 404,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ error: 'Reservation not found' })
          };
        }
        
        // Soft delete - just change status
        reservations[index].status = 'cancelled';
        reservations[index].cancelledAt = new Date().toISOString();
        reservations[index].cancelledBy = 'admin';
        
        await saveReservationsForDate(date, reservations);
        
        return {
          statusCode: 200,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            success: true,
            message: 'Reservation cancelled'
          })
        };
      }
      
      case 'POST': {
        // Block/unblock dates
        if (action === 'block-date') {
          const { dates, blocked } = JSON.parse(event.body || '{}');
          const storage = new BlobStorage('settings');
          const blockedDates = await storage.get('blocked-dates') || [];
          
          if (blocked) {
            // Add dates to blocked list
            dates.forEach(date => {
              if (!blockedDates.includes(date)) {
                blockedDates.push(date);
              }
            });
          } else {
            // Remove dates from blocked list
            dates.forEach(date => {
              const index = blockedDates.indexOf(date);
              if (index > -1) {
                blockedDates.splice(index, 1);
              }
            });
          }
          
          await storage.set('blocked-dates', blockedDates);
          
          return {
            statusCode: 200,
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({
              success: true,
              blockedDates
            })
          };
        }
        
        return {
          statusCode: 400,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ error: 'Invalid action' })
        };
      }
      
      default:
        return {
          statusCode: 405,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
  } catch (error) {
    console.error('Admin operation error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return {
        statusCode: 401,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
