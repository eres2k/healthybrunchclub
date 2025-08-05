// CMS Loader für klassisches Menü Design
// Ohne Modal-Popups, mit Allergen-Anzeige

let allMenuCategories = [];
let currentFilter = 'all';

// Allergen-Mapping
const allergenMap = {
    'A': 'Glutenhaltiges Getreide',
    'B': 'Krebstiere',
    'C': 'Eier',
    'D': 'Fisch',
    'E': 'Erdnüsse',
    'F': 'Soja',
    'G': 'Milch/Laktose',
    'H': 'Schalenfrüchte',
    'L': 'Sellerie',
    'M': 'Senf',
    'N': 'Sesam',
    'O': 'Sulfite',
    'P': 'Lupinen',
    'R': 'Weichtiere'
};

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        console.log('Loading menu from CMS...');
        const response = await fetch('/.netlify/functions/get-menu');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const menuData = await response.json();
        console.log('Menu data loaded:', menuData);
        
        allMenuCategories = menuData;
        displayClassicMenu(menuData);
        createFilterButtons(menuData);
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Create Filter Buttons
function createFilterButtons(menuData) {
    const filtersContainer = document.getElementById('menuFilters');
    if (!filtersContainer) return;
    
    // Clear existing filters
    filtersContainer.innerHTML = '';
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.textContent = 'Alle Kategorien';
    allBtn.addEventListener('click', handleFilterClick);
    filtersContainer.appendChild(allBtn);
    
    // Add category filters
    menuData.forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.setAttribute('data-filter', category.title.toLowerCase().replace(/\s+/g, '-'));
        filterBtn.textContent = category.title;
        filterBtn.addEventListener('click', handleFilterClick);
        filtersContainer.appendChild(filterBtn);
    });
}

// Handle Filter Click
function handleFilterClick(e) {
    const filterValue = e.target.getAttribute('data-filter');
    currentFilter = filterValue;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter menu display
    if (filterValue === 'all') {
        displayClassicMenu(allMenuCategories);
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayClassicMenu(filtered);
    }
}

// Format Price
function formatPrice(price) {
    if (!price) return '';
    // Clean and format price
    const cleanPrice = price.toString().replace(/[€$£¥]/g, '').trim();
    return cleanPrice;
}

// Process Rich Text
function processRichText(text) {
    if (!text) return '';
    
    let html = text;
    
    // Convert markdown to HTML
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if needed
    if (!html.startsWith('<p>')) {
        html = `<p>${html}</p>`;
    }
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
}

// Format Allergens
function formatAllergens(allergens) {
    if (!allergens || allergens.length === 0) return '';
    
    return 'Allergene: ' + allergens.map(code => 
        `<span class="allergen-code">${code}</span>`
    ).join(', ');
}

