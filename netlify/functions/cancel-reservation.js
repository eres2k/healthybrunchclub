const { loadReservationsForDate, saveReservationsForDate } = require('./utils/reservation-utils');
const { sendReservationEmails } = require('./utils/email-service');
const BlobStorage = require('./utils/blob-storage');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { confirmationCode, email } = JSON.parse(event.body);

    if (!confirmationCode || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Bestätigungscode und E-Mail sind erforderlich' })
      };
    }

    // Find reservation across all dates (inefficient, but works for small scale)
    // In production, you'd want to index by confirmation code
    const storage = new BlobStorage('reservations');
    const allKeys = await storage.list('date-');
    
    let foundReservation = null;
    let foundDate = null;
    
    for (const key of allKeys) {
      const date = key.key.replace('date-', '');
      const reservations = await loadReservationsForDate(date);
      const reservation = reservations.find(
        r => r.confirmationCode === confirmationCode && r.email === email
      );
      
      if (reservation) {
        foundReservation = reservation;
        foundDate = date;
        break;
      }
    }
    
    if (!foundReservation) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Reservierung nicht gefunden' })
      };
    }
    
    // Check if already cancelled
    if (foundReservation.status === 'cancelled') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Diese Reservierung wurde bereits storniert' })
      };
    }
    
    // Check cancellation deadline (24 hours before)
    const reservationDateTime = new Date(`${foundReservation.date}T${foundReservation.time}`);
    const now = new Date();
    const hoursUntilReservation = (reservationDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilReservation < 24) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Stornierungen sind nur bis 24 Stunden vor der Reservierung möglich. Bitte kontaktieren Sie uns telefonisch.' 
        })
      };
    }
    
    // Update reservation status
    const reservations = await loadReservationsForDate(foundDate);
    const index = reservations.findIndex(r => r.id === foundReservation.id);
    
    reservations[index].status = 'cancelled';
    reservations[index].cancelledAt = new Date().toISOString();
    reservations[index].cancelledBy = 'customer';
    
    await saveReservationsForDate(foundDate, reservations);
    
    // Send cancellation email
    await sendReservationEmails({
      ...reservations[index],
      status: 'cancelled'
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Ihre Reservierung wurde erfolgreich storniert'
      })
    };

  } catch (error) {
    console.error('Cancellation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ein Fehler ist aufgetreten' })
    };
  }
};
