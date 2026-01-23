const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Nutritional goal profiles
const NUTRITIONAL_GOALS = {
  'fitness': {
    label: 'Fitness & Muskelaufbau',
    preferTags: ['proteinreich', 'sättigend'],
    minProtein: 15,
    description: 'Proteinreiche Gerichte für aktive Menschen'
  },
  'wellness': {
    label: 'Wellness & Leichtigkeit',
    preferTags: ['belebend', 'immunstärkend'],
    maxCalories: 350,
    description: 'Leichte, nährende Gerichte'
  },
  'energy': {
    label: 'Energie & Vitalität',
    preferTags: ['belebend', 'sättigend'],
    description: 'Energiespendende Mahlzeiten für den Tag'
  },
  'balanced': {
    label: 'Ausgewogen',
    preferTags: [],
    description: 'Eine ausgewogene Auswahl'
  }
};

// Time-based preferences
function getTimeOfDayPreference() {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 10) {
    // Early morning - lighter, energizing options
    return {
      period: 'morning',
      preferTags: ['belebend'],
      preferCategories: ['coffee-healthtea-and-me', 'porridge-etc', 'freshly-squeezed-juices-and-shots'],
      description: 'Perfekt für einen frischen Start in den Tag'
    };
  } else if (hour >= 10 && hour < 12) {
    // Late morning - brunch time, heartier options
    return {
      period: 'brunch',
      preferTags: ['sättigend', 'proteinreich'],
      preferCategories: ['eggs-and-other-stories', 'avocado-friends', 'set'],
      description: 'Zeit für einen ausgiebigen Brunch'
    };
  } else if (hour >= 12 && hour < 15) {
    // Afternoon - substantial but not too heavy
    return {
      period: 'afternoon',
      preferTags: ['sättigend'],
      preferCategories: ['avocado-friends', 'eggs-and-other-stories'],
      description: 'Perfekt für den Nachmittag'
    };
  } else {
    // Later in the day - lighter options
    return {
      period: 'evening',
      preferTags: ['belebend', 'immunstärkend'],
      preferCategories: ['sweet-but-healthy', 'porridge-etc'],
      description: 'Leichte Optionen für später am Tag'
    };
  }
}

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
    const body = JSON.parse(event.body || '{}');
    const {
      dietaryPreferences = [], // ['vegetarisch', 'glutenfrei']
      nutritionalGoal = 'balanced', // 'fitness', 'wellness', 'energy', 'balanced'
      previousOrders = [], // Array of item names previously ordered
      count = 4 // Number of recommendations to return
    } = body;

    // Load all menu items
    const menuItems = await loadAllMenuItems();

    if (menuItems.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          recommendations: [],
          message: 'Keine Menüdaten verfügbar'
        })
      };
    }

    // Get time-based preferences
    const timePrefs = getTimeOfDayPreference();
    const goalPrefs = NUTRITIONAL_GOALS[nutritionalGoal] || NUTRITIONAL_GOALS.balanced;

    // Score each menu item
    const scoredItems = menuItems.map(item => {
      let score = 0;
      const reasons = [];

      // Base score for having an image (visual appeal)
      if (item.image) {
        score += 5;
      }

      // Dietary preference matching (high priority)
      if (dietaryPreferences.length > 0) {
        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        const matchingDietary = dietaryPreferences.filter(pref =>
          itemTags.includes(pref.toLowerCase())
        );
        if (matchingDietary.length === dietaryPreferences.length) {
          score += 30; // Perfect dietary match
          reasons.push('Passt zu deinen Ernährungsvorlieben');
        } else if (matchingDietary.length > 0) {
          score += 15; // Partial match
        } else if (dietaryPreferences.includes('vegetarisch') && !itemTags.includes('vegetarisch')) {
          score -= 50; // Strong penalty for non-vegetarian when vegetarian is preferred
        }
      }

      // Nutritional goal matching
      if (goalPrefs.preferTags && goalPrefs.preferTags.length > 0) {
        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        const matchingGoalTags = goalPrefs.preferTags.filter(tag =>
          itemTags.includes(tag.toLowerCase())
        );
        if (matchingGoalTags.length > 0) {
          score += matchingGoalTags.length * 10;
          reasons.push(goalPrefs.description);
        }
      }

      // Nutritional requirements
      if (item.nutrition) {
        const calories = parseInt(item.nutrition.calories) || 0;
        const protein = parseInt(item.nutrition.protein) || 0;

        if (goalPrefs.minProtein && protein >= goalPrefs.minProtein) {
          score += 15;
          reasons.push(`${protein}g Protein`);
        }

        if (goalPrefs.maxCalories && calories <= goalPrefs.maxCalories && calories > 0) {
          score += 10;
          reasons.push(`Nur ${calories} kcal`);
        }
      }

      // Time of day preference
      if (timePrefs.preferTags) {
        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        const matchingTimeTags = timePrefs.preferTags.filter(tag =>
          itemTags.includes(tag.toLowerCase())
        );
        if (matchingTimeTags.length > 0) {
          score += 8;
          reasons.push(timePrefs.description);
        }
      }

      // Category preference based on time
      if (timePrefs.preferCategories) {
        const categorySlug = item.categorySlug || '';
        if (timePrefs.preferCategories.some(cat => categorySlug.includes(cat.replace(/-/g, '')))) {
          score += 5;
        }
      }

      // Previous orders (returning customer boost)
      if (previousOrders.length > 0) {
        const wasOrdered = previousOrders.some(order =>
          order.toLowerCase() === item.name.toLowerCase()
        );
        if (wasOrdered) {
          // Previously ordered items get a moderate boost but not too much
          // to encourage discovery
          score += 8;
          reasons.push('Du hast das schon einmal bestellt');
        } else {
          // Slight boost for items similar to previous orders (same category)
          const similarOrdered = previousOrders.some(order => {
            const orderedItem = menuItems.find(m =>
              m.name.toLowerCase() === order.toLowerCase()
            );
            return orderedItem && orderedItem.categoryTitle === item.categoryTitle;
          });
          if (similarOrdered) {
            score += 3;
          }
        }
      }

      // Avoid extras/add-ons as primary recommendations
      if (item.name.toLowerCase().includes('extra')) {
        score -= 20;
      }

      // Add some randomness to keep recommendations fresh
      score += Math.random() * 5;

      return {
        ...item,
        score,
        reasons: [...new Set(reasons)].slice(0, 2) // Max 2 unique reasons
      };
    });

    // Sort by score and take top items
    const sortedItems = scoredItems
      .filter(item => item.score > 0) // Only positive scores
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    // Format response
    const recommendations = sortedItems.map(item => ({
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      tags: (item.tags || []).slice(0, 3),
      categoryTitle: item.categoryTitle,
      nutrition: item.nutrition,
      reasons: item.reasons
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        recommendations,
        timeOfDay: timePrefs.period,
        nutritionalGoal: goalPrefs.label,
        message: recommendations.length > 0
          ? `${recommendations.length} Empfehlungen für dich`
          : 'Keine passenden Empfehlungen gefunden'
      })
    };

  } catch (error) {
    console.error('Error in get-recommendations:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Fehler beim Laden der Empfehlungen',
        details: error.message
      })
    };
  }
};

// Load all menu items from markdown files
async function loadAllMenuItems() {
  try {
    const menuDir = path.join(__dirname, '../../content/menu-categories');
    const files = await fs.readdir(menuDir);

    const allItems = [];

    for (const file of files.filter(f => f.endsWith('.md'))) {
      try {
        const filePath = path.join(menuDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const { data } = matter(content);

        if (data.items && Array.isArray(data.items)) {
          const categoryTitle = data.title || '';
          const categorySlug = file.replace('.md', '');

          for (const item of data.items) {
            allItems.push({
              ...item,
              categoryTitle,
              categorySlug,
              categoryImage: data.image
            });
          }
        }
      } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
      }
    }

    return allItems;
  } catch (error) {
    console.error('Error loading menu items:', error);
    return [];
  }
}
