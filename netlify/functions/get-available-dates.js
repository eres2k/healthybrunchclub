const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const datesDir = path.join(__dirname, '../../content/available-dates');
    let files = [];

    try {
      files = await fs.readdir(datesDir);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading available dates directory:', error);
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ dates: [] })
      };
    }

    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(datesDir, file), 'utf8');
        const data = JSON.parse(content);
        if (data?.date) {
          const dateValue = new Date(`${data.date}T00:00:00`);
          if (Number.isNaN(dateValue.getTime())) {
            continue;
          }

          if (dateValue < today) {
            continue;
          }

          dates.push({
            date: data.date,
            title: data.title || null,
            note: data.note || null
          });
        }
      } catch (error) {
        console.error(`Error parsing available date file ${file}:`, error);
      }
    }

    dates.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ dates })
    };
  } catch (error) {
    console.error('Error in get-available-dates function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