// Display Classic Menu with 3-Column Layout
function displayClassicMenu(menuData) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Gerichte in dieser Kategorie gefunden.</div>';
        return;
    }
    
    let hasAllergens = false;
    
    menuContainer.innerHTML = menuData.map((category, catIndex) => {
        // Check if any item has allergens
        if (category.items.some(item => item.allergens && item.allergens.length > 0)) {
            hasAllergens = true;
        }
        
        return `
            <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                ${category.image ? `
                    <div class="category-image">
                        <img src="${formatImageUrl(category.image)}" alt="${category.title}" loading="lazy">
                    </div>
                ` : ''}
                
                <div class="category-header">
                    <h3 class="category-title">${category.title}</h3>
                    ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                </div>
                
                <div class="menu-items-grid">
                    ${category.items.map((item, index) => {
                        const hasImage = item.image ? true : false;
                        const isSpecial = item.special || false;
                        
                        return `
                        <div class="menu-item ${isSpecial ? 'special' : ''}">
                            ${isSpecial ? '<div class="special-badge">Empfehlung</div>' : ''}
                            
                            ${hasImage ? `
                                <div class="menu-item-image">
                                    <img src="${formatImageUrl(item.image)}" alt="${item.name}" loading="lazy">
                                </div>
                            ` : ''}
                            
                            <div class="menu-item-header">
                                <h4 class="menu-item-name">${item.name}</h4>
                                ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
                            </div>
                            
                            <div class="menu-item-description">
                                ${processRichText(item.description)}
                            </div>
                            
                            ${item.nutrition && item.nutrition.calories ? `
                                <div class="menu-item-calories">
                                    ${item.nutrition.calories} kcal
                                    ${item.nutrition.protein ? ` • ${item.nutrition.protein} Protein` : ''}
                                    ${item.nutrition.carbs ? ` • ${item.nutrition.carbs} Kohlenhydrate` : ''}
                                    ${item.nutrition.fat ? ` • ${item.nutrition.fat} Fett` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.tags && item.tags.length > 0 ? `
                                <div class="menu-item-tags">
                                    ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                            
                            ${item.allergens && item.allergens.length > 0 ? `
                                <div class="menu-item-allergens">
                                    ${formatAllergens(item.allergens)}
                                </div>
                            ` : ''}
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Add allergen legend if any items have allergens
    if (hasAllergens) {
        menuContainer.innerHTML += `
            <div class="allergen-legend">
                <h3>Allergen-Kennzeichnung</h3>
                <div class="allergen-list">
                    ${Object.entries(allergenMap).map(([code, name]) => 
                        `<div class="allergen-item"><strong>${code}</strong> = ${name}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
}

// Format Image URL
function formatImageUrl(url) {
    if (!url) return '';
    return url.startsWith('/') ? url : `/${url}`;
}

// Load Events from CMS
async function loadEventsFromCMS() {
    try {
        console.log('Loading events from CMS...');
        const response = await fetch('/.netlify/functions/get-events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const eventsData = await response.json();
        console.log('Events data loaded:', eventsData);
        
        displayEvents(eventsData);
    } catch (error) {
        console.error('Error loading events:', error);
        displayFallbackEvent();
    }
}

// Display Events
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    const imageUrl = nextEvent.featuredImage ? formatImageUrl(nextEvent.featuredImage) : '';
    const audioUrl = nextEvent.audioAnnouncement ? formatImageUrl(nextEvent.audioAnnouncement) : '';
    
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        ${imageUrl ? `
            <div class="event-image" style="margin-bottom: 20px;">
                <img src="${imageUrl}" alt="${nextEvent.title}" style="width: 100%; height: auto; border-radius: 4px;">
            </div>
        ` : ''}
        <div class="event-header" style="margin-bottom: 15px;">
            <h3 style="font-size: 20px; margin-bottom: 5px;">${nextEvent.title}</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">${formattedDate}</p>
        </div>
        <div class="event-details" style="font-size: 14px; line-height: 1.6;">
            <p style="margin-bottom: 10px;">${nextEvent.body || nextEvent.description || ''}</p>
            
            ${nextEvent.location ? `
                <p style="margin-bottom: 8px;"><strong>📍 Location:</strong> ${nextEvent.location}</p>
            ` : ''}
            
            ${nextEvent.price ? `
                <p style="margin-bottom: 8px;"><strong>💶 Eintritt:</strong> ${nextEvent.price}</p>
            ` : ''}
        </div>
        
        ${audioUrl ? `
            <div class="audio-player" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <h4 style="font-size: 13px; margin-bottom: 10px;">🎧 Preview</h4>
                <audio controls preload="none" style="width: 100%;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/wav">
                    <source src="${audioUrl}" type="audio/ogg">
                    Dein Browser unterstützt das Audio-Element nicht.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
}

// Fallback Menu
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "Morning Rituals",
            order: 1,
            items: [
                {
                    name: "Warmes Wasser mit Bio-Zitrone",
                    price: "4.90",
                    description: "Der perfekte Start für deine Verdauung. Frisch gepresste Bio-Zitrone in warmem, gefiltertem Wasser.",
                    nutrition: {
                        calories: "25"
                    },
                    tags: ["detox", "vegan"],
                    allergens: []
                },
                {
                    name: "Golden Milk Latte",
                    price: "6.90",
                    description: "Kurkuma, Ingwer, Zimt & Hafermilch. Ein entzündungshemmender Genuss für Körper und Seele.",
                    nutrition: {
                        calories: "180",
                        protein: "5g",
                        carbs: "18g",
                        fat: "8g"
                    },
                    tags: ["anti-inflammatory", "lactosefrei"],
                    allergens: ["A", "F"]
                }
            ]
        },
        {
            title: "Power Bowls",
            order: 2,
            items: [
                {
                    name: "Açaí Sunrise Bowl",
                    price: "12.90",
                    description: "Açaí, Banane, Beeren, hausgemachtes Granola, Kokosflocken und Chiasamen. Getoppt mit frischen Früchten der Saison.",
                    nutrition: {
                        calories: "320",
                        protein: "8g",
                        carbs: "45g",
                        fat: "12g"
                    },
                    tags: ["superfood", "vegan"],
                    allergens: ["A", "H"],
                    special: true
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayClassicMenu(fallbackMenu);
    createFilterButtons(fallbackMenu);
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "Next Monday Special",
        artist: "DJ Cosmic Kitchen",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Erlebe entspannte Lounge-Klänge während deines Brunches! Sanfte Beats treffen auf kulinarische Genüsse."
    }];
    
    displayEvents(fallbackEvent);
}

// Export functions for global access
window.toggleEventWindow = toggleEventWindow;

// Toggle Event Window
function toggleEventWindow() {
    const eventWindow = document.getElementById('eventWindow');
    const toggleIcon = document.getElementById('toggleIcon');
    
    eventWindow.classList.toggle('collapsed');
    toggleIcon.textContent = eventWindow.classList.contains('collapsed') ? '🎵' : '−';
}

// Refresh content function
window.cmsLoader = {
    refresh: function() {
        loadMenuFromCMS();
        loadEventsFromCMS();
    }
};

console.log('Classic Menu CMS Loader initialized. Traditional 3-column layout with allergen display.');