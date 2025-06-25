// CMS Loader with Filter System for Menu Items
// Save this as cms-loader.js

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
    initializeFilterSystem();
});

// Global variable to store all menu items
let allMenuItems = [];

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
        
        // Store all items for filtering
        allMenuItems = menuData;
        
        // Display all items initially
        displayFilteredMenu('all');
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Initialize filter system
function initializeFilterSystem() {
    // Add event listeners to filter buttons
    document.querySelectorAll('.category-filter').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update active state
            document.querySelectorAll('.category-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Display filtered items
            displayFilteredMenu(category);
        });
    });
}

// Display filtered menu items
function displayFilteredMenu(category) {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!allMenuItems || allMenuItems.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Keine Menüeinträge verfügbar.</p></div>';
        return;
    }
    
    // Filter items based on category
    let filteredItems = allMenuItems;
    if (category !== 'all') {
        filteredItems = allMenuItems.filter(item => item.category === category);
    }
    
    if (filteredItems.length === 0) {
        menuGrid.innerHTML = `<div class="no-menu-message"><p>Keine Einträge in dieser Kategorie gefunden.</p></div>`;
        return;
    }
    
    // Clear existing content
    menuGrid.innerHTML = '';
    
    // Create menu item cards
    filteredItems.forEach((item, index) => {
        const menuCard = createMenuItemCard(item);
        menuCard.style.opacity = '0';
        menuCard.style.transform = 'translateY(30px)';
        menuCard.style.transition = `all 0.6s ease ${index * 0.1}s`;
        
        menuGrid.appendChild(menuCard);
        
        // Trigger animation
        setTimeout(() => {
            menuCard.style.opacity = '1';
            menuCard.style.transform = 'translateY(0)';
        }, 50);
    });
}

// Create individual menu item card
function createMenuItemCard(item) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    // Determine icon based on category
    const categoryIcons = {
        'Getränk': '☕',
        'Vorspeise': '🥗',
        'Hauptgang': '🍽️',
        'Dessert': '🍰'
    };
    
    const icon = categoryIcons[item.category] || '🍴';
    
    card.innerHTML = `
        ${item.image ? `
            <div class="menu-card-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        ` : ''}
        <div class="menu-card-content">
            <div class="menu-item-header">
                <h3 class="menu-item-name">
                    <span class="menu-item-icon">${icon}</span>
                    ${item.name}
                </h3>
                ${item.price ? `<span class="menu-item-price">${item.price}</span>` : ''}
            </div>
            <p class="menu-item-description">${item.description}</p>
            ${item.tags && item.tags.length > 0 ? `
                <div class="menu-tags">
                    ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${item.audioFile ? `
                <div class="menu-audio-preview">
                    <audio controls preload="none">
                        <source src="${item.audioFile}" type="audio/mpeg">
                        <source src="${item.audioFile}" type="audio/wav">
                        Dein Browser unterstützt das Audio-Element nicht.
                    </audio>
                </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Load Events from CMS (unchanged)
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

// Display Events with Images (unchanged)
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    // Get the next upcoming event
    const nextEvent = eventsData[0];
    
    // Handle image URL
    let imageUrl = '';
    if (nextEvent.image) {
        imageUrl = nextEvent.image.startsWith('/') ? nextEvent.image : `/${nextEvent.image}`;
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
            <strong>🎵 ${nextEvent.artist || 'Special Guest'}</strong>
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
    
    const fallbackItems = [
        {
            name: "warmes wasser mit bio-zitrone",
            description: "der perfekte start für deine verdauung",
            category: "Getränk",
            tags: ["detox", "vegan"],
            price: "€4"
        },
        {
            name: "golden milk latte",
            description: "kurkuma, ingwer, zimt & hafermilch",
            category: "Getränk",
            tags: ["anti-inflammatory", "lactosefrei"],
            price: "€6"
        },
        {
            name: "açaí sunrise bowl",
            description: "açaí, banane, beeren, granola, kokosflocken",
            category: "Vorspeise",
            tags: ["superfood", "vegan"],
            price: "€12"
        },
        {
            name: "eggs benedict",
            description: "pochierte eier, spinat, hollandaise, vollkornbrot",
            category: "Hauptgang",
            tags: ["protein", "classic"],
            price: "€14"
        }
    ];
    
    allMenuItems = fallbackItems;
    displayFilteredMenu('all');
}

// Fallback Event (unchanged)
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

// Add some CSS for the menu items
const style = document.createElement('style');
style.textContent = `
    .menu-card {
        background: var(--warm-white);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: var(--card-shadow);
        transition: all 0.3s ease;
    }
    
    .menu-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--hover-shadow);
    }
    
    .menu-card-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
    }
    
    .menu-card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .menu-card-content {
        padding: 25px;
    }
    
    .menu-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .menu-item-name {
        font-size: 20px;
        color: var(--text-dark);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .menu-item-icon {
        font-size: 24px;
    }
    
    .menu-item-price {
        font-size: 18px;
        color: var(--sage-green);
        font-weight: 700;
    }
    
    .menu-item-description {
        color: var(--text-medium);
        margin-bottom: 15px;
        line-height: 1.6;
    }
    
    .menu-audio-preview {
        margin-top: 15px;
    }
    
    .menu-audio-preview audio {
        width: 100%;
        height: 35px;
    }
    
    .category-filter {
        padding: 10px 20px;
        background: white;
        border: 2px solid var(--sage-green);
        border-radius: 25px;
        color: var(--sage-green);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .category-filter:hover {
        background: var(--sage-green);
        color: white;
    }
    
    .category-filter.active {
        background: var(--sage-green);
        color: white;
    }
`;
document.head.appendChild(style);
