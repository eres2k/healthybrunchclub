// CMS Loader with Dynamic Category Filters
// Save this as cms-loader.js

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Store menu data globally for filtering
let globalMenuData = [];
let currentFilter = 'all';

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
        
        // Store globally for filtering
        globalMenuData = menuData;
        
        // Create filter buttons
        createFilterButtons(menuData);
        
        // Display menu
        displayMenu(menuData);
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Create filter buttons dynamically
function createFilterButtons(menuData) {
    const menuSection = document.querySelector('.menu-section');
    const menuHeader = menuSection.querySelector('.menu-header');
    
    // Hide any existing static filter buttons from the HTML
    const existingFilters = menuSection.querySelectorAll('.menu-categories');
    existingFilters.forEach(filter => {
        if (!filter.classList.contains('cms-generated')) {
            filter.style.display = 'none';
        }
    });
    
    // Check if filter container already exists
    let filterContainer = document.querySelector('.menu-categories.cms-generated');
    
    if (!filterContainer) {
        // Create filter container
        filterContainer = document.createElement('div');
        filterContainer.className = 'menu-categories cms-generated';
        filterContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-bottom: 3rem;
            flex-wrap: wrap;
        `;
        
        // Insert after menu header
        menuHeader.insertAdjacentElement('afterend', filterContainer);
    }
    
    // Clear existing buttons
    filterContainer.innerHTML = '';
    
    // Create "Alle" button
    const allButton = createFilterButton('Alle', 'all', true);
    filterContainer.appendChild(allButton);
    
    // Create buttons for each category
    menuData.forEach(category => {
        const button = createFilterButton(
            category.title,
            category.title,
            false
        );
        filterContainer.appendChild(button);
    });
}

// Create individual filter button
function createFilterButton(text, value, isActive) {
    const button = document.createElement('button');
    button.className = `category-btn ${isActive ? 'active' : ''}`;
    button.textContent = text;
    button.onclick = () => filterMenu(value);
    
    button.style.cssText = `
        padding: 0.75rem 1.5rem;
        background: ${isActive ? '#A8C09A' : 'white'};
        border: 2px solid #A8C09A;
        border-radius: 25px;
        color: ${isActive ? 'white' : '#A8C09A'};
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
    `;
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
            button.style.background = '#A8C09A';
            button.style.color = 'white';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
            button.style.background = 'white';
            button.style.color = '#A8C09A';
        }
    });
    
    return button;
}

// Filter menu function
function filterMenu(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === filter || (filter === 'all' && btn.textContent === 'Alle')) {
            btn.classList.add('active');
            btn.style.background = '#A8C09A';
            btn.style.color = 'white';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#A8C09A';
        }
    });
    
    // Filter and display menu
    if (filter === 'all') {
        displayMenu(globalMenuData);
    } else {
        const filteredData = globalMenuData.filter(category => 
            category.title === filter
        );
        displayMenu(filteredData);
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
        // Handle image URL - check if it's a relative path and make it absolute
        let imageUrl = '';
        if (category.image) {
            imageUrl = category.image.startsWith('/') ? category.image : `/${category.image}`;
        }
        
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

// Add necessary styles for filter buttons
const style = document.createElement('style');
style.textContent = `
    .category-btn {
        font-family: 'Lora', serif;
    }
    
    .category-btn.active {
        background: #A8C09A !important;
        color: white !important;
    }
    
    .menu-item-price {
        font-weight: 600;
        color: #A8C09A;
        margin-left: 10px;
    }
    
    /* Hide static menu categories that are not CMS-generated */
    .menu-categories:not(.cms-generated) {
        display: none !important;
    }
`;
document.head.appendChild(style);

// Also hide static filters immediately on load
document.addEventListener('DOMContentLoaded', function() {
    const staticFilters = document.querySelectorAll('.menu-categories:not(.cms-generated)');
    staticFilters.forEach(filter => filter.style.display = 'none');
});
