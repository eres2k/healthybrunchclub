const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { checkSpamFilter, logSpamAttempt } = require('./utils/spam-filter');
const { readJSON, writeJSON } = require('./utils/blob-storage');

// Allergen code mapping
const ALLERGEN_CODES = {
  a: 'Gluten',
  b: 'Krebstiere',
  c: 'Eier',
  d: 'Fisch',
  e: 'Erdnüsse',
  f: 'Soja',
  g: 'Milch/Laktose',
  h: 'Schalenfrüchte/Nüsse',
  i: 'Sellerie',
  j: 'Senf',
  k: 'Sesam',
  l: 'Sulfite',
  m: 'Lupinen',
  n: 'Weichtiere'
};

// System prompt with strict data usage rules
const SYSTEM_PROMPT = `Du bist "Tina", die freundliche virtuelle Assistentin des Healthy Brunch Club in Wien.

STRIKTE REGELN - UNBEDINGT BEFOLGEN:
1. Du erhältst strukturierte JSON-Daten über verfügbare Termine und Speisekarte.
2. VERWENDE AUSSCHLIESSLICH die Daten aus dem JSON. Erfinde NIEMALS eigene Termine, Gerichte oder Preise!
3. Wenn du nach Terminen gefragt wirst, nenne NUR die Termine aus "availableDates". KEINE ANDEREN DATEN!
4. Wenn du nach Gerichten gefragt wirst, nenne NUR Gerichte aus "menuItems". KEINE ANDEREN GERICHTE!
5. Bei Off-Topic-Fragen antworte: "Das ist eine interessante Frage, aber ich bin hier um dir bei allem rund ums Essen und unseren Healthy Brunch Club zu helfen!"
6. Antworte auf Deutsch, es sei denn der Gast schreibt auf Englisch.
7. Halte Antworten prägnant (2-3 Sätze), außer bei detaillierten Menüfragen.

ÜBER DEN HEALTHY BRUNCH CLUB:
- Adresse: Neubaugasse 15, 1070 Wien
- E-Mail: hello@healthybrunchclub.at
- Konzept: Gesunde, darmfreundliche und entzündungshemmende Speisen
- Gegründet von drei Schwestern mit philippinischen Wurzeln

WICHTIG: Wenn keine Termine oder Gerichte in den Daten vorhanden sind, verweise auf hello@healthybrunchclub.at.`;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, conversationHistory = [] } = JSON.parse(event.body);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    if (message.length > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nachricht zu lang. Maximal 1000 Zeichen.' })
      };
    }

    const spamCheck = await checkSpamFilter(event, message);
    if (!spamCheck.allowed) {
      console.log(`Spam blocked: ${spamCheck.reason} from ${spamCheck.ip}`);
      await logSpamAttempt(spamCheck.ip, message, spamCheck.reason);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: spamCheck.message,
          blocked: true,
          reason: spamCheck.reason
        })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Chatbot is not configured' })
      };
    }

    // Load data as structured JSON
    const menuData = await loadMenuData();
    const datesData = await loadAvailableDates();

    // Build strict JSON context
    const contextData = {
      instruction: "VERWENDE NUR DIESE DATEN. ERFINDE NICHTS!",
      availableDates: datesData,
      menuItems: menuData
    };

    const contextJSON = JSON.stringify(contextData, null, 2);

    // Build conversation for Gemini
    const contents = [];

    for (const msg of conversationHistory.slice(-6)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Include context data in EVERY message to prevent hallucinations
    // The AI needs fresh data on each request, not just the first one
    const userMessageWithContext = `AKTUELLE DATEN (NUR DIESE VERWENDEN!):\n${contextJSON}\n\nGast-Frage: ${message}`;

    contents.push({
      role: 'user',
      parts: [{ text: userMessageWithContext }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.3, // Lower temperature to reduce hallucinations
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 500
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get response from AI' })
      };
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('No response from Gemini:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No response from AI' })
      };
    }

    // Log conversation for future improvements (non-blocking)
    logConversation(message, aiResponse).catch(err => {
      console.error('Failed to log conversation:', err.message);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: aiResponse,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in ask-tina function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// Load available dates as structured JSON array
async function loadAvailableDates() {
  try {
    const datesDir = path.join(__dirname, '../../content/available-dates');
    const files = await fs.readdir(datesDir);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(datesDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            return data;
          } catch (error) {
            return null;
          }
        })
    );

    // Filter and format future dates
    const futureDates = dates
      .filter(d => d !== null && d.date)
      .filter(d => new Date(d.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 15);

    if (futureDates.length === 0) {
      return [];
    }

    // Return clean structured data
    return futureDates.map(date => {
      const d = new Date(date.date);
      const times = date.slots?.map(s => s.time || s) || [];

      return {
        date: date.date,
        formattedDate: d.toLocaleDateString('de-AT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        title: date.title || null,
        times: times,
        note: date.note || null
      };
    });
  } catch (error) {
    console.error('Error loading dates:', error);
    return [];
  }
}

// Load menu data as structured JSON array
async function loadMenuData() {
  try {
    const menuDir = path.join(__dirname, '../../content/menu-categories');
    const files = await fs.readdir(menuDir);

    const categories = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          try {
            const filePath = path.join(menuDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data } = matter(content);
            return data;
          } catch (error) {
            return null;
          }
        })
    );

    // Return clean structured data
    return categories
      .filter(c => c !== null)
      .sort((a, b) => (a.order || 99) - (b.order || 99))
      .map(cat => ({
        category: cat.title,
        description: cat.description || null,
        items: (cat.items || []).map(item => ({
          name: item.name,
          price: item.price ? `€${item.price}` : null,
          description: item.description || null,
          tags: item.tags || [],
          allergens: (item.allergens || []).map(code => ALLERGEN_CODES[code] || code),
          nutrition: item.nutrition || null
        }))
      }));
  } catch (error) {
    console.error('Error loading menu:', error);
    return [];
  }
}

// Log conversation for future analysis and improvements
async function logConversation(userMessage, botResponse) {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const key = `conversations/${dateKey}.json`;

  const logEntry = {
    timestamp: now.toISOString(),
    userMessage: userMessage.substring(0, 500),
    botResponse: botResponse.substring(0, 1000)
  };

  const existingLogs = await readJSON('chatbotLogs', key, []);
  existingLogs.push(logEntry);

  const trimmedLogs = existingLogs.slice(-1000);
  await writeJSON('chatbotLogs', key, trimmedLogs);
}
