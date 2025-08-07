// CMS Loader Minimalist - Matching PDF Design Exactly
// Maintains all functionality while displaying in minimalist style

let allMenuCategories = [];
let currentFilters = {
    category: 'all',
    tags: []
};

// Define the 6 allowed tags globally (hidden in minimalist view but maintained)
const ALLOWED_TAGS = ['vegetarisch', 'glutenfrei', 'proteinreich', 'sättigend', 'belebend', 'immunstärkend'];

// Tag display names mapping
const TAG_DISPLAY_NAMES = {
    'vegetarisch': 'vegetarisch',
    'glutenfrei': 'glutenfrei', 
    'proteinreich': 'proteinreich',
    'sättigend': 'sättigend',
    'belebend': 'belebend',
    'immunstärkend': 'immunstärkend'
};

// Allergen Mapping
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader Minimalist: Initializing...');
    loadMenuFromCMS();
    loadEventsFromCMS();
    
    // Add style toggle button
    addStyleToggle();
});

// Add style toggle button
function addStyleToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'style-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-palette"></i> premium style';
    toggleBtn.onclick = function() {
        window.location.href = '/?style=premium';
    };
    document.body.appendChild(toggleBtn);
}

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
        createTagFilters(menuData);
        displayMinimalistMenu(menuData);
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
                <p>speisekarte wird geladen...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    console.log('CMS Loader: Loading state hidden');
}

// Create Category Filter Buttons
function createCategoryFilters(menuData) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;
    
    container.innerHTML = '';
    
    // All categories button
    const allBtn = createFilterButton('all', 'alle gerichte', true);
    container.appendChild(allBtn);
    
    // Individual category buttons
    menuData.forEach(category => {
        const btn = createFilterButton(
            category.title.toLowerCase().replace(/\s+/g, '-'),
            category.title.toLowerCase(),
            false
        );
        container.appendChild(btn);
    });
}

// Create Tag Filters (hidden in minimalist view but functional)
function createTagFilters(menuData) {
    const container = document.getElementById('tagFilters');
    if (!container) return;
    
    // In minimalist view, we hide the tag filters but keep them functional
    container.style.display = 'none';
}

// Create Filter Button
function createFilterButton(value, text, isActive = false) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.setAttribute('data-filter', value);
    btn.textContent = text;
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
}

// Apply Filters
function applyFilters() {
    let filteredCategories = [...allMenuCategories];
    
    if (currentFilters.category !== 'all') {
        filteredCategories = filteredCategories.filter(category =>
            category.title.toLowerCase().replace(/\s+/g, '-') === currentFilters.category
        );
    }
    
    displayMinimalistMenu(filteredCategories);
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
    
    displayMinimalistMenu(allMenuCategories);
};

// Display Minimalist Menu
function displayMinimalistMenu(menuData) {
    const container = document.getElementById('menuContainer');
    if (!container) return;
    
    if (!menuData || menuData.length === 0) {
        container.innerHTML = `
            <div class="no-results-message">
                <i class="fas fa-search"></i>
                <p>keine gerichte gefunden</p>
            </div>
        `;
        return;
    }
    
    let hasAllergens = false;
    let menuHTML = '';
    
    menuData.forEach((category) => {
        if (category.items && category.items.some(item => item.allergens && item.allergens.length > 0)) {
            hasAllergens = true;
        }
        
        menuHTML += createMinimalistCategoryHTML(category);
    });
    
    container.innerHTML = menuHTML;
    
    // Add footer note
    container.innerHTML += `
        <div class="pdf-footer-note">
            die angegebenen nährwerte sind durchschnittswerte und dienen lediglich zur orientierung
        </div>
    `;
    
    if (hasAllergens) {
        displayAllergenLegend();
    }
}

// Create Minimalist Category HTML
function createMinimalistCategoryHTML(category) {
    // Convert category title to spaced uppercase letters
    const spacedTitle = category.title.toUpperCase().split('').join(' ');
    
    let html = `
        <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
            <div class="category-header">
                <h3 class="category-name">${spacedTitle}</h3>
                ${category.description ? `<p class="category-description">${category.description.toLowerCase()}</p>` : ''}
            </div>
            <div class="menu-grid">
                ${category.items ? category.items.map(item => createMinimalistItemCard(item)).join('') : ''}
            </div>
        </div>
    `;
    
    return html;
}

