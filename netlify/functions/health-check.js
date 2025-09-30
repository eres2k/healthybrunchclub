'use strict';

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })
});
