// CMS Loader with Image Support for Menu and Events
// Save this as cms-loader.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader initialized');
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        console.log('Loading menu from CMS...');
        
        // Check if we're in development or production
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
            // Use fallback data in development
            console.log('Development mode - using fallback menu');
            displayFallbackMenu();
            return;
        }
        
        const response = await fetch('/.netlify/functions/get-menu');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const menuData = await response.json();
        console.log('Menu data loaded:', menuData);
        
        displayMenu(menuData);
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Load Events from CMS
async function loadEventsFromCMS() {
    try {
        console.log('Loading events from CMS...');
        
        // Check if we're in development or production
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
            // Use fallback data in development
            console.log('Development mode - using fallback events');
            displayFallbackEvent();
            return;
        }
        
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

// Display Menu with Images
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
    
    // Transform CMS data to match expected format
    const transformedData = transformMenuData(menuData);
    
    menuGrid.innerHTML = transformedData.map(category => {
        // Handle image URL - check if it's a relative path and make it absolute
        let imageUrl = '';
        if (category.image) {
            imageUrl = category.image.startsWith('/') ? category.image : `/${category.image}`;
        }
        
        const itemsHtml = category.items.map(item => `
            <div class="menu-item">
                <div class="menu-item-header">
                    <h4 class="menu-item-name">${item.name}</h4>
                </div>
                <p class="menu-item-description">${item.description}</p>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="menu-tags">
                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        return `
            <div class="menu-card">
                ${imageUrl ? `
                    <div class="menu-card-image">
                        <img src="${imageUrl}" alt="${category.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="menu-card-content">
                    <h3 class="menu-category-title">
                        ${category.icon || '🍽️'} ${category.title}
                    </h3>
                    <div class="menu-items">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Trigger animations for newly loaded content
    triggerMenuAnimations();
}

// Transform menu data from CMS format
function transformMenuData(cmsData) {
    // If the data is already in the correct format, return it
    if (Array.isArray(cmsData) && cmsData.length > 0 && cmsData[0].items) {
        return cmsData;
    }
    
    // Otherwise, transform individual menu items into categories
    const categories = {
        'Vorspeise': {
            title: 'vorspeisen',
            icon: '🥗',
            items: [],
            order: 1
        },
        'Hauptgang': {
            title: 'hauptgänge',
            icon: '🍽️',
            items: [],
            order: 2
        },
        'Dessert': {
            title: 'desserts',
            icon: '🍰',
            items: [],
            order: 3
        },
        'Getränk': {
            title: 'getränke',
            icon: '☕',
            items: [],
            order: 4
        }
    };
    
    // Group items by category
    cmsData.forEach(item => {
        if (item.category && categories[item.category]) {
            categories[item.category].items.push({
                name: item.title,
                description: item.description,
                price: item.price ? `€${item.price}` : '',
                tags: item.tags || [],
                available: item.available !== false
            });
            
            // Use the first image of each category as the category image
            if (item.image && !categories[item.category].image) {
                categories[item.category].image = item.image;
            }
        }
    });
    
    // Convert to array and filter out empty categories
    return Object.values(categories)
        .filter(cat => cat.items.length > 0)
        .sort((a, b) => a.order - b.order);
}

// Display Events with Images
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
    
    // Handle image URL
    let imageUrl = '';
    if (nextEvent.featuredImage || nextEvent.image) {
        const img = nextEvent.featuredImage || nextEvent.image;
        imageUrl = img.startsWith('/') ? img : `/${img}`;
    }
    
    // Format the date
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        <div class="event-header">
            ${imageUrl ? `
                <div class="event-image">
                    <img src="${imageUrl}" alt="${nextEvent.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            <h3>${nextEvent.title}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="event-details">
            ${nextEvent.location ? `<strong>📍 ${nextEvent.location}</strong>` : ''}
            <p>${nextEvent.body || nextEvent.description || ''}</p>
            
            ${nextEvent.musicStyle ? `
                <strong>🎶 Music Style:</strong>
                <p>${nextEvent.musicStyle}</p>
            ` : ''}
            
            ${nextEvent.startTime ? `
                <strong>⏰ Start:</strong>
                <p>${nextEvent.startTime}</p>
            ` : ''}
            
            ${nextEvent.price ? `
                <strong>💰 Preis:</strong>
                <p>€${nextEvent.price}</p>
            ` : ''}
        </div>
        
        ${nextEvent.audioAnnouncement || nextEvent.audioPreview ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none">
                    <source src="${nextEvent.audioAnnouncement || nextEvent.audioPreview}" type="audio/mpeg">
                    <source src="${nextEvent.audioAnnouncement || nextEvent.audioPreview}" type="audio/wav">
                    <source src="${nextEvent.audioAnnouncement || nextEvent.audioPreview}" type="audio/ogg">
                    Dein Browser unterstützt das Audio-Element nicht.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
}

// Fallback Menu
function displayFallbackMenu() {
    const menuGrid = document.getElementById('menuGrid');
    
    const fallbackMenu = [
        {
            title: "morning rituals",
            icon: "🌅",
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
        }
    ];
    
    displayMenu(fallbackMenu);
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "next monday special",
        artist: "dj cosmic kitchen",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        description: "erlebe entspannte lounge-klänge während deines brunches!",
        musicStyle: "downtempo, organic house",
        startTime: "9:00 uhr"
    }];
    
    displayEvents(fallbackEvent);
}

// Trigger animations for menu cards
function triggerMenuAnimations() {
    const cards = document.querySelectorAll('.menu-card');
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

// Add styles for menu card images
const style = document.createElement('style');
style.textContent = `
    .menu-card-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        border-radius: 15px 15px 0 0;
        margin: -30px -30px 20px -30px;
    }
    
    .menu-card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .event-image {
        width: 100%;
        height: 150px;
        overflow: hidden;
        border-radius: 10px;
        margin-bottom: 15px;
    }
    
    .event-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;
document.head.appendChild(style);
