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
        displayCompactMenu(menuData, false);
        createFilterButtons(menuData);
        // Add PDF export button on initial load
        addPDFExportButton();
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
        // Add PDF export button for fallback menu too
        addPDFExportButton();
    }
}

// Create Filter Buttons
function createFilterButtons(menuData) {
    const filtersContainer = document.getElementById('menuFilters');
    if (!filtersContainer) return;
    
    // Clear container
    filtersContainer.innerHTML = '';
    
    // Add "all" button with PDF export
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.innerHTML = 'alle anzeigen <span style="font-size: 11px; opacity: 0.7;">(PDF)</span>';
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
        displayCompactMenu(allMenuCategories, false); // false = all categories view
        // Add PDF export option for "all"
        addPDFExportButton();
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayCompactMenu(filtered, true); // true = single category view
        removePDFExportButton();
    }
}

// Add PDF Export Button
function addPDFExportButton() {
    // Remove existing button if any
    removePDFExportButton();
    
    const menuHeader = document.querySelector('.menu-header');
    if (!menuHeader) return;
    
    const pdfButton = document.createElement('button');
    pdfButton.id = 'pdfExportBtn';
    pdfButton.className = 'pdf-export-btn';
    pdfButton.innerHTML = '📄 Als PDF speichern';
    pdfButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: var(--forest-green);
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    pdfButton.addEventListener('mouseover', function() {
        this.style.background = 'var(--taupe)';
        this.style.transform = 'translateY(-2px)';
    });
    
    pdfButton.addEventListener('mouseout', function() {
        this.style.background = 'var(--forest-green)';
        this.style.transform = 'translateY(0)';
    });
    
    pdfButton.addEventListener('click', function() {
        window.print();
    });
    
    menuHeader.style.position = 'relative';
    menuHeader.appendChild(pdfButton);
}

