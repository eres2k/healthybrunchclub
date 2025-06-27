// CMS Loader with Image Support and Filters
// Save this as cms-loader.js

let allMenuCategories = [];

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
        displayMenu(menuData);
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
    
    // Clear existing filters except "all"
    const existingButtons = filtersContainer.querySelectorAll('.filter-btn:not([data-filter="all"])');
    existingButtons.forEach(btn => btn.remove());
    
    // Add category filters
    menuData.forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.setAttribute('data-filter', category.title.toLowerCase().replace(/\s+/g, '-'));
        filterBtn.textContent = category.title;
        filterBtn.addEventListener('click', handleFilterClick);
        filtersContainer.appendChild(filterBtn);
    });
    
    // Add click handler to "all" button
    const allBtn = filtersContainer.querySelector('[data-filter="all"]');
    if (allBtn) {
        allBtn.addEventListener('click', handleFilterClick);
    }
}

// Handle Filter Click
function handleFilterClick(e) {
    const filterValue = e.target.getAttribute('data-filter');
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter menu
    if (filterValue === 'all') {
        displayMenu(allMenuCategories);
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayMenu(filtered);
    }
}

// Display Menu with Images
function displayMenu(menuData) {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuData || menuData.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Keine Einträge in dieser Kategorie.</p></div>';
        return;
    }
    
    menuGrid.innerHTML = menuData.map((category, index) => {
        // Handle image URL
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
            <div class="menu-card" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}" style="animation-delay: ${index * 0.1}s">
                ${imageUrl ? `
                    <div class="menu-card-image">
                        <img src="${imageUrl}" alt="${category.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : `
                    <div class="menu-card-image">
                        <div style="width: 100%; height: 100%; background: var(--sage-green); opacity: 0.1; display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--sage-green);">
                            🍽️
                        </div>
                    </div>
                `}
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
            title: "eggs and other stories",
            image: "/images/uploads/eggs.jpg",
            items: [
                {
                    name: "eggs any style",
                    description: "2 eier nach wahl, süßkartoffel- und avocadoscheiben, champignons, shiitake pilze, rucula & sprossen, kresse",
                    tags: ["vegetarisch"]
                },
                {
                    name: "omelette creation",
                    description: "2 eier basic: sauerteigbrot, zwiebel, shiitake-champignonspilze, spinat",
                    tags: ["vegetarisch"]
                }
            ]
        },
        {
            title: "avocado friends",
            image: "/images/uploads/avocado.jpg",
            items: [
                {
                    name: "avocado bowl",
                    description: "avocado bowl smashed avocado mit geriebenem apfel und gehobelte mandeln",
                    tags: ["vegetarisch"]
                },
                {
                    name: "avocado bread",
                    description: "sauerteigbrot mit smashed avocado garniert mit sprossen und kresse",
                    tags: ["vegetarisch"]
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayMenu(fallbackMenu);
    createFilterButtons(fallbackMenu);
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
