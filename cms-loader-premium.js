// CMS Loader Premium - Carousel Menu System
// Single category view with horizontal product browsing

let allMenuCategories = [];
let activeCategoryIndex = 0;
let activeProductIndex = 0;

// Define the 6 allowed tags globally
const ALLOWED_TAGS = ['vegetarisch', 'glutenfrei', 'proteinreich', 'sättigend', 'belebend', 'immunstärkend'];

// Tag display names mapping
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

// Keep currentFilters for compatibility with other scripts
let currentFilters = {
    category: 'all',
    tags: []
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader: Initializing carousel menu...');
    loadMenuFromCMS();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        showLoadingState();
        const response = await fetch('/.netlify/functions/get-menu');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const menuData = await response.json();
        allMenuCategories = menuData;
        activeCategoryIndex = 0;
        activeProductIndex = 0;
        renderCategoryNav(menuData);
        renderActiveCategory();
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
        container.innerHTML = '<div class="menu-loading"><i class="fas fa-spinner fa-spin"></i><p>speisekarte wird geladen...</p></div>';
    }
}

function hideLoadingState() {
    console.log('CMS Loader: Loading complete');
}

// --- Category Navigation (horizontal scrollable tabs) ---

function renderCategoryNav(menuData) {
    const nav = document.getElementById('categoryFilters');
    if (!nav) return;
    nav.innerHTML = '';

    menuData.forEach((cat, i) => {
        const btn = document.createElement('button');
        btn.className = 'cat-tab' + (i === activeCategoryIndex ? ' active' : '');
        btn.textContent = cat.title;
        btn.addEventListener('click', () => {
            activeCategoryIndex = i;
            activeProductIndex = 0;
            updateCategoryNav();
            renderActiveCategory();
        });
        nav.appendChild(btn);
    });

    // Scroll active tab into view
    setTimeout(() => scrollActiveTabIntoView(), 50);
}

function updateCategoryNav() {
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === activeCategoryIndex);
    });
    scrollActiveTabIntoView();
}

function scrollActiveTabIntoView() {
    const activeTab = document.querySelector('.cat-tab.active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

// --- Product Carousel (single product visible) ---

function renderActiveCategory() {
    const container = document.getElementById('menuContainer');
    if (!container || allMenuCategories.length === 0) return;

    const category = allMenuCategories[activeCategoryIndex];
    if (!category || !category.items || category.items.length === 0) {
        container.innerHTML = '<div class="no-results-message"><p>Keine Gerichte in dieser Kategorie.</p></div>';
        return;
    }

    // Clamp product index
    if (activeProductIndex >= category.items.length) activeProductIndex = 0;
    if (activeProductIndex < 0) activeProductIndex = category.items.length - 1;

    const item = category.items[activeProductIndex];
    const total = category.items.length;

    container.innerHTML = `
        <div class="product-carousel">
            <div class="product-carousel-inner">
                ${total > 1 ? `<button class="carousel-btn carousel-btn-prev" aria-label="Vorheriges Gericht"><i class="fas fa-chevron-left"></i></button>` : ''}
                <div class="product-slide">${createProductCard(item)}</div>
                ${total > 1 ? `<button class="carousel-btn carousel-btn-next" aria-label="Nächstes Gericht"><i class="fas fa-chevron-right"></i></button>` : ''}
            </div>
            ${total > 1 ? `
                <div class="carousel-dots">
                    ${category.items.map((_, idx) => `<button class="carousel-dot${idx === activeProductIndex ? ' active' : ''}" data-idx="${idx}" aria-label="Gericht ${idx + 1}"></button>`).join('')}
                </div>
                <div class="carousel-counter">${activeProductIndex + 1} / ${total}</div>
            ` : ''}
        </div>
    `;

    // Attach carousel event listeners
    const prevBtn = container.querySelector('.carousel-btn-prev');
    const nextBtn = container.querySelector('.carousel-btn-next');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateProduct(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateProduct(1));

    // Dot navigation
    container.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            activeProductIndex = parseInt(e.currentTarget.dataset.idx);
            renderActiveCategory();
        });
    });

    // Touch/swipe support
    setupSwipe(container.querySelector('.product-carousel-inner'));

    // Allergen legend
    updateAllergenLegend(category);
}

function navigateProduct(direction) {
    const category = allMenuCategories[activeCategoryIndex];
    if (!category || !category.items) return;
    activeProductIndex += direction;
    if (activeProductIndex >= category.items.length) activeProductIndex = 0;
    if (activeProductIndex < 0) activeProductIndex = category.items.length - 1;
    renderActiveCategory();
}

// --- Product Card (no price, large image, minimal) ---

