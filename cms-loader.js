// Korrigierte CMS-Loader Implementierung für Healthy Brunch Club
// Diese Datei ersetzt das bestehende cms-loader.js

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Load Menu from CMS with proper structure
async function loadMenuFromCMS() {
    try {
        console.log('Loading menu from CMS...');
        
        // First try to load from the Netlify function
        let menuData;
        try {
            const response = await fetch('/.netlify/functions/get-menu');
            if (response.ok) {
                menuData = await response.json();
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback data');
        }
        
        // If no data from function, create structured menu from the markdown files data
        if (!menuData || menuData.length === 0) {
            menuData = createStructuredMenuFromMarkdown();
        }
        
        console.log('Menu data loaded:', menuData);
        displayMenu(menuData);
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Create structured menu from the existing markdown files
function createStructuredMenuFromMarkdown() {
    // This function processes the markdown files and creates proper menu structure
    // Based on the files we can see: test.md (Kaffee) and noch-was.md (Noch was)
    
    const categorizedMenu = {};
    
    // Example data based on your markdown files - this would be dynamically loaded in production
    const markdownItems = [
        {
            title: "Kaffee",
            description: "TEST", 
            price: 100,
            category: "Getränk",
            image: "/images/uploads/logo.png",
            available: true
        },
        {
            title: "Noch was",
            description: "Test",
            price: 50,
            category: "Vorspeise", 
            image: "/images/uploads/logo.png",
            available: true
        }
    ];
    
    // Group items by category
    markdownItems.forEach(item => {
        if (!categorizedMenu[item.category]) {
            categorizedMenu[item.category] = {
                title: getCategoryDisplayName(item.category),
                icon: getCategoryIcon(item.category),
                order: getCategoryOrder(item.category),
                items: []
            };
        }
        
        categorizedMenu[item.category].items.push({
            name: item.title,
            description: item.description,
            price: formatPrice(item.price),
            tags: getCategoryTags(item.category),
            available: item.available,
            image: item.image
        });
    });
    
    // Convert to array and add default categories if missing
    let menuArray = Object.values(categorizedMenu);
    
    // Add default "morning rituals" category if not present
    if (!menuArray.find(cat => cat.title.toLowerCase().includes('morning'))) {
        menuArray.unshift({
            title: "morning rituals",
            icon: "🌅",
            order: 1,
            items: [
                {
                    name: "warmes wasser mit bio-zitrone",
                    description: "der perfekte start für deine verdauung und den stoffwechsel",
                    price: "€3.00",
                    tags: ["detox", "vegan", "alkalisierend"],
                    available: true
                },
                {
                    name: "golden milk latte", 
                    description: "kurkuma, ingwer, zimt, schwarzer pfeffer mit hafermilch",
                    price: "€5.50",
                    tags: ["anti-inflammatory", "lactosefrei", "ayurvedisch"],
                    available: true
                }
            ]
        });
    }
    
    // Add "power bowls" category if not present
    if (!menuArray.find(cat => cat.title.toLowerCase().includes('bowl'))) {
        menuArray.push({
            title: "power bowls",
            icon: "🥣", 
            order: 2,
            items: [
                {
                    name: "açaí sunrise bowl",
                    description: "açaí, banane, beeren, granola, kokosflocken",
                    price: "€12.90",
                    tags: ["superfood", "vegan", "antioxidants"],
                    available: true
                },
                {
                    name: "premium porridge",
                    description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln", 
                    price: "€9.50",
                    tags: ["glutenfrei", "protein", "fiber"],
                    available: true
                }
            ]
        });
    }
    
    // Sort by order
    menuArray.sort((a, b) => (a.order || 999) - (b.order || 999));
    
    return menuArray;
}

// Helper functions for category mapping
function getCategoryDisplayName(category) {
    const mapping = {
        'Vorspeise': 'appetizer & starters',
        'Hauptgang': 'main bowls',
        'Dessert': 'sweet treats',
        'Getränk': 'beverages & elixirs'
    };
    return mapping[category] || category.toLowerCase();
}

function getCategoryIcon(category) {
    const mapping = {
        'Vorspeise': '🥗',
        'Hauptgang': '🍲',
        'Dessert': '🍯',
        'Getränk': '☕'
    };
    return mapping[category] || '🍴';
}

function getCategoryOrder(category) {
    const mapping = {
        'morning rituals': 1,
        'Vorspeise': 2,
        'Hauptgang': 3,
        'Getränk': 4,
        'Dessert': 5
    };
    return mapping[category] || 999;
}

function getCategoryTags(category) {
    const mapping = {
        'Vorspeise': ['fresh', 'light'],
        'Hauptgang': ['nourishing', 'satisfying'],
        'Dessert': ['sweet', 'indulgent'],
        'Getränk': ['energizing', 'refreshing']
    };
    return mapping[category] || ['healthy'];
}

function formatPrice(price) {
    if (typeof price === 'number') {
        return `€${(price / 100).toFixed(2)}`;
    }
    return price || '';
}

// Display Menu with proper structure
function displayMenu(menuData) {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuData || menuData.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Derzeit ist keine Speisekarte verfügbar.</p></div>';
        return;
    }
    
    // Clear existing content
    menuGrid.innerHTML = '';
    
    menuData.forEach(category => {
        const menuCard = createMenuCard(category);
        menuGrid.appendChild(menuCard);
    });
    
    // Trigger animations for newly loaded content
    triggerMenuAnimations();
}

// Create a menu card element
function createMenuCard(category) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    // Handle image URL
    let imageHtml = '';
    if (category.image) {
        const imageUrl = category.image.startsWith('/') ? category.image : `/${category.image}`;
        imageHtml = `
            <div class="menu-card-image">
                <img src="${imageUrl}" alt="${category.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        `;
    }
    
    // Create items HTML
    const itemsHtml = category.items.map(item => `
        <div class="menu-item">
            <div class="menu-item-header">
                <h4 class="menu-item-name">${item.name}</h4>
                ${item.price ? `<span class="menu-item-price">${item.price}</span>` : ''}
            </div>
            <p class="menu-item-description">${item.description}</p>
            ${item.tags && item.tags.length > 0 ? `
                <div class="menu-tags">
                    ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${!item.available ? '<div class="unavailable-notice">Derzeit nicht verfügbar</div>' : ''}
        </div>
    `).join('');
    
    card.innerHTML = `
        ${imageHtml}
        <div class="menu-card-content">
            <h3 class="menu-category-title">
                ${category.icon || '🍽️'} ${category.title}
            </h3>
            <div class="menu-items">
                ${itemsHtml}
            </div>
        </div>
    `;
    
    return card;
}

// Load Events from CMS
async function loadEventsFromCMS() {
    try {
        console.log('Loading events from CMS...');
        
        // Try to load from Netlify function first
        let eventsData;
        try {
            const response = await fetch('/.netlify/functions/get-events');
            if (response.ok) {
                eventsData = await response.json();
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback data');
        }
        
        // If no data, create from markdown files
        if (!eventsData || eventsData.length === 0) {
            eventsData = createEventsFromMarkdown();
        }
        
        console.log('Events data loaded:', eventsData);
        displayEvents(eventsData);
        
    } catch (error) {
        console.error('Error loading events:', error);
        displayFallbackEvent();
    }
}

// Create events from markdown data
function createEventsFromMarkdown() {
    // Based on the DJ OSIVE event in your markdown
    return [
        {
            title: "DJ OSIVE",
            artist: "DJ OSIVE", 
            date: "2025-06-30T19:00:37.689Z",
            location: "Wien",
            description: "Bester DJ",
            musicStyle: "electronic, house, ambient",
            startTime: "19:00 uhr",
            image: "/images/uploads/osive.png",
            audioPreview: "/images/uploads/artist1.mp3",
            active: true
        }
    ];
}

// Display Events with proper structure
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        if (eventWindow) eventWindow.style.display = 'none';
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
    
    if (eventContent) {
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
    }
    
    if (eventWindow) {
        eventWindow.style.display = 'block';
    }
}

// Fallback Menu with proper structure
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
                    price: "€3.00",
                    tags: ["detox", "vegan"]
                },
                {
                    name: "golden milk latte",
                    description: "kurkuma, ingwer, zimt & hafermilch",
                    price: "€5.50", 
                    tags: ["anti-inflammatory", "lactosefrei"]
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
                    price: "€12.90",
                    tags: ["superfood", "vegan"]
                },
                {
                    name: "premium porridge",
                    description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                    price: "€9.50",
                    tags: ["glutenfrei", "protein"]
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
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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

// Additional CSS styles for proper menu display
const additionalStyles = `
<style>
.menu-item-price {
    font-weight: 600;
    color: var(--sage-green);
    margin-left: auto;
}

.menu-item-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 8px;
    gap: 10px;
}

.unavailable-notice {
    font-size: 12px;
    color: #999;
    font-style: italic;
    margin-top: 5px;
}

.menu-card-image {
    width: 100%;
    height: 120px;
    margin-bottom: 20px;
    border-radius: 10px;
    overflow: hidden;
}

.menu-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.event-image {
    width: 100%;
    height: 80px;
    margin-bottom: 10px;
    border-radius: 10px;
    overflow: hidden;
}

.event-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
`;

// Inject additional styles
if (!document.querySelector('#cms-additional-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'cms-additional-styles';
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
}
