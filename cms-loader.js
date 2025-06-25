// CMS Loader with Dynamic Filter System based on actual CMS categories
// Save this as cms-loader.js

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
});

// Global variable to store all menu items
let allMenuItems = [];
let allCategories = [];

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
        
        // Extract unique categories from the actual data
        extractCategories();
        
        // Create filter buttons based on actual categories
        createFilterButtons();
        
        // Display all items initially
        displayFilteredMenu('all');
        
        // Initialize filter system after buttons are created
        initializeFilterSystem();
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Extract unique categories from menu items
function extractCategories() {
    const categories = new Set();
    allMenuItems.forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    allCategories = Array.from(categories);
    console.log('Found categories:', allCategories);
}

// Create filter buttons dynamically
function createFilterButtons() {
    const filterContainer = document.querySelector('.menu-filters');
    if (!filterContainer) {
        console.error('Filter container not found');
        return;
    }
    
    // Clear existing buttons
    filterContainer.innerHTML = '';
    
    // Add "All" button
    const allButton = document.createElement('button');
    allButton.className = 'category-filter active';
    allButton.dataset.category = 'all';
    allButton.textContent = 'Alle';
    filterContainer.appendChild(allButton);
    
    // Add buttons for each category
    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-filter';
        button.dataset.category = category;
        button.textContent = category;
        filterContainer.appendChild(button);
    });
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
        menuGrid.innerHTML = `<div class="no-menu-message"><p>Keine Einträge in der Kategorie "${category}" gefunden.</p></div>`;
        return;
    }
    
    // Group items by their actual category for display
    const groupedItems = {};
    filteredItems.forEach(item => {
        const cat = item.category || 'Uncategorized';
        if (!groupedItems[cat]) {
            groupedItems[cat] = {
                title: cat,
                items: []
            };
        }
        groupedItems[cat].items.push(item);
    });
    
    // Clear existing content
    menuGrid.innerHTML = '';
    
    // Create category cards
    Object.values(groupedItems).forEach((categoryGroup, index) => {
        const categoryCard = createCategoryCard(categoryGroup);
        categoryCard.style.opacity = '0';
        categoryCard.style.transform = 'translateY(30px)';
        categoryCard.style.transition = `all 0.6s ease ${index * 0.1}s`;
        
        menuGrid.appendChild(categoryCard);
        
        // Trigger animation
        setTimeout(() => {
            categoryCard.style.opacity = '1';
            categoryCard.style.transform = 'translateY(0)';
        }, 50);
    });
}

// Create category card with items
function createCategoryCard(categoryGroup) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    // Determine icon based on category name
    const icon = getCategoryIcon(categoryGroup.title);
    
    const itemsHtml = categoryGroup.items.map(item => `
        <div class="menu-item">
            <div class="menu-item-header">
                <h4 class="menu-item-name">${item.name}</h4>
                ${item.price ? `<span class="menu-item-price">${item.price}</span>` : ''}
            </div>
            <p class="menu-item-description">${item.description || ''}</p>
            ${item.tags && item.tags.length > 0 ? `
                <div class="menu-tags">
                    ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${item.audioFile ? `
                <div class="menu-audio-preview">
                    <audio controls preload="none">
                        <source src="${item.audioFile}" type="audio/mpeg">
                        Dein Browser unterstützt das Audio-Element nicht.
                    </audio>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    card.innerHTML = `
        ${categoryGroup.items[0]?.image ? `
            <div class="menu-card-image">
                <img src="${categoryGroup.items[0].image}" alt="${categoryGroup.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        ` : ''}
        <div class="menu-card-content">
            <h3 class="menu-category-title">
                ${icon} ${categoryGroup.title}
            </h3>
            <div class="menu-items">
                ${itemsHtml}
            </div>
        </div>
    `;
    
    return card;
}

// Get icon for category
function getCategoryIcon(category) {
    const categoryLower = category.toLowerCase();
    
    // Check for specific keywords
    if (categoryLower.includes('egg') || categoryLower.includes('ei')) return '🥚';
    if (categoryLower.includes('drink') || categoryLower.includes('getränk')) return '☕';
    if (categoryLower.includes('bowl')) return '🥣';
    if (categoryLower.includes('sweet') || categoryLower.includes('dessert')) return '🍰';
    if (categoryLower.includes('salad') || categoryLower.includes('vorspeise')) return '🥗';
    if (categoryLower.includes('main') || categoryLower.includes('haupt')) return '🍽️';
    if (categoryLower.includes('special')) return '⭐';
    if (categoryLower.includes('vegan')) return '🌱';
    if (categoryLower.includes('breakfast') || categoryLower.includes('frühstück')) return '🌅';
    
    // Default icon
    return '🍴';
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

// Display Events with Images
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    let imageUrl = '';
    if (nextEvent.image) {
        imageUrl = nextEvent.image.startsWith('/') ? nextEvent.image : `/${nextEvent.image}`;
    }
    
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
            name: "Eggs Benedict",
            description: "pochierte eier, spinat, hollandaise, vollkornbrot",
            category: "Eggs & other stories",
            tags: ["protein", "classic"],
            price: "€14"
        },
        {
            name: "Green Shakshuka",
            description: "eier in grüner sauce mit spinat, kräutern und feta",
            category: "Eggs & other stories",
            tags: ["vegetarisch", "glutenfrei"],
            price: "€12"
        },
        {
            name: "Golden Milk Latte",
            description: "kurkuma, ingwer, zimt & hafermilch",
            category: "Morning Drinks",
            tags: ["anti-inflammatory", "lactosefrei"],
            price: "€6"
        },
        {
            name: "Açaí Sunrise Bowl",
            description: "açaí, banane, beeren, granola, kokosflocken",
            category: "Power Bowls",
            tags: ["superfood", "vegan"],
            price: "€12"
        }
    ];
    
    allMenuItems = fallbackItems;
    extractCategories();
    createFilterButtons();
    displayFilteredMenu('all');
    initializeFilterSystem();
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

// Add some CSS for better styling
const style = document.createElement('style');
style.textContent = `
    .menu-filters {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin: 40px auto;
        flex-wrap: wrap;
        max-width: 1200px;
    }
    
    .category-filter {
        padding: 10px 24px;
        background: white;
        border: 2px solid var(--sage-green);
        border-radius: 25px;
        color: var(--sage-green);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        text-transform: lowercase;
        letter-spacing: 0.5px;
    }
    
    .category-filter:hover {
        background: var(--sage-green);
        color: white;
        transform: translateY(-2px);
    }
    
    .category-filter.active {
        background: var(--sage-green);
        color: white;
    }
    
    .menu-card {
        background: var(--warm-white);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: var(--card-shadow);
        transition: all 0.3s ease;
        position: relative;
    }
    
    .menu-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--nature-gradient);
    }
    
    .menu-category-title {
        font-family: var(--font-accent);
        font-size: 28px;
        color: var(--sage-green);
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    @media (max-width: 768px) {
        .menu-filters {
            gap: 10px;
        }
        
        .category-filter {
            padding: 8px 16px;
            font-size: 13px;
        }
    }
`;
document.head.appendChild(style);
