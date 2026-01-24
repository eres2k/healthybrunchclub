'use strict';

const { readJSON, getBlobStore } = require('./utils/blob-storage');
const sendEmail = require('./utils/send-email');

// Scheduled function - runs every Monday at 7:00 AM UTC (8:00 AM Vienna winter time)
// Can also be triggered manually via HTTP GET request
exports.config = {
  schedule: '0 7 * * 1' // Every Monday at 7:00 UTC
};

const SUMMARY_RECIPIENTS = [
  'hello@healthybrunchclub.at',
  'erwin.esener@gmail.com'
];

exports.handler = async (event, context) => {
  console.log('Starting weekly summary generation...');

  try {
    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Collect data
    const [reservationStats, chatbotStats] = await Promise.all([
      collectReservationStats(startDate, endDate),
      collectChatbotStats(startDate, endDate)
    ]);

    // Generate HTML email
    const html = generateSummaryEmail(startDate, endDate, reservationStats, chatbotStats);

    // Send to all recipients
    const fromEmail = process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at';
    const subject = `Wöchentliche Übersicht - ${formatDateRange(startDate, endDate)}`;

    await Promise.all(
      SUMMARY_RECIPIENTS.map(recipient =>
        sendEmail({
          to: recipient,
          from: fromEmail,
          subject,
          html
        })
      )
    );

    console.log('Weekly summary sent successfully to:', SUMMARY_RECIPIENTS.join(', '));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Wöchentliche Zusammenfassung gesendet',
        recipients: SUMMARY_RECIPIENTS,
        period: { start: startDate.toISOString(), end: endDate.toISOString() }
      })
    };
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function collectReservationStats(startDate, endDate) {
  const stats = {
    total: 0,
    confirmed: 0,
    cancelled: 0,
    waitlisted: 0,
    totalGuests: 0,
    byDate: {},
    reservations: []
  };

  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    const key = `reservations/${date}.json`;
    const reservations = await readJSON('reservations', key, []);

    if (reservations.length > 0) {
      stats.byDate[date] = {
        total: reservations.length,
        confirmed: 0,
        guests: 0
      };

      for (const res of reservations) {
        stats.total++;
        stats.totalGuests += Number(res.guests) || 0;

        if (res.status === 'confirmed') {
          stats.confirmed++;
          stats.byDate[date].confirmed++;
          stats.byDate[date].guests += Number(res.guests) || 0;
        } else if (res.status === 'cancelled') {
          stats.cancelled++;
        } else if (res.status === 'waitlisted') {
          stats.waitlisted++;
        }

        // Store recent reservations for the summary
        stats.reservations.push({
          date: res.date,
          time: res.time,
          name: res.name,
          guests: res.guests,
          status: res.status,
          email: res.email
        });
      }
    }
  }

  // Sort reservations by date and time
  stats.reservations.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return stats;
}

async function collectChatbotStats(startDate, endDate) {
  const stats = {
    totalConversations: 0,
    byDate: {},
    byCountry: {},
    byOS: {},
    byDevice: {},
    peakHours: {},
    sampleConversations: []
  };

  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    const key = `conversations/${date}.json`;
    const logs = await readJSON('chatbotLogs', key, []);

    if (logs.length > 0) {
      stats.byDate[date] = logs.length;
      stats.totalConversations += logs.length;

      for (const log of logs) {
        // Country stats
        const country = log.countryName || log.country || 'Unbekannt';
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;

        // OS stats
        if (log.os) {
          stats.byOS[log.os] = (stats.byOS[log.os] || 0) + 1;
        }

        // Device stats
        if (log.device) {
          stats.byDevice[log.device] = (stats.byDevice[log.device] || 0) + 1;
        }

        // Peak hours
        if (log.timestamp) {
          const hour = new Date(log.timestamp).getHours();
          stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
        }

        // Sample conversations (first 10)
        if (stats.sampleConversations.length < 10) {
          stats.sampleConversations.push({
            timestamp: log.timestamp,
            userMessage: log.userMessage?.substring(0, 100) + (log.userMessage?.length > 100 ? '...' : ''),
            country: country,
            device: log.device || 'Unbekannt'
          });
        }
      }
    }
  }

  return stats;
}

