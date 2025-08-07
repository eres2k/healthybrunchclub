// CMS Loader Premium - Fixed Version with Category Image Overlays
// Upper-Class Restaurant Menu System with Advanced Filtering

let allMenuCategories = [];
let currentFilters = {
    category: 'all',
    tags: []
};

// Define the 6 allowed tags globally
const ALLOWED_TAGS = ['vegetarisch', 'glutenfrei', 'proteinreich', 'sättigend', 'belebend', 'immunstärkend'];

// Tag display names mapping - only for the 6 allowed tags
const TAG_DISPLAY_NAMES = {
    'vegetarisch': 'Vegetarisch',
    'glutenfrei': 'Glutenfrei',
    'proteinreich': 'Proteinreich',
    'sättigend': 'Sättigend',
    'belebend': 'Belebend',
    'immunstärkend': 'Immunstärkend'
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
    loadMenuFromCMS().then(() => {
        // Initialize mobile filters after menu data is available
        if (window.innerWidth <= 768 && window.mobileFilters) {
            window.mobileFilters.init();
        }
    });
    loadEventsFromCMS();
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
        createTagFilters(menuData); // Create tag filters dynamically
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

// Create Tag Filters - Always show the 6 allowed tags
function createTagFilters(menuData) {
    const container = document.getElementById('tagFilters');
    if (!container) {
        console.warn('CMS Loader: Tag filters container not found');
        return;
    }
    
    // Clear existing
    container.innerHTML = '';
    
    // Count occurrences of each allowed tag
    const tagCounts = new Map();
    
    // Initialize all allowed tags with 0 count
    ALLOWED_TAGS.forEach(tag => {
        tagCounts.set(tag, 0);
    });
    
    // Count actual occurrences in menu data
    menuData.forEach(category => {
        if (category.items) {
            category.items.forEach(item => {
                if (item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => {
                        const lowerTag = tag.toLowerCase().trim();
                        // Only count if it's an allowed tag
                        if (ALLOWED_TAGS.includes(lowerTag)) {
                            tagCounts.set(lowerTag, tagCounts.get(lowerTag) + 1);
                        }
                    });
                }
            });
        }
    });
    
    console.log('CMS Loader: Tag counts for allowed tags:', 
        Array.from(tagCounts.entries()).map(([tag, count]) => `${tag}: ${count}`).join(', '));
    
    // Always show all 6 allowed tags in the defined order
    ALLOWED_TAGS.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'tag-filter';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = tag;
        
        const span = document.createElement('span');
        span.className = 'tag-label';
        const count = tagCounts.get(tag);
        span.textContent = TAG_DISPLAY_NAMES[tag];
        
        // Add count to title if there are items with this tag
        if (count > 0) {
            span.title = `${count} ${count === 1 ? 'Gericht' : 'Gerichte'}`;
        } else {
            span.title = 'Keine Gerichte mit diesem Tag';
            // Optionally add a class to style tags with no items differently
            label.classList.add('tag-no-items');
        }
        
        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
        
        // Add event listener
        input.addEventListener('change', handleTagFilter);
    });
    
    console.log('CMS Loader: Created filters for all 6 allowed tags');
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
            items: category.items.filter(item => {
                if (!item.tags || !Array.isArray(item.tags)) return false;
                
                // Normalize item tags to lowercase
                const itemTags = item.tags.map(tag => tag.toLowerCase().trim());
                
                // Check if item has at least one of the selected tags
                return currentFilters.tags.some(filterTag => 
                    itemTags.includes(filterTag.toLowerCase())
                );
            })
        })).filter(category => category.items.length > 0);
    }
    
    displayPremiumMenu(filteredCategories);
    
    // Update mobile filter badge if it exists
    if (window.mobileFilters && window.mobileFilters.updateBadge) {
        window.mobileFilters.updateBadge();
    }
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
    
    // Update mobile filter badge if it exists
    if (window.mobileFilters && window.mobileFilters.updateBadge) {
        window.mobileFilters.updateBadge();
    }
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
                    ${item.tags
                        .filter(tag => ALLOWED_TAGS.includes(tag.toLowerCase().trim()))
                        .map(tag => `<span class="menu-tag">${TAG_DISPLAY_NAMES[tag.toLowerCase().trim()] || tag}</span>`)
                        .join('')}
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
                    tags: ["vegetarisch", "glutenfrei"],
                    allergens: []
                },
                {
                    name: "Golden Turmeric Latte",
                    price: "6.90",
                    description: "Kurkuma, Ingwer, schwarzer Pfeffer in cremiger Hafermilch",
                    nutrition: { calories: "180", protein: "5g", carbs: "18g", fat: "8g" },
                    tags: ["vegetarisch", "belebend"],
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
                    tags: ["vegetarisch", "immunstärkend"],
                    allergens: ["A", "H"]
                },
                {
                    name: "Protein Power Bowl",
                    price: "14.90",
                    description: "Quinoa, Edamame, Avocado, Tempeh, Tahini-Dressing",
                    nutrition: { calories: "380", protein: "22g", carbs: "35g", fat: "18g" },
                    tags: ["proteinreich", "glutenfrei", "sättigend"],
                    allergens: ["F", "N"]
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    createCategoryFilters(fallbackMenu);
    createTagFilters(fallbackMenu); // Create tag filters for fallback data
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

// Mobile Filter Modal JavaScript - Wrapped to prevent conflicts
(function() {
    'use strict';
    
    // Mobile filter state
    let mobileFilterState = {
        category: 'all',
        tags: []
    };
    
    // Initialize mobile filters
    function initializeMobileFilters() {
        if (window.innerWidth > 768) return;
        
        // Create mobile filter UI
        createMobileFilterUI();
        
        // Copy current filter state
        mobileFilterState.category = currentFilters.category;
        mobileFilterState.tags = [...currentFilters.tags];
        
        // Update UI to reflect current filters
        updateMobileFilterUI();
        
        // Add event listeners
        attachMobileFilterListeners();
    }
    
    // Create mobile filter UI elements
    function createMobileFilterUI() {
        // Check if already created
        if (document.querySelector('.mobile-filter-toggle')) return;
        
        // Create filter toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-filter-toggle';
        toggleBtn.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>Filter</span>
            <span class="filter-badge" style="display: none;">0</span>
        `;
        
        // Insert after menu intro
        const menuIntro = document.querySelector('.menu-intro');
        if (menuIntro) {
            menuIntro.parentNode.insertBefore(toggleBtn, menuIntro.nextSibling);
        }
        
        // Create modal structure
        const modal = document.createElement('div');
        modal.className = 'mobile-filter-modal';
        modal.innerHTML = `
            <div class="mobile-filter-content">
                <div class="mobile-filter-header">
                    <h3>Filter</h3>
                    <button class="mobile-filter-close" aria-label="Schließen">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="mobile-filter-body">
                    <!-- Categories -->
                    <div class="mobile-filter-section">
                        <h4>Kategorien</h4>
                        <div class="mobile-category-filters" id="mobileCategoryFilters">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>
                    
                    <!-- Tags -->
                    <div class="mobile-filter-section">
                        <h4>Eigenschaften</h4>
                        <div class="mobile-tag-filters" id="mobileTagFilters">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>
                </div>
                
                <div class="mobile-filter-footer">
                    <button class="mobile-filter-reset">Zurücksetzen</button>
                    <button class="mobile-filter-apply">Anwenden</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate categories and tags
        populateMobileCategories();
        populateMobileTags();
    }
    
    // Populate mobile category filters
    function populateMobileCategories() {
        const container = document.getElementById('mobileCategoryFilters');
        if (!container) return;
        
        // Clear existing
        container.innerHTML = '';
        
        // Add "All" option
        const allBtn = createMobileCategoryButton('all', 'Alle Gerichte');
        container.appendChild(allBtn);
        
        // Add categories from loaded data
        if (allMenuCategories && allMenuCategories.length > 0) {
            allMenuCategories.forEach(category => {
                const btn = createMobileCategoryButton(
                    category.title.toLowerCase().replace(/\s+/g, '-'),
                    category.title
                );
                container.appendChild(btn);
            });
        }
    }
    
    // Populate mobile tag filters - Always show the 6 allowed tags
    function populateMobileTags() {
        const container = document.getElementById('mobileTagFilters');
        if (!container) return;
        
        // Clear existing
        container.innerHTML = '';
        
        // Count occurrences of each allowed tag
        const tagCounts = new Map();
        
        // Initialize all allowed tags with 0 count
        ALLOWED_TAGS.forEach(tag => {
            tagCounts.set(tag, 0);
        });
        
        // Count actual occurrences in menu data
        if (allMenuCategories && allMenuCategories.length > 0) {
            allMenuCategories.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => {
                        if (item.tags && Array.isArray(item.tags)) {
                            item.tags.forEach(tag => {
                                const lowerTag = tag.toLowerCase().trim();
                                // Only count if it's an allowed tag
                                if (ALLOWED_TAGS.includes(lowerTag)) {
                                    tagCounts.set(lowerTag, tagCounts.get(lowerTag) + 1);
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Always show all 6 allowed tags
        ALLOWED_TAGS.forEach(tag => {
            const label = document.createElement('label');
            label.className = 'mobile-tag-filter';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = tag;
            
            const span = document.createElement('span');
            span.className = 'mobile-tag-label';
            span.textContent = TAG_DISPLAY_NAMES[tag];
            
            const count = tagCounts.get(tag);
            if (count === 0) {
                label.classList.add('tag-no-items');
            }
            
            label.appendChild(input);
            label.appendChild(span);
            container.appendChild(label);
            
            // Add event listener
            input.addEventListener('change', handleMobileTagFilter);
        });
        
        console.log('Mobile filters: Created filters for all 6 allowed tags');
    }
    
    // Create mobile category button
    function createMobileCategoryButton(value, text) {
        const btn = document.createElement('button');
        btn.className = 'mobile-filter-btn';
        btn.setAttribute('data-category', value);
        btn.innerHTML = `
            <span>${text}</span>
            <span class="checkmark"></span>
        `;
        return btn;
    }
    
    // Attach mobile filter event listeners
    function attachMobileFilterListeners() {
        // Toggle button
        const toggleBtn = document.querySelector('.mobile-filter-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', openMobileFilters);
        }
        
        // Close button
        const closeBtn = document.querySelector('.mobile-filter-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMobileFilters);
        }
        
        // Modal backdrop
        const modal = document.querySelector('.mobile-filter-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeMobileFilters();
                }
            });
        }
        
        // Category buttons
        const categoryBtns = document.querySelectorAll('.mobile-filter-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', handleMobileCategoryFilter);
        });
        
        // Tag checkboxes
        const tagInputs = document.querySelectorAll('.mobile-tag-filter input');
        tagInputs.forEach(input => {
            input.addEventListener('change', handleMobileTagFilter);
        });
        
        // Reset button
        const resetBtn = document.querySelector('.mobile-filter-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetMobileFilters);
        }
        
        // Apply button
        const applyBtn = document.querySelector('.mobile-filter-apply');
        if (applyBtn) {
            applyBtn.addEventListener('click', applyMobileFilters);
        }
    }
    
    // Open mobile filters
    function openMobileFilters() {
        const modal = document.querySelector('.mobile-filter-modal');
        if (modal) {
            // Sync mobile state with current filters before opening
            mobileFilterState.category = currentFilters.category;
            mobileFilterState.tags = [...currentFilters.tags];
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update UI to reflect current filters
            updateMobileFilterUI();
        }
    }
    
    // Close mobile filters
    function closeMobileFilters() {
        const modal = document.querySelector('.mobile-filter-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Handle mobile category filter
    function handleMobileCategoryFilter(e) {
        const btn = e.currentTarget;
        const category = btn.getAttribute('data-category');
        
        // Update state
        mobileFilterState.category = category;
        
        // Update UI
        document.querySelectorAll('.mobile-filter-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
    }
    
    // Handle mobile tag filter
    function handleMobileTagFilter(e) {
        const checkbox = e.target;
        const tag = checkbox.value;
        
        if (checkbox.checked) {
            if (!mobileFilterState.tags.includes(tag)) {
                mobileFilterState.tags.push(tag);
            }
        } else {
            mobileFilterState.tags = mobileFilterState.tags.filter(t => t !== tag);
        }
    }
    
    // Reset mobile filters
    function resetMobileFilters() {
        // Reset state
        mobileFilterState = {
            category: 'all',
            tags: []
        };
        
        // Update UI
        updateMobileFilterUI();
        
        // Apply the reset immediately
        currentFilters.category = 'all';
        currentFilters.tags = [];
        applyFilters();
        updateMobileFilterBadge();
    }
    
    // Apply mobile filters
    function applyMobileFilters() {
        // Copy mobile state to main filters (use global currentFilters)
        currentFilters.category = mobileFilterState.category;
        currentFilters.tags = [...mobileFilterState.tags];
        
        // Apply filters using the global function
        applyFilters();
        
        // Update badge
        updateMobileFilterBadge();
        
        // Close modal
        closeMobileFilters();
    }
    
    // Update mobile filter UI
    function updateMobileFilterUI() {
        // Update category buttons
        document.querySelectorAll('.mobile-filter-btn').forEach(btn => {
            const category = btn.getAttribute('data-category');
            btn.classList.toggle('active', category === mobileFilterState.category);
        });
        
        // Update tag checkboxes
        document.querySelectorAll('.mobile-tag-filter input').forEach(input => {
            input.checked = mobileFilterState.tags.includes(input.value);
        });
    }
    
    // Update mobile filter badge
    function updateMobileFilterBadge() {
        const badge = document.querySelector('.mobile-filter-toggle .filter-badge');
        if (!badge) return;
        
        let activeCount = 0;
        // Use the global currentFilters variable
        activeCount = (currentFilters.category !== 'all' ? 1 : 0) + currentFilters.tags.length;
        
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize mobile filters after a short delay to ensure menu loads
        setTimeout(() => {
            if (window.innerWidth <= 768 && allMenuCategories.length > 0) {
                initializeMobileFilters();
                updateMobileFilterBadge();
            }
        }, 1000);
    });
    
    // Reinitialize on window resize
    let mobileFilterResizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(mobileFilterResizeTimer);
        mobileFilterResizeTimer = setTimeout(function() {
            if (window.innerWidth <= 768 && !document.querySelector('.mobile-filter-toggle')) {
                initializeMobileFilters();
            } else if (window.innerWidth > 768) {
                // Clean up mobile filters if switching to desktop
                const modal = document.querySelector('.mobile-filter-modal');
                const toggle = document.querySelector('.mobile-filter-toggle');
                if (modal) modal.remove();
                if (toggle) toggle.remove();
            }
        }, 250);
    });
    
    // Export for use in other functions
    window.mobileFilters = {
        init: initializeMobileFilters,
        updateBadge: updateMobileFilterBadge
    };
    
})();

console.log('CMS Loader Premium: Initialized with 6 fixed tags system');
