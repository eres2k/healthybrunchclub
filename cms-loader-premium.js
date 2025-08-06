// CMS Loader Premium - Fixed Version with Category Image Overlays
// Upper-Class Restaurant Menu System with Advanced Filtering

let allMenuCategories = [];
let currentFilters = {
    category: 'all',
    tags: []
};

// Premium Allergen Mapping
const allergenMap = {
    'A': 'Glutenhaltiges Getreide',
    'B': 'Krebstiere',
    'C': 'Eier',
    'D': 'Fisch',
    'E': 'Erdnüsse',
    'F': 'Soja',
    'G': 'Milch/Laktose',
    'H': 'Schalenfrüchte',
    'L': 'Sellerie',
    'M': 'Senf',
    'N': 'Sesam',
    'O': 'Sulfite',
    'P': 'Lupinen',
    'R': 'Weichtiere'
};

// Category Icons
const categoryIcons = {
    'sets': '🍽️',
    'eggcitements': '🥚',
    'avo-lution': '🥑',
    'hafer dich lieb': '🌾',
    'berry good choice': '🫐',
    'coffee, healthtea and me': '☕',
    'sip happens - make it healthy': '🥤'
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader: Initializing...');
    loadMenuFromCMS();
    loadEventsFromCMS();
    initializeFilters();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        console.log('CMS Loader: Loading menu from Netlify function...');
        showLoadingState();
        
        const response = await fetch('/.netlify/functions/get-menu');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const menuData = await response.json();
        console.log('CMS Loader: Menu data loaded successfully:', menuData);
        
        allMenuCategories = menuData;
        createCategoryFilters(menuData);
        displayPremiumMenu(menuData);
        hideLoadingState();
        
    } catch (error) {
        console.error('CMS Loader: Error loading menu:', error);
        displayFallbackMenu();
        hideLoadingState();
    }
}