function createProductCard(item) {
    const hasImage = !!item.image;
    const imgUrl = hasImage ? formatImageUrl(item.image) : '';
    const webpSrcset = hasImage ? getWebPSrcset(item.image) : '';

    const tags = (item.tags || [])
        .filter(tag => ALLOWED_TAGS.includes(tag.toLowerCase().trim()))
        .map(tag => `<span class="menu-tag">${TAG_DISPLAY_NAMES[tag.toLowerCase().trim()] || tag}</span>`)
        .join('');

    const allergens = (item.allergens && item.allergens.length > 0)
        ? `<div class="product-allergens"><span>Allergene:</span> ${item.allergens.map(c => `<span class="allergen-code">${c}</span>`).join('')}</div>`
        : '';

    return `
        <div class="product-card">
            ${hasImage ? `
                <div class="product-image">
                    <picture>
                        <source srcset="${webpSrcset}" sizes="(max-width: 480px) 92vw, (max-width: 768px) 80vw, 600px" type="image/webp">
                        <img src="${imgUrl}" alt="${item.name}" loading="eager" width="600" height="400">
                    </picture>
                </div>
            ` : `
                <div class="product-image product-image-placeholder">
                    <span class="product-icon">${getItemIcon(item)}</span>
                </div>
            `}
            <div class="product-info">
                <h3 class="product-name">${item.name}</h3>
                ${item.description ? `<p class="product-description">${processDescription(item.description)}</p>` : ''}
                ${tags ? `<div class="product-tags">${tags}</div>` : ''}
                ${allergens}
            </div>
        </div>
    `;
}

// --- Swipe support ---

function setupSwipe(el) {
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let distX = 0;

    el.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        distX = 0;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        distX = e.touches[0].clientX - startX;
    }, { passive: true });

    el.addEventListener('touchend', () => {
        if (Math.abs(distX) > 50) {
            navigateProduct(distX < 0 ? 1 : -1);
        }
    });
}

// --- Keyboard navigation ---

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') navigateProduct(-1);
    if (e.key === 'ArrowRight') navigateProduct(1);
});

// --- Allergen legend ---

function updateAllergenLegend(category) {
    const legend = document.getElementById('allergenLegend');
    if (!legend) return;

    const hasAllergens = category.items && category.items.some(item => item.allergens && item.allergens.length > 0);
    if (hasAllergens) {
        displayAllergenLegend();
    } else {
        legend.style.display = 'none';
    }
}

function displayAllergenLegend() {
    const container = document.getElementById('allergenLegend');
    if (!container) return;
    const grid = container.querySelector('.allergen-grid');
    if (!grid) return;

    grid.innerHTML = Object.entries(allergenMap).map(([code, name]) =>
        `<div class="allergen-item"><span class="allergen-letter">${code}</span><span class="allergen-name">${name}</span></div>`
    ).join('');

    container.style.display = 'block';
}

// --- Utility functions ---

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

function processDescription(text) {
    if (!text) return '';
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

function formatImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? url : `/${url}`;
}

function getWebPUrl(url) {
    if (!url) return '';
    return formatImageUrl(url).replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

function getWebPSrcset(url) {
    if (!url) return '';
    const formatted = formatImageUrl(url);
    const basePath = formatted.replace(/\.(jpg|jpeg|png)$/i, '');
    return `${basePath}-400w.webp 400w, ${basePath}-800w.webp 800w, ${basePath}.webp 1200w`;
}

function formatPrice(price) {
    if (!price && price !== 0) return '';
    let cleanPrice = String(price).trim().replace(/[€$£¥\s]/g, '').replace(/,/g, '.');
    const numPrice = parseFloat(cleanPrice);
    if (isNaN(numPrice)) return `€\u00A0${price}`;
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) formatted = formatted.slice(0, -3);
    return `€\u00A0${formatted}`;
}

// --- Fallback Menu ---

function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "Morning Essentials",
            order: 1,
            description: "Der perfekte Start in Ihren Tag",
            items: [
                { name: "Bio-Zitronenwasser", description: "Warmes Wasser mit frisch gepresster Bio-Zitrone", tags: ["vegetarisch", "glutenfrei"], allergens: [] },
                { name: "Golden Turmeric Latte", description: "Kurkuma, Ingwer, schwarzer Pfeffer in cremiger Hafermilch", tags: ["vegetarisch", "belebend"], allergens: ["A"], special: true }
            ]
        },
        {
            title: "Power Bowls",
            order: 2,
            description: "Energie für den ganzen Tag",
            items: [
                { name: "Açaí Energy Bowl", description: "Açaí, Banane, Beeren, Granola, Kokosflocken", tags: ["vegetarisch", "immunstärkend"], allergens: ["A", "H"] },
                { name: "Protein Power Bowl", description: "Quinoa, Edamame, Avocado, Tempeh, Tahini-Dressing", tags: ["proteinreich", "glutenfrei", "sättigend"], allergens: ["F", "N"] }
            ]
        }
    ];
    allMenuCategories = fallbackMenu;
    activeCategoryIndex = 0;
    activeProductIndex = 0;
    renderCategoryNav(fallbackMenu);
    renderActiveCategory();
}

// --- Compatibility: keep applyFilters and resetFilters for other scripts ---

function applyFilters() {
    renderActiveCategory();
}

window.resetFilters = function() {
    activeCategoryIndex = 0;
    activeProductIndex = 0;
    updateCategoryNav();
    renderActiveCategory();
};

// --- Admin features ---

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

// --- Export for global access ---

window.cmsLoader = {
    refresh: function() { loadMenuFromCMS(); },
    getCurrentFilters: function() { return currentFilters; },
    applyExternalFilters: function(filters) {
        currentFilters = { ...currentFilters, ...filters };
        applyFilters();
    }
};

// No-op mobile filters (carousel works on all screen sizes)
window.mobileFilters = {
    init: function() {},
    updateBadge: function() {}
};

console.log('CMS Loader Premium: Carousel menu initialized.');
