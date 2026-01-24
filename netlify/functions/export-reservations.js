'use strict';

const { jsPDF } = require('jspdf');
const { loadReservations } = require('./utils/reservation-utils');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function authenticate(context) {
  // Check for Netlify Identity user from clientContext
  const user = context?.clientContext?.user;
  if (!user) {
    throw new Error('Nicht autorisiert. Bitte mit Netlify Identity anmelden.');
  }
  return user;
}

function toCsv(reservations) {
  const header = ['Bestätigungscode', 'Datum', 'Zeit', 'Gäste', 'Name', 'E-Mail', 'Telefon', 'Status'];
  const rows = reservations.map((reservation) => [
    reservation.confirmationCode,
    reservation.date,
    reservation.time,
    reservation.guests,
    reservation.name,
    reservation.email,
    reservation.phone,
    reservation.status
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

function toPdf(reservations) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  doc.setFontSize(14);
  doc.text('Healthy Brunch Club Wien – Reservierungen', 40, 50);

  const startY = 80;
  const rowHeight = 24;
  const columns = ['Bestätigungscode', 'Datum', 'Zeit', 'Gäste', 'Name', 'E-Mail', 'Telefon', 'Status'];

  doc.setFontSize(10);
  columns.forEach((col, index) => {
    doc.text(col, 40 + index * 110, startY);
  });

  reservations.forEach((reservation, rowIndex) => {
    const values = [
      reservation.confirmationCode,
      reservation.date,
      reservation.time,
      String(reservation.guests),
      reservation.name,
      reservation.email,
      reservation.phone,
      reservation.status
    ];
    values.forEach((value, colIndex) => {
      doc.text(String(value || ''), 40 + colIndex * 110, startY + rowHeight * (rowIndex + 1));
    });
  });

  return doc.output('arraybuffer');
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: DEFAULT_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: DEFAULT_HEADERS, body: JSON.stringify({ message: 'Methode nicht erlaubt.' }) };
  }

  try {
    authenticate(context);
  } catch (error) {
    return { statusCode: 401, headers: DEFAULT_HEADERS, body: JSON.stringify({ message: error.message }) };
  }

  try {
    const { date, format = 'csv' } = event.queryStringParameters || {};
    if (!date) {
      return { statusCode: 400, headers: DEFAULT_HEADERS, body: JSON.stringify({ message: 'Datum ist erforderlich.' }) };
    }

    const reservations = await loadReservations(date);

    if (format === 'pdf') {
      const buffer = toPdf(reservations);
      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reservations-${date}.pdf"`
        },
        body: Buffer.from(buffer).toString('base64')
      };
    }

    const csv = toCsv(reservations);
    return {
      statusCode: 200,
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reservations-${date}.csv"`
      },
      body: csv
    };
  } catch (error) {
    console.error('Fehler beim Export:', error);
    return { statusCode: 500, headers: DEFAULT_HEADERS, body: JSON.stringify({ message: 'Export fehlgeschlagen.' }) };
  }
};
