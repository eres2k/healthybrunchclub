// CMS Loader with Image Support for Menu and Events
// Save this as cms-loader.js

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
    
    if (!menuData || menuData.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Derzeit ist keine Speisekarte verfügbar.</p></div>';
        return;
    }
    
    menuGrid.innerHTML = menuData.map(category => {
        const itemsHtml = category.items.map(item => {
            // Only show available items
            if (item.available === false) return '';
            
            return `
                <div class="menu-item">
                    <div class="menu-item-header">
                        <h4 class="menu-item-name">${item.name}</h4>
                        ${item.price ? `<span class="menu-item-price">€${item.price}</span>` : ''}
                    </div>
                    <p class="menu-item-description">${item.description}</p>
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="menu-tags">
                            ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).filter(item => item !== '').join('');
        
        return `
            <div class="menu-card">
                ${category.image ? `
                    <div class="menu-card-image">
                        <img src="${category.image}" alt="${category.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="menu-card-content">
                    <h3 class="menu-category-title">
                        ${category.title}
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

// Display Events with Images
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
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
            ${nextEvent.image ? `
                <div class="event-image">
                    <img src="${nextEvent.image}" alt="${nextEvent.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            <h3>${nextEvent.title}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="event-details">
            ${nextEvent.artist ? `<strong>🎵 ${nextEvent.artist}</strong>` : ''}
            <p>${nextEvent.description}</p>
            
            ${nextEvent.musicStyle ? `
                <strong>🎶 Music Style:</strong>
                <p>${nextEvent.musicStyle}</p>
            ` : ''}
            
            ${nextEvent.startTime ? `
                <strong>⏰ Start:</strong>
                <p>${nextEvent.startTime}</p>
            ` : ''}
        </div>
        
        ${nextEvent.audioPreview ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none">
                    <source src="${nextEvent.audioPreview}" type="audio/mpeg">
                    <source src="${nextEvent.audioPreview}" type="audio/wav">
                    <source src="${nextEvent.audioPreview}" type="audio/ogg">
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
            items: [
                {
                    name: "warmes wasser mit bio-zitrone",
                    description: "der perfekte start für deine verdauung",
                    tags: ["detox", "vegan"],
                    available: true
                },
                {
                    name: "golden milk latte",
                    description: "kurkuma, ingwer, zimt & hafermilch",
                    tags: ["anti-inflammatory", "lactosefrei"],
                    available: true
                }
            ]
        },
        {
            title: "power bowls",
            items: [
                {
                    name: "açaí sunrise bowl",
                    description: "açaí, banane, beeren, granola, kokosflocken",
                    tags: ["superfood", "vegan"],
                    available: true
                },
                {
                    name: "premium porridge",
                    description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                    tags: ["glutenfrei", "protein"],
                    available: true
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
        startTime: "9:00 uhr",
        active: true
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
        transition: transform 0.3s ease;
    }
    
    .menu-card:hover .menu-card-image img {
        transform: scale(1.05);
    }
    
    .menu-card-content {
        padding: 0;
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
    
    .menu-item-price {
        font-weight: 600;
        color: var(--sage-green);
        font-size: 16px;
    }
`;
document.head.appendChild(style);
