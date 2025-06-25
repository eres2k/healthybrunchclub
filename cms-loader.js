// CMS Loader with proper Menu and Events handling
// Save this as cms-loader.js (replace the existing one)

document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader initialized');
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        console.log('Loading menu from CMS...');
        
        // Try to fetch from Netlify Function first
        try {
            const response = await fetch('/.netlify/functions/get-menu');
            
            if (response.ok) {
                const menuData = await response.json();
                console.log('Menu loaded from Netlify function:', menuData);
                displayMenu(menuData);
                return;
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback data');
        }
        
        // Use fallback menu data
        displayFallbackMenu();
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Load Events from CMS
async function loadEventsFromCMS() {
    try {
        console.log('Loading events from CMS...');
        
        // Try to fetch from Netlify Function first
        try {
            const response = await fetch('/.netlify/functions/get-events');
            
            if (response.ok) {
                const eventsData = await response.json();
                console.log('Events loaded from Netlify function:', eventsData);
                displayEvents(eventsData);
                return;
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback data');
        }
        
        // Use fallback event data
        displayFallbackEvent();
        
    } catch (error) {
        console.error('Error loading events:', error);
        displayFallbackEvent();
    }
}

// Display Menu Categories
function displayMenu(menuData) {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuGrid) {
        console.error('Menu grid element not found');
        return;
    }
    
    if (!menuData || menuData.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Derzeit ist keine Speisekarte verfügbar.</p></div>';
        return;
    }
    
    // Clear existing content
    menuGrid.innerHTML = '';
    
    // Create menu cards for each category
    menuData.forEach((category, index) => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        // Build items HTML
        const itemsHtml = category.items.map(item => `
            <div class="menu-item">
                <div class="menu-item-header">
                    <span class="menu-item-name">${item.name}</span>
                </div>
                <p class="menu-item-description">${item.description}</p>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="menu-tags">
                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Create the card HTML
        card.innerHTML = `
            <h3 class="menu-category-title">
                ${category.icon || '🍽️'} ${category.title}
            </h3>
            <div class="menu-items">
                ${itemsHtml}
            </div>
        `;
        
        menuGrid.appendChild(card);
        
        // Animate the card
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Display Events
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventWindow || !eventContent) {
        console.error('Event window elements not found');
        return;
    }
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    // Get the next upcoming event
    const nextEvent = eventsData[0];
    
    // Format the date
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        <div class="event-header">
            <h3>${nextEvent.title || 'Special Event'}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="event-details">
            ${nextEvent.artist ? `<strong>🎵 ${nextEvent.artist}</strong>` : ''}
            ${nextEvent.description ? `<p>${nextEvent.description}</p>` : ''}
            
            ${nextEvent.musicStyle ? `
                <strong>🎶 musik-stil:</strong>
                <p>${nextEvent.musicStyle}</p>
            ` : ''}
            
            ${nextEvent.startTime ? `
                <strong>⏰ start:</strong>
                <p>${nextEvent.startTime}</p>
            ` : ''}
        </div>
        
        ${nextEvent.audioAnnouncement ? `
            <div class="audio-player">
                <h4>🎧 hör rein:</h4>
                <audio controls preload="none">
                    <source src="${nextEvent.audioAnnouncement}" type="audio/mpeg">
                    <source src="${nextEvent.audioAnnouncement}" type="audio/mp3">
                    <source src="${nextEvent.audioAnnouncement}" type="audio/wav">
                    <source src="${nextEvent.audioAnnouncement}" type="audio/ogg">
                    dein browser unterstützt kein audio.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
}

// Fallback Menu Data
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "morning rituals",
            icon: "🌅",
            order: 1,
            items: [
                {
                    name: "warmes wasser mit bio-zitrone",
                    description: "der perfekte start für deine verdauung",
                    tags: ["detox", "vegan"]
                },
                {
                    name: "golden milk latte",
                    description: "kurkuma, ingwer, zimt & hafermilch",
                    tags: ["anti-inflammatory", "lactosefrei"]
                },
                {
                    name: "matcha zeremonie",
                    description: "ceremonial grade matcha, aufgeschäumt",
                    tags: ["energy", "antioxidants"]
                }
            ]
        },
        {
            title: "power bowls",
            icon: "🥣",
            order: 2,
            items: [
                {
                    name: "açaí sunrise bowl",
                    description: "açaí, banane, beeren, granola, kokosflocken",
                    tags: ["superfood", "vegan"]
                },
                {
                    name: "premium porridge",
                    description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                    tags: ["glutenfrei", "protein"]
                },
                {
                    name: "buddha bowl deluxe",
                    description: "quinoa, hummus, grillgemüse, tahini-dressing",
                    tags: ["protein-rich", "vegan"]
                }
            ]
        },
        {
            title: "conscious classics",
            icon: "🥐",
            order: 3,
            items: [
                {
                    name: "bio-avocado toast",
                    description: "vollkornbrot, avocado, hanfsamen, kirschtomaten",
                    tags: ["vegetarisch", "omega-3"]
                },
                {
                    name: "french toast deluxe",
                    description: "brioche, ahornsirup, saisonale früchte",
                    tags: ["sweet treat"]
                },
                {
                    name: "eggs benedict healthy",
                    description: "pochierte bio-eier, spinat, hollandaise-leicht",
                    tags: ["protein", "low-carb option"]
                }
            ]
        },
        {
            title: "feel-good drinks",
            icon: "🥤",
            order: 4,
            items: [
                {
                    name: "immunity booster",
                    description: "ingwer, kurkuma, orange, schwarzer pfeffer",
                    tags: ["fresh pressed", "vitamin c"]
                },
                {
                    name: "green goddess juice",
                    description: "spinat, apfel, gurke, zitrone, minze",
                    tags: ["detox", "alkaline"]
                },
                {
                    name: "specialty coffee",
                    description: "fair-trade bohnen, optional mit pflanzenmilch",
                    tags: ["organic", "barista made"]
                }
            ]
        }
    ];
    
    displayMenu(fallbackMenu);
}

// Fallback Event Data
function displayFallbackEvent() {
    // Calculate next Monday
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    
    const fallbackEvent = [{
        title: "monday vibes special",
        artist: "dj cosmic kitchen",
        date: nextMonday.toISOString(),
        description: "erlebe entspannte lounge-klänge während deines brunches mit unserem special guest!",
        musicStyle: "downtempo, organic house, world fusion",
        startTime: "9:00 uhr",
        audioAnnouncement: "/images/uploads/artist1.mp3" // This matches your uploaded file
    }];
    
    displayEvents(fallbackEvent);
}

// Utility function to check if CMS content exists
async function checkCMSContent() {
    try {
        // Check for menu items
        const menuItems = document.querySelectorAll('meta[name="cms-menu-item"]');
        if (menuItems.length > 0) {
            console.log('Found CMS menu items in meta tags');
            // Parse and display menu from meta tags
        }
        
        // Check for events
        const eventItems = document.querySelectorAll('meta[name="cms-event"]');
        if (eventItems.length > 0) {
            console.log('Found CMS events in meta tags');
            // Parse and display events from meta tags
        }
    } catch (error) {
        console.error('Error checking CMS content:', error);
    }
}

// Initialize periodic refresh
setInterval(() => {
    console.log('Refreshing content...');
    loadMenuFromCMS();
    loadEventsFromCMS();
}, 300000); // Refresh every 5 minutes

// Export for debugging
window.cmsLoader = {
    loadMenu: loadMenuFromCMS,
    loadEvents: loadEventsFromCMS,
    refresh: () => {
        loadMenuFromCMS();
        loadEventsFromCMS();
    }
};