function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatDateRange(startDate, endDate) {
  const formatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const start = startDate.toLocaleDateString('de-AT', formatOptions);
  const end = endDate.toLocaleDateString('de-AT', formatOptions);
  return `${start} - ${end}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('de-AT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

function getStatusBadge(status) {
  const colors = {
    confirmed: { bg: '#d4edda', color: '#155724', text: 'Bestätigt' },
    cancelled: { bg: '#f8d7da', color: '#721c24', text: 'Storniert' },
    waitlisted: { bg: '#fff3cd', color: '#856404', text: 'Warteliste' }
  };
  const s = colors[status] || { bg: '#e2e3e5', color: '#383d41', text: status };
  return `<span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:4px;font-size:12px;">${s.text}</span>`;
}

function getTopEntries(obj, limit = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function generateSummaryEmail(startDate, endDate, reservationStats, chatbotStats) {
  const dateRange = formatDateRange(startDate, endDate);

  // Calculate mobile percentage
  const mobileDevices = ['iPhone', 'Android Phone', 'Mobile', 'iPad', 'Android Tablet'];
  const mobileCount = Object.entries(chatbotStats.byDevice)
    .filter(([device]) => mobileDevices.some(m => device.includes(m)))
    .reduce((sum, [, count]) => sum + count, 0);
  const mobilePercent = chatbotStats.totalConversations > 0
    ? Math.round((mobileCount / chatbotStats.totalConversations) * 100)
    : 0;

  // Peak hour
  const peakHour = getTopEntries(chatbotStats.peakHours, 1)[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f6f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f4;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2f5138 0%,#3d6a4a 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:600;">Wöchentliche Übersicht</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${dateRange}</p>
            </td>
          </tr>

          <!-- Stats Overview -->
          <tr>
            <td style="padding:30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:10px;text-align:center;background:#edf3eb;border-radius:8px 0 0 8px;">
                    <div style="font-size:32px;font-weight:700;color:#2f5138;">${reservationStats.confirmed}</div>
                    <div style="font-size:12px;color:#6b7a6c;text-transform:uppercase;">Reservierungen</div>
                  </td>
                  <td width="50%" style="padding:10px;text-align:center;background:#e8f4fc;border-radius:0 8px 8px 0;">
                    <div style="font-size:32px;font-weight:700;color:#1a5276;">${chatbotStats.totalConversations}</div>
                    <div style="font-size:12px;color:#6b7a6c;text-transform:uppercase;">Chatbot-Gespräche</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reservierungen Section -->
          <tr>
            <td style="padding:0 30px 30px;">
              <h2 style="margin:0 0 15px;font-size:18px;color:#243424;border-bottom:2px solid #edf3eb;padding-bottom:10px;">
                📅 Reservierungen
              </h2>

              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px;">
                <tr style="background:#f6f7f4;">
                  <td><strong>Gesamt</strong></td>
                  <td align="right">${reservationStats.total}</td>
                </tr>
                <tr>
                  <td>Bestätigt</td>
                  <td align="right" style="color:#155724;">${reservationStats.confirmed}</td>
                </tr>
                <tr style="background:#f6f7f4;">
                  <td>Storniert</td>
                  <td align="right" style="color:#721c24;">${reservationStats.cancelled}</td>
                </tr>
                <tr>
                  <td>Warteliste</td>
                  <td align="right" style="color:#856404;">${reservationStats.waitlisted}</td>
                </tr>
                <tr style="background:#f6f7f4;">
                  <td><strong>Gesamte Gäste</strong></td>
                  <td align="right"><strong>${reservationStats.totalGuests}</strong></td>
                </tr>
              </table>

              ${reservationStats.reservations.length > 0 ? `
              <h3 style="margin:20px 0 10px;font-size:14px;color:#6b7a6c;">Alle Reservierungen</h3>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:12px;border:1px solid #e4eadf;border-radius:8px;">
                <tr style="background:#f6f7f4;">
                  <th align="left" style="padding:8px;">Datum</th>
                  <th align="left">Zeit</th>
                  <th align="left">Name</th>
                  <th align="center">Gäste</th>
                  <th align="center">Status</th>
                </tr>
                ${reservationStats.reservations.map(res => `
                <tr style="border-top:1px solid #e4eadf;">
                  <td style="padding:6px 8px;">${formatDate(res.date)}</td>
                  <td>${res.time}</td>
                  <td>${res.name || '-'}</td>
                  <td align="center">${res.guests}</td>
                  <td align="center">${getStatusBadge(res.status)}</td>
                </tr>
                `).join('')}
              </table>
              ` : '<p style="color:#6b7a6c;font-style:italic;">Keine Reservierungen in diesem Zeitraum.</p>'}
            </td>
          </tr>

          <!-- Chatbot Section -->
          <tr>
            <td style="padding:0 30px 30px;">
              <h2 style="margin:0 0 15px;font-size:18px;color:#243424;border-bottom:2px solid #e8f4fc;padding-bottom:10px;">
                💬 Chatbot-Statistiken
              </h2>

              <table width="100%" cellpadding="0" cellspacing="10">
                <tr>
                  <td width="33%" style="background:#f6f7f4;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2f5138;">${chatbotStats.totalConversations}</div>
                    <div style="font-size:11px;color:#6b7a6c;">Gespräche</div>
                  </td>
                  <td width="33%" style="background:#f6f7f4;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2f5138;">${mobilePercent}%</div>
                    <div style="font-size:11px;color:#6b7a6c;">Mobile</div>
                  </td>
                  <td width="33%" style="background:#f6f7f4;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2f5138;">${peakHour ? `${String(peakHour[0]).padStart(2, '0')}:00` : '-'}</div>
                    <div style="font-size:11px;color:#6b7a6c;">Peak-Stunde</div>
                  </td>
                </tr>
              </table>

              ${Object.keys(chatbotStats.byCountry).length > 0 ? `
              <h3 style="margin:20px 0 10px;font-size:14px;color:#6b7a6c;">Top Länder</h3>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;">
                ${getTopEntries(chatbotStats.byCountry, 5).map(([country, count], i) => `
                <tr${i % 2 === 0 ? ' style="background:#f6f7f4;"' : ''}>
                  <td>${country}</td>
                  <td align="right" style="color:#2f5138;font-weight:600;">${count}</td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

              ${Object.keys(chatbotStats.byOS).length > 0 ? `
              <h3 style="margin:20px 0 10px;font-size:14px;color:#6b7a6c;">Top Betriebssysteme</h3>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;">
                ${getTopEntries(chatbotStats.byOS, 5).map(([os, count], i) => `
                <tr${i % 2 === 0 ? ' style="background:#f6f7f4;"' : ''}>
                  <td>${os}</td>
                  <td align="right" style="color:#2f5138;font-weight:600;">${count}</td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

              ${chatbotStats.sampleConversations.length > 0 ? `
              <h3 style="margin:20px 0 10px;font-size:14px;color:#6b7a6c;">Beispiel-Nachrichten</h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size:12px;border:1px solid #e4eadf;border-radius:8px;">
                ${chatbotStats.sampleConversations.slice(0, 5).map((conv, i) => `
                <tr${i % 2 === 0 ? ' style="background:#f6f7f4;"' : ''}>
                  <td>
                    <div style="color:#243424;">"${conv.userMessage}"</div>
                    <div style="font-size:11px;color:#999;margin-top:4px;">
                      ${conv.country} • ${conv.device}
                    </div>
                  </td>
                </tr>
                `).join('')}
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f6f7f4;padding:20px;text-align:center;border-top:1px solid #e4eadf;">
              <p style="margin:0;font-size:12px;color:#6b7a6c;">
                Healthy Brunch Club Wien<br>
                <a href="https://healthybrunchclub.at/admin/chatbot-logs.html" style="color:#2f5138;">Chatbot-Logs ansehen</a> •
                <a href="https://healthybrunchclub.at/admin-dashboard.html" style="color:#2f5138;">Reservierungen verwalten</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