// Remove PDF Export Button
function removePDFExportButton() {
    const existingBtn = document.getElementById('pdfExportBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
}

// Display Compact Menu with Image Support
function displayCompactMenu(menuData, isSingleCategory = false) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Einträge gefunden.</div>';
        return;
    }
    
    // Add class to indicate display mode
    menuContainer.className = isSingleCategory ? 'menu-container single-category' : 'menu-container all-categories';
    
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
            title: "sets",
            order: -1,
            image: "/content/images/set.jpg",
            description: "Unsere liebevoll zusammengestellten Kombinationen",
            items: [
                {
                    name: "tessa's feel good combi",
                    price: "16.90",
                    description: "• einen wiener klassiker kaffee\n• premium porridge\n• frisch gepressten saft deiner wahl",
                    tags: ["herzhaft", "gesund", "sättigend"],
                    special: false
                },
                {
                    name: "tina's soul food set",
                    price: "18.90",
                    description: "• einen chaga tee mit adaptogene\n• avocado bread +pilze (1.50€) +speck (1.90€) +ei (1.40€)\n• hafer dich lieb",
                    tags: ["herzhaft", "gesund", "sättigend"],
                    special: false
                },
                {
                    name: "charlotte's healthy treat set",
                    price: "19.50",
                    description: "• ein reishi cappuccino mit collagen\n• ein eggcitement deiner wahl (aufpreis zweites ei 1.40€)\n• berry good choice",
                    tags: ["herzhaft", "gesund", "sättigend"],
                    special: true
                }
            ]
        },
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
                    description: "bestehend aus einem oder zwei eiern, meisterhaft zubereitete eier nach deiner wahl, kunstvoll serviert auf süßkartoffel- und avocadoscheiben.\n\n**your style:**\n• spiegelei\n• pochiert\n• eierspeise",
                    nutrition: {
                        calories: "324",
                        protein: "13g",
                        carbs: "27g",
                        fat: "15g"
                    },
                    tags: ["vegetarisch", "proteinreich", "gesund"],
                    special: false
                },
                {
                    name: "omelette creation",
                    price: "14.90",
                    description: "ein luftig-lockeres omelette bestehend aus zwei eiern, präsentiert auf knusprigem sauerteigbrot vom öfferl.\n\n**your style:**\n• tomaten\n• speckwürfeln\n• käse\n• avocado",
                    nutrition: {
                        calories: "250",
                        protein: "22g",
                        carbs: "13g",
                        fat: "9g"
                    },
                    tags: ["vegetarisch", "anpassbar", "herzhaft"],
                    special: false
                },
                {
                    name: "beggs enedict",
                    price: "15.90",
                    description: "ein oder zwei pochierte eier auf knusprigem sauerteigbrot vom öfferl und einer samtigen avocadosauce.\n\n**your style:**\n• schinken\n• speck\n• lachs",
                    nutrition: {
                        calories: "245",
                        protein: "12g",
                        carbs: "54g",
                        fat: "34g"
                    },
                    tags: ["vegetarisch", "gourmet", "aromatisch"],
                    special: true
                }
            ]
        },
        {
            title: "avo-lution",
            order: 2,
            image: "/content/images/avocado.jpg",
            description: "Cremige Avocado-Kreationen für den perfekten Start",
            items: [
                {
                    name: "avocado bowl",
                    price: "8.90",
                    image: "/content/images/avo-bowl.jpg",
                    description: "eine samtige kreation aus frisch zerdrückter avocado, veredelt mit fein geriebenem apfel für eine süß-frische note",
                    nutrition: {
                        calories: "285",
                        protein: "6g",
                        carbs: "18g",
                        fat: "24g"
                    },
                    tags: ["vegetarisch", "leicht", "nahrhaft"],
                    special: false
                },
                {
                    name: "avocado bread",
                    price: "12.90",
                    description: "knuspriges sauerteigbrot vom öfferl, handwerklich gebacken, großzügig bestrichen mit cremiger, zerdrückter avocado.\n\n**your style:**\nei (nach wunsch zubereitet)/biospeck/biolachs/shiitake und champignons pilze",
                    nutrition: {
                        calories: "320",
                        protein: "8g",
                        carbs: "38g",
                        fat: "16g"
                    },
                    tags: ["vegetarisch", "herzhaft", "anpassbar"],
                    special: false
                }
            ]
        },
        {
            title: "hafer dich lieb",
            order: 3,
            image: "/content/images/porridge.jpg",
            description: "Glutenfreie, lactosefreie & besonders darmfreundliche Kreationen",
            items: [
                {
                    name: "premium-porridge",
                    price: "8.90",
                    image: "/content/images/premium-porridge.jpg",
                    description: "ein wärmender genuss aus zarten haferflocken, verfeinert mit hanf- und chiasamen, kokosflocken und geriebenem apfel",
                    nutrition: {
                        calories: "380",
                        protein: "12g",
                        carbs: "48g",
                        fat: "16g"
                    },
                    tags: ["glutenfrei", "lactosefrei", "darmfreundlich"],
                    special: false
                },
                {
                    name: "kokoscreme power-oats",
                    price: "8.50",
                    description: "kraftvolle haferflocken, umhüllt von cremiger kokoscreme, kombiniert mit hanf- und chiasamen",
                    nutrition: {
                        calories: "415",
                        protein: "10g",
                        carbs: "45g",
                        fat: "22g"
                    },
                    tags: ["glutenfrei", "lactosefrei", "darmfreundlich"],
                    special: false
                }
            ]
        },
        {
            title: "berry good choice",
            order: 4,
            image: "/content/images/sweet.jpg",
            items: [
                {
                    name: "vollkorn pfannkuchen mit topfenhimbeer-leinöl",
                    price: "10.50",
                    description: "fluffige vollkorn-pfannkuchen, serviert mit cremigem topfenhimbeer-leinöl, verfeinert durch saftige blaubeeren",
                    nutrition: {
                        calories: "340",
                        protein: "14g",
                        carbs: "42g",
                        fat: "12g"
                    },
                    tags: ["vegetarisch", "ballaststoffreich", "zuckerarm"],
                    special: false
                }
            ]
        },
        {
            title: "coffee, healthtea and me",
            order: 5,
            image: "/content/images/drinks.jpg",
            description: "Heiße und kalte Getränke mit besonderen Zutaten",
            items: [
                {
                    name: "ashwaganda latte",
                    price: "5.50",
                    description: "ein geschmeidiger latte, durchzogen von adaptogenem ashwaganda, der sanft beruhigt und stress schmelzen lässt",
                    nutrition: {
                        calories: "180",
                        protein: "6g",
                        carbs: "18g",
                        fat: "8g"
                    },
                    tags: ["adaptogen", "beruhigend", "stressabbauend"],
                    special: false
                },
                {
                    name: "reishi cappuccino",
                    price: "4.60",
                    description: "samtiger cappuccino mit adaptogenem reishi, der das immunsystem unterstützt",
                    nutrition: {
                        calories: "150",
                        protein: "5g",
                        carbs: "14g",
                        fat: "7g"
                    },
                    tags: ["adaptogen", "immunstärkend", "harmonisch"],
                    special: false
                },
                {
                    name: "chaga cold brew",
                    price: "4.90",
                    description: "kühler cold brew mit adaptogenem chaga, antioxidativ und reinigend",
                    nutrition: {
                        calories: "35",
                        protein: "0g",
                        carbs: "3g",
                        fat: "0g"
                    },
                    tags: ["adaptogen", "antioxidativ", "reinigend"],
                    special: false
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayCompactMenu(fallbackMenu, false);
    createFilterButtons(fallbackMenu);
    // Add PDF export button for fallback menu
    addPDFExportButton();
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
