const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { checkSpamFilter, logSpamAttempt } = require('./utils/spam-filter');

// System prompt with guardrails for food-only questions
const SYSTEM_PROMPT = `Du bist "Tina", die freundliche virtuelle Assistentin des Healthy Brunch Club in Wien. Du hilfst Gästen bei Fragen rund ums Essen, unsere Speisekarte, Zutaten, Nährwerte, Allergene und Reservierungen.

WICHTIGE REGELN:
1. Beantworte NUR Fragen zu Essen, Ernährung, Zutaten, Gesundheitsvorteilen von Lebensmitteln, unserer Speisekarte und unseren verfügbaren Terminen.
2. Bei Off-Topic-Fragen (Politik, Sport, Technik, persönliche Themen etc.) antworte freundlich: "Das ist eine interessante Frage, aber ich bin hier um dir bei allem rund ums Essen und unseren Healthy Brunch Club zu helfen! Kann ich dir etwas über unsere Gerichte oder verfügbaren Termine erzählen?"
3. Fördere aktiv unsere Gerichte und verfügbaren Brunch-Termine.
4. Antworte auf Deutsch, es sei denn der Gast schreibt auf Englisch.
5. Sei warmherzig, einladend und hilfreich - wie eine echte Gastgeberin.
6. Bei Fragen zu Adaptogenen, Superfoods oder Zutaten gib hilfreiche Ernährungsinformationen.
7. KRITISCH: Bei Terminfragen nenne NUR die exakten Daten aus der Liste "VERFÜGBARE BRUNCH-TERMINE". Erfinde NIEMALS andere Daten!
8. Falls keine Termine verfügbar sind, verweise auf hello@healthybrunchclub.at.

ÜBER DEN HEALTHY BRUNCH CLUB:
- Adresse: Neubaugasse 15, 1070 Wien
- E-Mail: hello@healthybrunchclub.at
- Konzept: Gesunde, darmfreundliche und entzündungshemmende Speisen
- Gegründet von drei Schwestern mit philippinischen Wurzeln
- Fokus auf gesunde Alternativen und entzündungshemmende Zutaten nach Tinas Crohn-Diagnose

Antworte immer freundlich, kompetent und halte die Antworten prägnant (max. 2-3 Sätze, außer bei detaillierten Menüfragen).`;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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

    // Check message length
    if (message.length > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nachricht zu lang. Maximal 1000 Zeichen.' })
      };
    }

    // Check spam filter
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

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Chatbot is not configured' })
      };
    }

    // Load menu data for context
    const menuContext = await loadMenuContext();
    const datesContext = await loadAvailableDatesContext();

    // Build the full context
    const contextInfo = `
AKTUELLE SPEISEKARTE:
${menuContext}

VERFÜGBARE BRUNCH-TERMINE:
${datesContext}
`;

    // Build conversation for Gemini
    const contents = [];

    // Add conversation history
    for (const msg of conversationHistory.slice(-6)) { // Keep last 6 messages for context
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add current user message with context
    const userMessageWithContext = conversationHistory.length === 0
      ? `${contextInfo}\n\nGast-Frage: ${message}`
      : message;

    contents.push({
      role: 'user',
      parts: [{ text: userMessageWithContext }]
    });

    // Call Gemini API
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
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

    // Extract the response text
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error('No response from Gemini:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No response from AI' })
      };
    }

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

// Load menu data for context
async function loadMenuContext() {
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

    // Format menu data for AI context
    let menuText = '';
    for (const cat of categories.filter(c => c !== null)) {
      menuText += `\n## ${cat.title}\n`;
      if (cat.description) menuText += `${cat.description}\n`;
      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          menuText += `- ${item.name}`;
          if (item.price) menuText += ` (€${item.price})`;
          if (item.description) menuText += `: ${item.description}`;
          if (item.tags && item.tags.length > 0) menuText += ` [${item.tags.join(', ')}]`;
          if (item.allergens && item.allergens.length > 0) menuText += ` Allergene: ${item.allergens.join(', ')}`;
          menuText += '\n';
        }
      }
    }

    return menuText || 'Speisekarte wird gerade aktualisiert.';
  } catch (error) {
    console.error('Error loading menu context:', error);
    return 'Speisekarte nicht verfügbar.';
  }
}

// Load available dates for context
async function loadAvailableDatesContext() {
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

    // Filter future dates and format
    const futureDates = dates
      .filter(d => d !== null && d.date)
      .filter(d => new Date(d.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10); // Next 10 dates

    if (futureDates.length === 0) {
      return 'WICHTIG: Aktuell sind keine Termine verfügbar. Bitte Gäste an hello@healthybrunchclub.at verweisen.';
    }

    // More explicit formatting to prevent hallucinations
    let datesText = `WICHTIG: Nenne NUR diese ${futureDates.length} Termine - keine anderen Daten erfinden!\n\n`;

    for (let i = 0; i < futureDates.length; i++) {
      const date = futureDates[i];
      const d = new Date(date.date);
      const formatted = d.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Extract just the times for clarity
      let times = [];
      if (date.slots && date.slots.length > 0) {
        times = date.slots.map(s => s.time || s);
      }

      datesText += `${i + 1}. ${formatted}`;
      if (times.length > 0) {
        datesText += ` um ${times.join(' Uhr, ')} Uhr`;
      }
      datesText += '\n';
    }

    return datesText;
  } catch (error) {
    console.error('Error loading dates context:', error);
    return 'WICHTIG: Termine konnten nicht geladen werden. Bitte Gäste an hello@healthybrunchclub.at verweisen.';
  }
}
