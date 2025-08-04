// CMS Loader with Refined Classical Menu Design
// Enhanced typography, spacing, and elegant price display

let allMenuCategories = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadMenuFromCMS();
    loadEventsFromCMS();
    initializeModalHandlers();
});

// Initialize Modal Handlers
function initializeModalHandlers() {
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDishModal();
        }
    });
}

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
        displayClassicalMenu(menuData);
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
    
    // Clear existing filters
    filtersContainer.innerHTML = '';
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.textContent = 'Alle Gerichte';
    allBtn.addEventListener('click', handleFilterClick);
    filtersContainer.appendChild(allBtn);
    
    // Add category filters
    menuData.forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.setAttribute('data-filter', category.title.toLowerCase().replace(/\s+/g, '-'));
        filterBtn.textContent = category.title;
        filterBtn.addEventListener('click', handleFilterClick);
        filtersContainer.appendChild(filterBtn);
    });
}

// Handle Filter Click
function handleFilterClick(e) {
    const filterValue = e.target.getAttribute('data-filter');
    currentFilter = filterValue;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter menu display
    if (filterValue === 'all') {
        displayClassicalMenu(allMenuCategories);
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayClassicalMenu(filtered);
    }
}

// Enhanced Price Display Function
function formatPrice(price) {
    if (!price) return '';
    // Remove any existing currency symbols and format elegantly
    const cleanPrice = price.toString().replace(/[€$£¥]/g, '').trim();
    return cleanPrice; // Return price without currency symbol
}

// Enhanced Description Processing
function enhanceDescription(text) {
    if (!text) return '';
    
    // Replace common ingredients with more evocative descriptions
    const enhancements = {
        'bio': 'biologisch angebaut',
        'frisch': 'täglich frisch',
        'hausgemacht': 'nach hausrezept zubereitet',
        'regional': 'von regionalen partnern',
        'saisonal': 'der saison entsprechend'
    };
    
    let enhanced = text;
    Object.entries(enhancements).forEach(([key, value]) => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        enhanced = enhanced.replace(regex, value);
    });
    
    return enhanced;
}

// Display Classical 2-Column Menu
function displayClassicalMenu(menuData) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Gerichte in dieser Kategorie gefunden.</div>';
        return;
    }
    
    menuContainer.innerHTML = menuData.map((category, catIndex) => {
        return `
            <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}" style="animation-delay: ${catIndex * 0.15}s">
                <div class="category-header">
                    <h3 class="category-title">${category.title}</h3>
                    ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                </div>
                
                <div class="menu-items-grid">
                    ${category.items.map((item, index) => {
                        // Store the full data for modal access
                        const itemData = encodeURIComponent(JSON.stringify({
                            ...item,
                            categoryTitle: category.title
                        }));
                        
                        // Enhanced description with sensory language
                        const enhancedDesc = enhanceDescription(processRichText(item.description));
                        
                        return `
                        <div class="menu-item-card ${item.image ? 'has-image' : ''}" 
                            onclick="openDishModalFromData(this)"
                            data-item="${itemData}"
                            style="animation-delay: ${(catIndex * 0.15) + (index * 0.05)}s">
                            ${item.special ? '<div class="menu-item-badge">Empfehlung</div>' : ''}
                            
                            ${item.image ? `
                                <div class="menu-item-image">
                                    <img src="${formatImageUrl(item.image)}" alt="${item.name}" loading="lazy">
                                </div>
                            ` : ''}
                            
                            <div class="menu-item-header">
                                <h4 class="menu-item-name">${item.name}</h4>
                                ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
                            </div>
                            
                            <div class="menu-item-description">
                                ${truncateDescription(enhancedDesc, 140)}
                            </div>
                            
                            ${item.nutrition && hasNutritionData(item.nutrition) ? `
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
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Format Image URL
function formatImageUrl(url) {
    if (!url) return '';
    return url.startsWith('/') ? url : `/${url}`;
}

// Check if nutrition data exists
function hasNutritionData(nutrition) {
    return nutrition && (nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat);
}

// Truncate Description with Ellipsis
function truncateDescription(html, maxLength) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    if (text.length <= maxLength) return html;
    
    // Find natural break point (end of word)
    let truncateAt = text.lastIndexOf(' ', maxLength);
    if (truncateAt === -1) truncateAt = maxLength;
    
    return text.substring(0, truncateAt) + '…';
}

// Process Rich Text with Enhanced Formatting
function processRichText(text) {
    if (!text) return '';
    
    let html = text;
    
    // Convert markdown to HTML
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if needed
    if (!html.startsWith('<p>')) {
        html = `<p>${html}</p>`;
    }
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
}

// Open Dish Modal from Data Attribute
function openDishModalFromData(element) {
    try {
        const itemData = JSON.parse(decodeURIComponent(element.getAttribute('data-item')));
        openDishModal(itemData);
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

// Open Dish Modal with Refined Display
function openDishModal(item) {
    // Prevent body scroll
    document.body.classList.add('modal-open');
    
    // Create or get modal
    let modal = document.getElementById('dishModal');
    if (!modal) {
        modal = createDishModal();
    }
    
    // Populate modal with enhanced content
    populateDishModal(item);
    
    // Show modal with fade-in effect
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Focus on close button for accessibility
    setTimeout(() => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.focus();
    }, 100);
}

// Create Dish Modal with Refined Structure
function createDishModal() {
    const modal = document.createElement('div');
    modal.id = 'dishModal';
    modal.className = 'dish-modal';
    modal.innerHTML = `
        <div class="dish-modal-content">
            <button class="modal-close" onclick="closeDishModal()" aria-label="Schließen">&times;</button>
            <div class="modal-body">
                <div class="modal-left-column">
                    <div class="modal-image-container" id="modalImageContainer"></div>
                    <div class="modal-header">
                        <h3 class="modal-dish-name" id="modalDishName"></h3>
                        <div class="modal-dish-price" id="modalDishPrice"></div>
                    </div>
                    <div class="modal-description" id="modalDescription"></div>
                    <div class="modal-tags" id="modalTags"></div>
                </div>
                <div class="modal-right-column">
                    <div class="nutrition-container" id="nutritionContainer"></div>
                    <div class="modal-cta">
                        <a href="#contact" class="modal-reserve-btn" onclick="closeDishModal()">Tisch reservieren</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeDishModal();
        }
    });
    
    document.body.appendChild(modal);
    return modal;
}

