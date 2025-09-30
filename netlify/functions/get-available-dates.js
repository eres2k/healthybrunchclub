'use strict';

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const contentDir = path.join(__dirname, '../../content/available-dates');

    try {
      await fs.access(contentDir);
    } catch {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ availableDates: [] })
      };
    }

    const files = await fs.readdir(contentDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const availableDates = await Promise.all(
      mdFiles.map(async (file) => {
        const content = await fs.readFile(path.join(contentDir, file), 'utf8');
        const { data } = matter(content);

        const dateObj = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateObj >= today) {
          return {
            date: data.date,
            title: data.title || 'Verfügbar',
            slots: data.slots || [],
            note: data.note || ''
          };
        }
        return null;
      })
    );

    const validDates = availableDates
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ availableDates: validDates })
    };
  } catch (error) {
    console.error('Error loading available dates:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load available dates' })
    };
  }
};
