// CMS Loader with Compact Menu Design and Image Support
// Supports nutrition values, rich text formatting, and images

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
        displayCompactMenu(menuData);
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
        displayCompactMenu(allMenuCategories);
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayCompactMenu(filtered);
    }
}

// Display Compact Menu with Image Support
function displayCompactMenu(menuData) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Einträge gefunden.</div>';
        return;
    }
    
    menuContainer.innerHTML = menuData.map(category => {
        // Handle category image URL
        let imageUrl = '';
        if (category.image) {
            imageUrl = category.image.startsWith('/') ? category.image : `/${category.image}`;
        }
        
        return `
            <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                <div class="category-header ${!imageUrl ? 'no-image' : ''}">
                    ${imageUrl ? `
                        <div class="category-image">
                            <img src="${imageUrl}" alt="${category.title}" loading="lazy" onerror="this.parentElement.parentElement.classList.add('no-image'); this.parentElement.style.display='none';">
                        </div>
                    ` : ''}
                    <div class="category-info">
                        <h3 class="category-title">${category.title}</h3>
                        ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                    </div>
                </div>
                
                <div class="menu-items-grid">
                    ${category.items.map((item, index) => {
                        // Handle dish image URL
                        let dishImageUrl = '';
                        if (item.image) {
                            dishImageUrl = item.image.startsWith('/') ? item.image : `/${item.image}`;
                        }
                        
                        return `
                        <div class="menu-item-card ${dishImageUrl ? 'has-image' : ''}">
                            ${item.special ? '<div class="menu-item-badge">Empfehlung</div>' : ''}
                            
                            ${dishImageUrl ? `
                                <div class="menu-item-image">
                                    <img src="${dishImageUrl}" alt="${item.name}" loading="lazy">
                                </div>
                            ` : ''}
                            
                            <div class="menu-item-content">
                                <div class="menu-item-header">
                                    <h4 class="menu-item-name">${item.name}</h4>
                                    ${item.price ? `<span class="menu-item-price">€${item.price}</span>` : ''}
                                </div>
                                
                                <div class="menu-item-description" id="desc-${category.order}-${index}">
                                    ${processRichText(item.description)}
                                </div>
                                
                                ${item.nutrition ? `
                                    <div class="nutrition-info">
                                        ${item.nutrition.calories ? `
                                            <div class="nutrition-item">
                                                <span class="nutrition-value">${item.nutrition.calories}</span>
                                                <span class="nutrition-label">kcal</span>
                                            </div>
                                        ` : ''}
                                        ${item.nutrition.protein ? `
                                            <div class="nutrition-item">
                                                <span class="nutrition-value">${item.nutrition.protein}</span>
                                                <span class="nutrition-label">Protein</span>
                                            </div>
                                        ` : ''}
                                        ${item.nutrition.carbs ? `
                                            <div class="nutrition-item">
                                                <span class="nutrition-value">${item.nutrition.carbs}</span>
                                                <span class="nutrition-label">Kohlenh.</span>
                                            </div>
                                        ` : ''}
                                        ${item.nutrition.fat ? `
                                            <div class="nutrition-item">
                                                <span class="nutrition-value">${item.nutrition.fat}</span>
                                                <span class="nutrition-label">Fett</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                                
                                ${item.tags && item.tags.length > 0 ? `
                                    <div class="menu-item-tags">
                                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Process rich text from markdown
function processRichText(text) {
    if (!text) return '';
    
    // Convert markdown to HTML
    let html = text;
    
    // Convert bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already
    if (!html.startsWith('<p>')) {
        html = `<p>${html}</p>`;
    }
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
}

// Fallback Menu with image data
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "eggcitements",
            order: 1,
            image: "/content/images/eggs.jpg",
            description: "Proteinreiche Frühstücksklassiker mit Bio-Eiern",
            items: [
                {
                    name: "eggs any style",
                    price: "12.90",
                    image: "/content/images/eggs-any-style.jpg",
                    description: "Wähle zwischen **Spiegelei**, **pochiert** oder **Rührei**\n\n- Serviert auf Süßkartoffel- und Avocadoscheiben\n- Mit sautierten Champignons oder Shiitake-Pilzen\n- Garniert mit frischem Rucola, Sprossen und Kresse",
                    nutrition: {
                        calories: "320",
                        protein: "18g",
                        carbs: "22g",
                        fat: "16g"
                    },
                    tags: ["vegetarisch", "proteinreich"],
                    special: false
                },
                {
                    name: "omelette creation",
                    price: "13.90",
                    description: "Fluffiges Omelette aus 2 Bio-Eiern auf knusprigem Sauerteigbrot\n\n**Basis:** Zwiebel, Shiitake-Pilze, Spinat\n**Add-ons:** Tomaten, Speckwürfel, Käse oder Avocado",
                    nutrition: {
                        calories: "380",
                        protein: "20g",
                        carbs: "26g",
                        fat: "22g"
                    },
                    tags: ["vegetarisch", "anpassbar"],
                    special: false
                },
                {
                    name: "beggs enedict",
                    price: "14.90",
                    image: "/content/images/eggs-benedict.jpg",
                    description: "Pochierte Bio-Eier auf Sauerteigbrot mit cremiger Avocado-Hollandaise\n\n*Wähle deine Beilage:*\n- Bio-Schinken\n- Räucherlachs\n- Gegrilltes Gemüse",
                    nutrition: {
                        calories: "420",
                        protein: "22g",
                        carbs: "28g",
                        fat: "24g"
                    },
                    tags: ["signature"],
                    special: true
                }
            ]
        },
        {
            title: "hafer dich lieb",
            order: 2,
            image: "/content/images/porridge.jpg",
            description: "Glutenfreie, lactosefreie & besonders darmfreundliche Kreationen",
            items: [
                {
                    name: "premium-porridge",
                    price: "9.90",
                    image: "/content/images/premium-porridge.jpg",
                    description: "Ein wärmender Genuss aus zarten **Bio-Haferflocken**\n\nVerfeinert mit:\n- Hanf- und Chiasamen\n- Kokosflocken und geriebenem Apfel\n- Ceylon-Zimt\n- Geröstete Mandeln und frische Beeren",
                    nutrition: {
                        calories: "380",
                        protein: "12g",
                        carbs: "45g",
                        fat: "18g"
                    },
                    tags: ["glutenfrei", "lactosefrei", "darmfreundlich"],
                    special: false
                },
                {
                    name: "kokoscreme power-oats",
                    price: "11.90",
                    description: "Kraftvolle Haferflocken in cremiger Kokosmilch\n\n*Getoppt mit:*\n- Hanf- und Chiasamen\n- Frische Heidel- und Himbeeren\n- Kokosflocken\n- Ahornsirup",
                    nutrition: {
                        calories: "410",
                        protein: "14g",
                        carbs: "48g",
                        fat: "20g"
                    },
                    tags: ["vegan", "energizing"],
                    special: false
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayCompactMenu(fallbackMenu);
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
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    let imageUrl = '';
    if (nextEvent.featuredImage) {
        imageUrl = nextEvent.featuredImage.startsWith('/') ? nextEvent.featuredImage : `/${nextEvent.featuredImage}`;
    }
    
    let audioUrl = '';
    if (nextEvent.audioAnnouncement) {
        audioUrl = nextEvent.audioAnnouncement.startsWith('/') ? nextEvent.audioAnnouncement : `/${nextEvent.audioAnnouncement}`;
    }
    
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        ${imageUrl ? `
            <div class="event-image">
                <img src="${imageUrl}" alt="${nextEvent.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        ` : ''}
        <div class="event-header" style="${imageUrl ? 'background: none; color: var(--text-dark); padding: 0; margin: 0 0 15px 0;' : ''}">
            <h3>${nextEvent.title}</h3>
            <p style="${imageUrl ? 'color: var(--text-medium);' : ''}">${formattedDate}</p>
        </div>
        <div class="event-details">
            <p style="margin-bottom: 10px;">${nextEvent.body || ''}</p>
            
            ${nextEvent.location ? `
                <strong>📍 Location:</strong>
                <p>${nextEvent.location}</p>
            ` : ''}
            
            ${nextEvent.price ? `
                <strong>💶 Eintritt:</strong>
                <p>${nextEvent.price}€</p>
            ` : ''}
        </div>
        
        ${audioUrl ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none" style="width: 100%;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/wav">
                    <source src="${audioUrl}" type="audio/ogg">
                    Dein Browser unterstützt das Audio-Element nicht.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
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