// Populate Dish Modal with Enhanced Content
function populateDishModal(item) {
    // Handle image
    const imageContainer = document.getElementById('modalImageContainer');
    if (item.image) {
        const imageUrl = formatImageUrl(item.image);
        imageContainer.innerHTML = `<img src="${imageUrl}" alt="${item.name}">`;
        imageContainer.classList.remove('no-image');
    } else {
        // Use category icon or default
        const icon = getCategoryIcon(item.categoryTitle);
        imageContainer.innerHTML = icon;
        imageContainer.classList.add('no-image');
    }
    
    // Set name and price (without currency symbol)
    document.getElementById('modalDishName').textContent = item.name;
    document.getElementById('modalDishPrice').textContent = item.price ? formatPrice(item.price) : '';
    
    // Set enhanced description
    const descriptionEl = document.getElementById('modalDescription');
    const fullDescription = enhanceDescription(processRichText(item.description));
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullDescription;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    const truncatedText = plainText.length > 180 ? plainText.substring(0, 180) + '…' : plainText;
    descriptionEl.innerHTML = `<p>${truncatedText}</p>`;
    
    // Set tags with refined display
    const tagsContainer = document.getElementById('modalTags');
    if (item.tags && item.tags.length > 0) {
        tagsContainer.innerHTML = item.tags.map(tag => 
            `<span class="modal-tag">${tag}</span>`
        ).join('');
        tagsContainer.style.display = 'flex';
    } else {
        tagsContainer.style.display = 'none';
    }
    
    // Set nutrition in elegant grid format
    const nutritionContainer = document.getElementById('nutritionContainer');
    if (item.nutrition && hasNutritionData(item.nutrition)) {
        let nutritionHTML = '<div class="nutrition-grid">';
        
        if (item.nutrition.calories) {
            nutritionHTML += `
                <div class="nutrition-grid-item">
                    <span class="nutrition-grid-value">${item.nutrition.calories}</span>
                    <span class="nutrition-grid-label">Kalorien</span>
                </div>
            `;
        }
        if (item.nutrition.protein) {
            nutritionHTML += `
                <div class="nutrition-grid-item">
                    <span class="nutrition-grid-value">${item.nutrition.protein}</span>
                    <span class="nutrition-grid-label">Eiweiß</span>
                </div>
            `;
        }
        if (item.nutrition.carbs) {
            nutritionHTML += `
                <div class="nutrition-grid-item">
                    <span class="nutrition-grid-value">${item.nutrition.carbs}</span>
                    <span class="nutrition-grid-label">Kohlenhydrate</span>
                </div>
            `;
        }
        if (item.nutrition.fat) {
            nutritionHTML += `
                <div class="nutrition-grid-item">
                    <span class="nutrition-grid-value">${item.nutrition.fat}</span>
                    <span class="nutrition-grid-label">Fett</span>
                </div>
            `;
        }
        
        nutritionHTML += '</div>';
        nutritionContainer.innerHTML = nutritionHTML;
        nutritionContainer.style.display = 'block';
    } else {
        nutritionContainer.style.display = 'none';
    }
}

// Get Category Icon with Refined Icons
function getCategoryIcon(categoryTitle) {
    const icons = {
        'eggcitements': '🍳',
        'hafer dich lieb': '🌾',
        'avo-lution': '🥑',
        'berry good choice': '🫐',
        'coffee, healthtea and me': '☕',
        'sip happens - make it healthy': '🥤',
        'sets': '🍽️'
    };
    
    if (!categoryTitle) return '🌿';
    
    const lowerTitle = categoryTitle.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowerTitle.includes(key) || key.includes(lowerTitle)) {
            return icon;
        }
    }
    return '🌿';
}