// Create Minimalist Menu Item Card
function createMinimalistItemCard(item) {
    return `
        <div class="menu-item-card">
            <div class="menu-item-header">
                <h4 class="menu-item-name">${item.name.toLowerCase()}</h4>
                ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
            </div>
            
            <div class="menu-item-description">
                ${item.description ? item.description.toLowerCase() : ''}
            </div>
            
            ${item.nutrition ? createMinimalistNutrition(item.nutrition) : ''}
            
            ${item.allergens && item.allergens.length > 0 ? `
                <div class="menu-item-allergens">
                    (${item.allergens.join(',')})
                </div>
            ` : ''}
        </div>
    `;
}

// Create Minimalist Nutrition Badges
function createMinimalistNutrition(nutrition) {
    let badges = '';
    
    if (nutrition.calories) {
        const calories = nutrition.calories.replace(/[^0-9]/g, '');
        badges += `
            <div class="nutrition-badge">
                <span class="nutrition-value">${calories}</span>
                <span class="nutrition-label">kcal</span>
            </div>
        `;
    }
    
    if (nutrition.protein) {
        const protein = nutrition.protein.replace(/[^0-9,\.]/g, '');
        badges += `
            <div class="nutrition-badge">
                <span class="nutrition-value">${protein} g</span>
                <span class="nutrition-label">protein</span>
            </div>
        `;
    }
    
    if (nutrition.carbs) {
        const carbs = nutrition.carbs.replace(/[^0-9,\.]/g, '');
        badges += `
            <div class="nutrition-badge">
                <span class="nutrition-value">${carbs} g</span>
                <span class="nutrition-label">carbs</span>
            </div>
        `;
    }
    
    if (nutrition.fat) {
        const fat = nutrition.fat.replace(/[^0-9,\.]/g, '');
        badges += `
            <div class="nutrition-badge">
                <span class="nutrition-value">${fat} g</span>
                <span class="nutrition-label">fett</span>
            </div>
        `;
    }
    
    return badges ? `<div class="menu-item-nutrition">${badges}</div>` : '';
}

// Format Price
function formatPrice(price) {
    if (!price && price !== 0) return '';
    
    let cleanPrice = String(price).trim();
    cleanPrice = cleanPrice.replace(/[€$£¥\s]/g, '');
    cleanPrice = cleanPrice.replace(/,/g, '.');
    
    const numPrice = parseFloat(cleanPrice);
    if (isNaN(numPrice)) return price;
    
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    
    return formatted;
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
            <span>${name.toLowerCase()}</span>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Load Events (hidden in minimalist view)
async function loadEventsFromCMS() {
    // Events are hidden in minimalist menu view
    const eventWindow = document.getElementById('eventWindow');
    if (eventWindow) {
        eventWindow.style.display = 'none';
    }
}

// Fallback Menu
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "Coffee, Healthtea and Me",
            order: 1,
            description: "von wiener klassikern bis adaptogene superdrinks",
            items: [
                {
                    name: "ashwaganda latte",
                    price: "5.50",
                    description: "ein geschmeidiger latte, durchzogen von adaptogenem ashwaganda, der sanft beruhigt und stress schmelzen lässt",
                    nutrition: { calories: "180", protein: "6", carbs: "18", fat: "8" },
                    allergens: ["G"]
                },
                {
                    name: "reishi cappuccino",
                    price: "4.60",
                    description: "samtiger cappuccino mit adaptogenem reishi, der das immunsystem unterstützt",
                    nutrition: { calories: "150", protein: "5", carbs: "14", fat: "7" },
                    allergens: ["G"]
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    createCategoryFilters(fallbackMenu);
    displayMinimalistMenu(fallbackMenu);
}

// Export for global access
window.cmsLoaderMinimalist = {
    refresh: function() {
        console.log('CMS Loader: Refreshing content...');
        loadMenuFromCMS();
    }
};