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
    
    // Clear existing content
    menuGrid.innerHTML = '';
    
    // Store all menu items for filtering
    window.allMenuItems = menuData;
    
    // Display all categories
    menuData.forEach(category => {
        const categoryCard = createMenuCategoryCard(category);
        menuGrid.appendChild(categoryCard);
    });
    
    // Trigger animations for newly loaded content
    triggerMenuAnimations();
}

// Create menu category card
function createMenuCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.setAttribute('data-category', category.title.toLowerCase());
    
    // Handle image URL - check if it's a relative path and make it absolute
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
    const itemsHtml = category.items ? category.items.map(item => `
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
    `).join('') : '';
    
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
    let imageHtml = '';
    if (nextEvent.image || nextEvent.featuredImage) {
        const imageUrl = (nextEvent.image || nextEvent.featuredImage).startsWith('/') 
            ? (nextEvent.image || nextEvent.featuredImage) 
            : `/${nextEvent.image || nextEvent.featuredImage}`;
        imageHtml = `
            <div class="event-image">
                <img src="${imageUrl}" alt="${nextEvent.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        `;
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
            ${imageHtml}
            <h3>${nextEvent.title}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="event-details">
            <strong>🎵 ${nextEvent.artist || 'Special Guest'}</strong>
            <p>${nextEvent.description || nextEvent.body || ''}</p>
            
            ${nextEvent.musicStyle ? `
                <strong>🎶 Music Style:</strong>
                <p>${nextEvent.musicStyle}</p>
            ` : ''}
            
            ${nextEvent.startTime ? `
                <strong>⏰ Start:</strong>
                <p>${nextEvent.startTime}</p>
            ` : ''}
        </div>
        
        ${(nextEvent.audioPreview || nextEvent.audioAnnouncement) ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none">
                    <source src="${nextEvent.audioPreview || nextEvent.audioAnnouncement}" type="audio/mpeg">
                    <source src="${nextEvent.audioPreview || nextEvent.audioAnnouncement}" type="audio/wav">
                    <source src="${nextEvent.audioPreview || nextEvent.audioAnnouncement}" type="audio/ogg">
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
        },
        {
            title: "klassiker neu interpretiert",
            icon: "🍳",
            items: [
                {
                    name: "eggs benedict deluxe",
                    description: "bio-eier, avocado, spinat, hollandaise",
                    tags: ["protein", "vegetarisch"]
                },
                {
                    name: "french toast heaven",
                    description: "brioche, ahornsirup, beeren, vanillecreme",
                    tags: ["süß", "indulgent"]
                }
            ]
        },
        {
            title: "drinks & elixiere",
            icon: "🥤",
            items: [
                {
                    name: "immunity booster juice",
                    description: "ingwer, kurkuma, orange, karotte",
                    tags: ["vitamin c", "detox"]
                },
                {
                    name: "green goddess smoothie",
                    description: "spinat, banane, mango, spirulina",
                    tags: ["superfood", "energie"]
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

// Filter menu functionality
window.filterMenu = function(category) {
    const menuGrid = document.getElementById('menuGrid');
    const buttons = document.querySelectorAll('.category-btn');
    
    // Update active button
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(category)) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide menu cards based on category
    const cards = menuGrid.querySelectorAll('.menu-card');
    
    cards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
        } else {
            const cardCategory = card.getAttribute('data-category');
            if (cardCategory && cardCategory.includes(category.toLowerCase())) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
    
    // Re-trigger animations for visible cards
    const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    visibleCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
};

// Initialize filter buttons
document.addEventListener('DOMContentLoaded', function() {
    // Set up filter button event listeners
    const filterButtons = document.querySelectorAll('.category-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const filterValue = this.getAttribute('onclick').match(/filterMenu\('(.+)'\)/)[1];
            window.filterMenu(filterValue);
        });
    });
});
