// CMS Loader with Fixed Layout and Filters
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
    
    // Clear container
    filtersContainer.innerHTML = '';
    
    // Add "all" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.textContent = 'alle anzeigen';
    allBtn.addEventListener('click', handleFilterClick);
    filtersContainer.appendChild(allBtn);
    
    // Add category filters
    menuData.forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.setAttribute('data-filter', category.title.toLowerCase().replace(/\s+/g, '-'));
        filterBtn.textContent = category.title.toLowerCase();
        filterBtn.addEventListener('click', handleFilterClick);
        filtersContainer.appendChild(filterBtn);
    });
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

// Display Menu with Fixed Layout
// Aktualisierte displayMenu Funktion in cms-loader.js
// Ersetze die bestehende displayMenu Funktion mit dieser:

function displayMenu(menuData) {
    const menuGrid = document.getElementById('menuGrid');
    
    if (!menuData || menuData.length === 0) {
        menuGrid.innerHTML = '<div class="no-menu-message"><p>Keine Einträge gefunden.</p></div>';
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
                <span class="menu-item-name">${item.name}</span>
                <p class="menu-item-description">${item.description}</p>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="menu-tags">
                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        return `
            <div class="menu-card" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                <div class="menu-card-header ${!imageUrl ? 'no-image' : ''}">
                    ${imageUrl ? `
                        <div class="menu-card-bg-image">
                            <img src="${imageUrl}" alt="${category.title}" loading="lazy">
                        </div>
                    ` : `
                        <div class="menu-card-bg-image">
                            🍽️
                        </div>
                    `}
                    <h3 class="menu-category-title">${category.title}</h3>
                </div>
                <div class="menu-card-content">
                    <div class="menu-items">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Fallback Menu with correct data
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "Eggs and other stories",
            order: 1,
            image: "/images/uploads/eggs.jpg",
            items: [
                {
                    name: "EGGS ANY STYLE",
                    description: "(1 oder 2 Eier) Eggs your style auf Süsskartoffel- und Avocadoscheiben. Beilage: Champignons/Shiitake Pilze garniert mit Rucula & Sprossen und Kresse. Styles: Spiegelei/pochiert/Eierspeise",
                    tags: ["vegetarisch"]
                },
                {
                    name: "OMELETTE CREATION",
                    description: "(2 Eier) Basic: Sauerteigbrot (vom Öfferl) Zwiebel, Shiitake-Champignonspilze, Spinat. Add ons: Tomaten/Speckwürfel/Käse/Avocado garniert mit Rucula & Sprossen und Kresse",
                    tags: ["vegetarisch"]
                },
                {
                    name: "BEGGS ENEDICT",
                    description: "(1 oder 2 Eier) Sauerteigbrot (vom Öfferl), pochierte Eier, Sauce Hollandaise, Spinat Add ons: Räucherlachs/BioSpeck/Shiitake-Champignonspilze garniert mit Rucula & Sprossen und Kresse",
                    tags: []
                }
            ]
        },
        {
            title: "Avocado Friends",
            order: 2,
            image: "/images/uploads/avocado.jpg",
            items: [
                {
                    name: "Avocado Bowl",
                    description: "Avocado Bowl Smashed Avocado mit geriebenem Apfel und gehobelte Mandeln",
                    tags: ["vegetarisch"]
                },
                {
                    name: "Avocado Bread",
                    description: "Sauerteigbrot (vom Öfferl) mit smashed Avocado garniert mit Sprossen und Kresse. Extras: Ei (any style)/BioSpeck/BioLachs/Shiitake-Champignons Pilze",
                    tags: ["vegetarisch"]
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayMenu(fallbackMenu);
    createFilterButtons(fallbackMenu);
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
        if (eventWindow) eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    if (eventContent) {
        eventContent.innerHTML = `
            <div class="event-header">
                <h3>${nextEvent.title}</h3>
                <p>${formattedDate}</p>
            </div>
            <div class="event-details">
                <strong>🎵 ${nextEvent.artist || 'Special Guest'}</strong>
                <p>${nextEvent.description || ''}</p>
            </div>
        `;
    }
    
    if (eventWindow) eventWindow.style.display = 'block';
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "next monday special",
        artist: "dj cosmic kitchen",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "erlebe entspannte lounge-klänge während deines brunches!"
    }];
    
    displayEvents(fallbackEvent);
}
