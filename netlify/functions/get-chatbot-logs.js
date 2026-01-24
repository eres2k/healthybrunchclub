'use strict';

const { getBlobStore, readJSON } = require('./utils/blob-storage');

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  };
}

function authenticate(context) {
  // Check for Netlify Identity user from clientContext
  const user = context?.clientContext?.user;
  if (!user) {
    throw new Error('Nicht autorisiert. Bitte mit Netlify Identity anmelden.');
  }
  return user;
}

async function listAvailableDates() {
  const store = getBlobStore('chatbotLogs');
  const { blobs } = await store.list({ prefix: 'conversations/' });

  const dates = blobs
    .map(blob => {
      const match = blob.key.match(/conversations\/(\d{4}-\d{2}-\d{2})\.json$/);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a)); // Newest first

  return dates;
}

async function getLogsForDate(date) {
  const key = `conversations/${date}.json`;
  const logs = await readJSON('chatbotLogs', key, []);
  return logs;
}

async function handleGet(event) {
  const { date, action } = event.queryStringParameters || {};

  // List available dates
  if (action === 'list-dates') {
    const dates = await listAvailableDates();
    return response(200, { dates });
  }

  // Get logs for a specific date
  if (date) {
    const logs = await getLogsForDate(date);
    return response(200, {
      date,
      logs,
      count: logs.length
    });
  }

  return response(400, { message: 'Bitte Datum angeben oder action=list-dates verwenden.' });
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    authenticate(context);
  } catch (error) {
    return response(401, { message: error.message });
  }

  try {
    if (event.httpMethod === 'GET') {
      return await handleGet(event);
    }

    return response(405, { message: 'Methode nicht erlaubt.' });
  } catch (error) {
    console.error('Fehler in get-chatbot-logs:', error);
    return response(500, { message: 'Interner Fehler.' });
  }
};