// Close Dish Modal with Fade Out
function closeDishModal() {
    const modal = document.getElementById('dishModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            document.body.classList.remove('modal-open');
        }, 300);
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

// Display Events with Refined Styling
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    const imageUrl = nextEvent.featuredImage ? formatImageUrl(nextEvent.featuredImage) : '';
    const audioUrl = nextEvent.audioAnnouncement ? formatImageUrl(nextEvent.audioAnnouncement) : '';
    
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        ${imageUrl ? `
            <div class="event-image" style="margin-bottom: 20px; border-radius: 0;">
                <img src="${imageUrl}" alt="${nextEvent.title}" style="width: 100%; height: auto;">
            </div>
        ` : ''}
        <div class="event-header" style="margin-bottom: 15px;">
            <h3 style="font-family: var(--font-menu-header); font-size: 22px; margin-bottom: 5px; font-weight: 300;">${nextEvent.title}</h3>
            <p style="color: var(--text-secondary); font-size: 14px;">${formattedDate}</p>
        </div>
        <div class="event-details" style="font-size: 14px; line-height: 1.6;">
            <p style="margin-bottom: 10px;">${nextEvent.body || nextEvent.description || ''}</p>
            
            ${nextEvent.location ? `
                <p style="margin-bottom: 8px;"><strong style="font-weight: 400;">📍 Location:</strong> ${nextEvent.location}</p>
            ` : ''}
            
            ${nextEvent.price ? `
                <p style="margin-bottom: 8px;"><strong style="font-weight: 400;">💶 Eintritt:</strong> ${nextEvent.price}</p>
            ` : ''}
        </div>
        
        ${audioUrl ? `
            <div class="audio-player" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-subtle);">
                <h4 style="font-size: 13px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">🎧 Preview</h4>
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

// Fallback Menu with Enhanced Descriptions
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "eggcitements",
            order: 1,
            items: [
                {
                    name: "eggs any style",
                    price: "12.90",
                    description: "Meisterhaft zubereitete Bio-Eier nach Ihrer Wahl – ob als goldenes Spiegelei, sanft pochiert oder cremig gerührt. Serviert auf einem Bett aus karamellisierten Süßkartoffelscheiben und samtigem Avocadopüree, begleitet von aromatisch sautierten Waldchampignons und Shiitake-Pilzen. Gekrönt mit pfeffrigem Rucola, knackigen Sprossen und frischer Gartenkresse.",
                    nutrition: {
                        calories: "320",
                        protein: "18g",
                        carbs: "22g",
                        fat: "16g"
                    },
                    tags: ["vegetarisch", "proteinreich", "glutenfrei"],
                    special: false
                },
                {
                    name: "omelette creation",
                    price: "13.90",
                    description: "Ein luftig-lockeres Kunstwerk aus zwei Bio-Eiern, golden gebraten und gefüllt mit karamellisierten Zwiebeln, erdigen Shiitake-Pilzen und frischem Babyspinat. Präsentiert auf handwerklich gebackenem Sauerteigbrot vom Öfferl.\n\n**Ihre Wahl an Extras:** Sonnengereiften Tomaten, knusprige Speckwürfel, cremiger Bergkäse oder butterweiche Avocado",
                    nutrition: {
                        calories: "380",
                        protein: "20g",
                        carbs: "26g",
                        fat: "22g"
                    },
                    tags: ["vegetarisch", "anpassbar"],
                    special: false
                }
            ]
        },
        {
            title: "hafer dich lieb",
            order: 2,
            items: [
                {
                    name: "premium-porridge",
                    price: "9.90",
                    description: "Ein wärmender Seelentröster aus biologischen Haferflocken, langsam gekocht zu cremiger Perfektion. Verfeinert mit nährstoffreichen Hanf- und Chiasamen, exotischen Kokosflocken und frisch geriebenem Apfel der Sorte Elstar. Ein Hauch von Ceylon-Zimt und eine Prise Kardamom verleihen orientalische Noten, während geröstete Mandelblättchen für den perfekten Crunch sorgen.",
                    nutrition: {
                        calories: "380",
                        protein: "12g",
                        carbs: "45g",
                        fat: "18g"
                    },
                    tags: ["glutenfrei", "lactosefrei", "darmfreundlich"],
                    special: true
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayClassicalMenu(fallbackMenu);
    createFilterButtons(fallbackMenu);
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "next monday special",
        artist: "dj cosmic kitchen",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Erlebe entspannte Lounge-Klänge während deines Brunches! Sanfte Beats treffen auf kulinarische Genüsse."
    }];
    
    displayEvents(fallbackEvent);
}

// Export functions for global access
window.openDishModalFromData = openDishModalFromData;
window.closeDishModal = closeDishModal;
window.toggleEventWindow = toggleEventWindow;

// Refresh content function
window.cmsLoader = {
    refresh: function() {
        loadMenuFromCMS();
        loadEventsFromCMS();
    }
};

console.log('Refined CMS Loader initialized. Enhanced typography, elegant price display, and sophisticated descriptions.');