// Show/Hide Loading State
function showLoadingState() {
    const container = document.getElementById('menuContainer');
    if (container) {
        container.innerHTML = `
            <div class="menu-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Speisekarte wird geladen...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Loading will be replaced by content
    console.log('CMS Loader: Loading state hidden');
}

// Create Category Filter Buttons
function createCategoryFilters(menuData) {
    const container = document.getElementById('categoryFilters');
    if (!container) {
        console.warn('CMS Loader: Category filters container not found');
        return;
    }
    
    // Clear existing
    container.innerHTML = '';
    
    // All categories button
    const allBtn = createFilterButton('all', 'Alle Gerichte', true);
    container.appendChild(allBtn);
    
    // Individual category buttons
    menuData.forEach(category => {
        const btn = createFilterButton(
            category.title.toLowerCase().replace(/\s+/g, '-'),
            category.title,
            false
        );
        container.appendChild(btn);
    });
    
    console.log('CMS Loader: Category filters created');
}

// Create Filter Button
function createFilterButton(value, text, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.setAttribute('data-filter', value);
    btn.innerHTML = `<span class="btn-text">${text}</span>`;
    btn.addEventListener('click', handleCategoryFilter);
    return btn;
}

// Initialize Tag Filters
function initializeFilters() {
    // Initialize tag filters
    const tagCheckboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]');
    tagCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleTagFilter);
    });
    
    console.log('CMS Loader: Filters initialized');
}

// Handle Category Filter
function handleCategoryFilter(e) {
    const filterValue = e.currentTarget.getAttribute('data-filter');
    currentFilters.category = filterValue;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    applyFilters();
    updateFilterVisualFeedback();
}

// Handle Tag Filter
function handleTagFilter(e) {
    const tag = e.target.value;
    
    if (e.target.checked) {
        if (!currentFilters.tags.includes(tag)) {
            currentFilters.tags.push(tag);
        }
    } else {
        currentFilters.tags = currentFilters.tags.filter(t => t !== tag);
    }
    
    applyFilters();
    updateFilterVisualFeedback();
}

// Update visual feedback for active filters
function updateFilterVisualFeedback() {
    const hasActiveFilters = currentFilters.category !== 'all' || currentFilters.tags.length > 0;
    const filterContainer = document.querySelector('.menu-filter-container');
    
    if (filterContainer) {
        if (hasActiveFilters) {
            filterContainer.classList.add('has-active-filters');
        } else {
            filterContainer.classList.remove('has-active-filters');
        }
    }
    
    // Show filter count badge
    const activeFilterCount = (currentFilters.category !== 'all' ? 1 : 0) + currentFilters.tags.length;
    const resetButton = document.querySelector('.btn-icon[onclick="resetFilters()"]');
    
    if (resetButton && activeFilterCount > 0) {
        let badge = resetButton.querySelector('.filter-count');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'filter-count';
            resetButton.appendChild(badge);
        }
        badge.textContent = activeFilterCount;
    } else if (resetButton) {
        const badge = resetButton.querySelector('.filter-count');
        if (badge) badge.remove();
    }
}

// Apply All Filters
function applyFilters() {
    let filteredCategories = [...allMenuCategories];
    
    // Apply category filter
    if (currentFilters.category !== 'all') {
        filteredCategories = filteredCategories.filter(category =>
            category.title.toLowerCase().replace(/\s+/g, '-') === currentFilters.category
        );
    }
    
    // Apply tag filters
    if (currentFilters.tags.length > 0) {
        filteredCategories = filteredCategories.map(category => ({
            ...category,
            items: category.items.filter(item =>
                item.tags && currentFilters.tags.some(tag =>
                    item.tags.some(itemTag => itemTag.toLowerCase() === tag.toLowerCase())
                )
            )
        })).filter(category => category.items.length > 0);
    }
    
    displayPremiumMenu(filteredCategories);
}

// Reset Filters
window.resetFilters = function() {
    currentFilters = {
        category: 'all',
        tags: []
    };
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
    
    document.querySelectorAll('.tag-filter input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    displayPremiumMenu(allMenuCategories);
    updateFilterVisualFeedback();
};

// Create Category HTML with Overlay - FIXED VERSION
function createCategoryHTML(category, catIndex) {
    const hasImage = category.image ? true : false;
    const categorySlug = category.title.toLowerCase().replace(/\s+/g, '-');
    
    let html = `<div class="menu-category" data-category="${categorySlug}">`;
    
    if (hasImage) {
        // Category with hero image and overlay - Using CSS classes instead of inline styles
        html += `
            <div class="category-hero">
                <img src="${formatImageUrl(category.image)}" alt="${category.title}">
                <div class="category-hero-gradient"></div>
                <div class="category-hero-overlay">
                    <h3 class="category-title-overlay">${category.title}</h3>
                </div>
            </div>
        `;
        
        // Trigger image loaded event for animations
        setTimeout(() => {
            const categoryHero = document.querySelector(`.menu-category[data-category="${categorySlug}"] .category-hero`);
            if (categoryHero) {
                const img = categoryHero.querySelector('img');
                if (img.complete) {
                    categoryHero.classList.add('loaded');
                } else {
                    img.addEventListener('load', () => {
                        categoryHero.classList.add('loaded');
                    });
                }
            }
        }, 100);
    }
    
    // Category header (with or without description)
    html += `<div class="category-header">`;
    
    // Only show category name here if there's no hero image
    if (!hasImage) {
        html += `<h3 class="category-name">${category.title}</h3>`;
    }
    
    if (category.description) {
        html += `<p class="category-description">${category.description}</p>`;
    }
    
    html += `</div>`;
    
    // Menu items grid
    html += `
        <div class="menu-grid">
            ${category.items ? category.items.map(item => createMenuItemCard(item)).join('') : ''}
        </div>
    </div>`;
    
    return html;
}

// Display Premium Menu
function displayPremiumMenu(menuData) {
    const container = document.getElementById('menuContainer');
    if (!container) {
        console.error('CMS Loader: Menu container not found!');
        return;
    }
    
    if (!menuData || menuData.length === 0) {
        container.innerHTML = `
            <div class="no-results-message">
                <i class="fas fa-search"></i>
                <p>Keine Gerichte gefunden. Bitte passen Sie Ihre Filter an.</p>
            </div>
        `;
        document.getElementById('allergenLegend').style.display = 'none';
        return;
    }
    
    let hasAllergens = false;
    let menuHTML = '';
    
    menuData.forEach((category, catIndex) => {
        // Check for allergens
        if (category.items && category.items.some(item => item.allergens && item.allergens.length > 0)) {
            hasAllergens = true;
        }
        
        // Use the new function to create category HTML
        menuHTML += createCategoryHTML(category, catIndex);
    });
    
    container.innerHTML = menuHTML;
    
    // Show/hide allergen legend
    const allergenLegend = document.getElementById('allergenLegend');
    if (allergenLegend) {
        if (hasAllergens) {
            displayAllergenLegend();
        } else {
            allergenLegend.style.display = 'none';
        }
    }
    
    console.log('CMS Loader: Menu displayed successfully');
}

// Create Menu Item Card
function createMenuItemCard(item) {
    const hasImage = item.image ? true : false;
    const isSpecial = item.special || false;
    
    return `
        <div class="menu-item-card ${isSpecial ? 'special' : ''} ${!hasImage ? 'no-image' : ''}">
            ${hasImage ? `
                <div class="menu-item-image">
                    <img src="${formatImageUrl(item.image)}" alt="${item.name}" loading="lazy">
                </div>
            ` : `
                <div class="menu-item-icon">${getItemIcon(item)}</div>
            `}
            
            <div class="menu-item-header">
                <h4 class="menu-item-name">${item.name}</h4>
                ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
            </div>
            
            <div class="menu-item-description">
                ${processDescription(item.description)}
            </div>
            
            ${item.nutrition ? createNutritionInfo(item.nutrition) : ''}
            
            ${item.tags && item.tags.length > 0 ? `
                <div class="menu-item-tags">
                    ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            ${item.allergens && item.allergens.length > 0 ? `
                <div class="menu-item-allergens">
                    <span>Allergene:</span>
                    <span class="allergen-codes">
                        ${item.allergens.map(code => `<span class="allergen-code">${code}</span>`).join('')}
                    </span>
                </div>
            ` : ''}
        </div>
    `;
}

// Format Price
function formatPrice(price) {
    if (!price && price !== 0) return '';
    
    let cleanPrice = String(price).trim();
    cleanPrice = cleanPrice.replace(/[€$£¥\s]/g, '');
    cleanPrice = cleanPrice.replace(/,/g, '.');
    
    const numPrice = parseFloat(cleanPrice);
    if (isNaN(numPrice)) {
        return `€\u00A0${price}`;
    }
    
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    
    return `€\u00A0${formatted}`;
}

// Get Item Icon
function getItemIcon(item) {
    const name = item.name.toLowerCase();
    if (name.includes('kaffee') || name.includes('coffee')) return '☕';
    if (name.includes('ei') || name.includes('egg')) return '🥚';
    if (name.includes('bowl')) return '🥣';
    if (name.includes('avocado')) return '🥑';
    if (name.includes('saft') || name.includes('juice')) return '🥤';
    if (name.includes('pancake') || name.includes('pfannkuchen')) return '🥞';
    if (name.includes('toast')) return '🍞';
    return '🌿';
}

// Create Nutrition Info
function createNutritionInfo(nutrition) {
    if (!nutrition || !nutrition.calories) return '';
    
    const items = [];
    if (nutrition.calories) items.push(`<span class="nutrition-item"><span class="nutrition-value">${nutrition.calories}</span> kcal</span>`);
    if (nutrition.protein) items.push(`<span class="nutrition-item"><span class="nutrition-value">${nutrition.protein}</span> Protein</span>`);
    if (nutrition.carbs) items.push(`<span class="nutrition-item"><span class="nutrition-value">${nutrition.carbs}</span> Kohlenhydrate</span>`);
    if (nutrition.fat) items.push(`<span class="nutrition-item"><span class="nutrition-value">${nutrition.fat}</span> Fett</span>`);
    
    return `<div class="menu-item-nutrition">${items.join('')}</div>`;
}

// Process Description
function processDescription(text) {
    if (!text) return '';
    
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
}

// Format Image URL
function formatImageUrl(url) {
    if (!url) return '';
    // If it already starts with http, return as is
    if (url.startsWith('http')) return url;
    // Otherwise ensure it starts with /
    return url.startsWith('/') ? url : `/${url}`;
}

// Display Allergen Legend
function displayAllergenLegend() {
    const container = document.getElementById('allergenLegend');
    if (!container) return;
    
    const grid = container.querySelector('.allergen-grid');
    if (!grid) return;
    
    grid.innerHTML = Object.entries(allergenMap).map(([code, name]) => `
        <div class="allergen-item">
            <span class="allergen-letter">${code}</span>
            <span class="allergen-name">${name}</span>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Load Events
async function loadEventsFromCMS() {
    try {
        console.log('CMS Loader: Loading events...');
        const response = await fetch('/.netlify/functions/get-events');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const eventsData = await response.json();
        console.log('CMS Loader: Events loaded:', eventsData);
        displayEvents(eventsData);
        
    } catch (error) {
        console.error('CMS Loader: Error loading events:', error);
        displayFallbackEvent();
    }
}

// Display Events
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventWindow || !eventContent) {
        console.warn('CMS Loader: Event window elements not found');
        return;
    }
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        ${nextEvent.featuredImage ? `
            <div class="event-image" style="margin-bottom: 1rem;">
                <img src="${formatImageUrl(nextEvent.featuredImage)}" alt="${nextEvent.title}"
                     style="width: 100%; height: auto; border-radius: 8px;">
            </div>
        ` : ''}
        
        <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 0.5rem;">
            ${nextEvent.title}
        </h3>
        
        <p style="color: var(--warm-gray); font-size: 0.875rem; margin-bottom: 1rem;">
            ${formattedDate}
        </p>
        
        <p style="font-size: 0.875rem; line-height: 1.6;">
            ${nextEvent.body || nextEvent.description || ''}
        </p>
        
        ${nextEvent.audioAnnouncement ? `
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--light-gray);">
                <h4 style="font-size: 0.875rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    🎧 Sound Preview
                </h4>
                <audio controls style="width: 100%;">
                    <source src="${formatImageUrl(nextEvent.audioAnnouncement)}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.classList.add('collapsed');
    eventWindow.style.display = 'block';
}

// Toggle Event Window
window.toggleEventWindow = function() {
    const eventWindow = document.getElementById('eventWindow');
    if (eventWindow) {
        eventWindow.classList.toggle('collapsed');
    }
};

// Fallback Menu
function displayFallbackMenu() {
    console.log('CMS Loader: Displaying fallback menu');
    const fallbackMenu = [
        {
            title: "Morning Essentials",
            order: 1,
            description: "Der perfekte Start in Ihren Tag",
            items: [
                {
                    name: "Bio-Zitronenwasser",
                    price: "4.90",
                    description: "Warmes Wasser mit frisch gepresster Bio-Zitrone für einen sanften Start",
                    nutrition: { calories: "25", carbs: "6g" },
                    tags: ["detox", "vegan", "glutenfrei"],
                    allergens: []
                },
                {
                    name: "Golden Turmeric Latte",
                    price: "6.90",
                    description: "Kurkuma, Ingwer, schwarzer Pfeffer in cremiger Hafermilch",
                    nutrition: { calories: "180", protein: "5g", carbs: "18g", fat: "8g" },
                    tags: ["anti-inflammatory", "lactosefrei"],
                    allergens: ["A"],
                    special: true
                }
            ]
        },
        {
            title: "Power Bowls",
            order: 2,
            description: "Energie für den ganzen Tag",
            items: [
                {
                    name: "Açaí Energy Bowl",
                    price: "12.90",
                    description: "Açaí, Banane, Beeren, Granola, Kokosflocken",
                    nutrition: { calories: "320", protein: "8g", carbs: "45g", fat: "12g" },
                    tags: ["superfood", "vegan"],
                    allergens: ["A", "H"]
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    createCategoryFilters(fallbackMenu);
    displayPremiumMenu(fallbackMenu);
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "Live Music Monday",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Genießen Sie sanfte Jazz-Klänge zu Ihrem Brunch. Jeden Montag live!"
    }];
    
    displayEvents(fallbackEvent);
}

// Initialize Admin Features
if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
        if (user) {
            const adminBtn = document.getElementById('adminBtn');
            if (adminBtn) adminBtn.classList.add('show');
        }
    });
    
    window.netlifyIdentity.on("login", () => {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.classList.add('show');
    });
    
    window.netlifyIdentity.on("logout", () => {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.classList.remove('show');
    });
}

// Export for global access
window.cmsLoader = {
    refresh: function() {
        console.log('CMS Loader: Refreshing content...');
        loadMenuFromCMS();
        loadEventsFromCMS();
    }
};

console.log('CMS Loader Premium: Initialized with category overlays');
