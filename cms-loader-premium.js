// CMS Loader Premium - Upper-Class Restaurant Menu System
// Enhanced with advanced filtering and PDF export

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
    loadMenuFromCMS();
    loadEventsFromCMS();
    initializeFilters();
});

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        showLoadingState();
        
        const response = await fetch('/.netlify/functions/get-menu');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const menuData = await response.json();
        console.log('Menu data loaded:', menuData);
        
        allMenuCategories = menuData;
        createCategoryFilters(menuData);
        displayPremiumMenu(menuData);
        hideLoadingState();
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
        hideLoadingState();
    }
}

// Show/Hide Loading State
function showLoadingState() {
    const container = document.getElementById('menuContainer');
    container.innerHTML = `
        <div class="menu-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Speisekarte wird geladen...</p>
        </div>
    `;
}

function hideLoadingState() {
    // Loading will be replaced by content
}

// Create Category Filter Buttons
function createCategoryFilters(menuData) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    
    // All categories button
    const allBtn = createFilterButton('all', 'Alle Gerichte', 'fa-border-all', true);
    container.appendChild(allBtn);
    
    // Individual category buttons
    menuData.forEach(category => {
        const icon = categoryIcons[category.title.toLowerCase()] || '🍴';
        const btn = createFilterButton(
            category.title.toLowerCase().replace(/\s+/g, '-'),
            category.title,
            null,
            false,
            icon
        );
        container.appendChild(btn);
    });
}

// Create Filter Button
function createFilterButton(value, text, iconClass, isActive = false, emoji = null) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.setAttribute('data-filter', value);
    
    if (iconClass) {
        btn.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
    } else if (emoji) {
        btn.innerHTML = `<span style="font-size: 1.2em;">${emoji}</span> ${text}`;
    } else {
        btn.textContent = text;
    }
    
    btn.addEventListener('click', handleCategoryFilter);
    return btn;
}

// Initialize Tag Filters
function initializeFilters() {
    const tagCheckboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]');
    tagCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleTagFilter);
    });
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
    
    // Reset UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    
    // Only reset tag checkboxes if visible (not on mobile)
    if (window.innerWidth > 768) {
        document.querySelectorAll('.tag-filter input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    displayPremiumMenu(allMenuCategories);
};

// Display Premium Menu
function displayPremiumMenu(menuData) {
    const container = document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        container.innerHTML = `
            <div class="menu-loading">
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
        if (category.items.some(item => item.allergens && item.allergens.length > 0)) {
            hasAllergens = true;
        }
        
        menuHTML += `
            <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                <div class="category-header">
                    <h3 class="category-name">${category.title}</h3>
                    ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                </div>
                
                ${category.image ? `
                    <div class="category-hero">
                        <img src="${formatImageUrl(category.image)}" alt="${category.title}" loading="lazy">
                    </div>
                ` : ''}
                
                <div class="menu-grid">
                    ${category.items.map(item => createMenuItemCard(item)).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = menuHTML;
    
    // Show/hide allergen legend
    if (hasAllergens) {
        displayAllergenLegend();
    } else {
        document.getElementById('allergenLegend').style.display = 'none';
    }
}

// Create Menu Item Card - FIXED VERSION
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

// Format Price - FIXED VERSION
function formatPrice(price) {
    if (!price) return '';
    
    // Remove any existing currency symbols
    let cleanPrice = price.toString().replace(/[€$£¥\s]/g, '').trim();
    
    // Replace comma with dot for decimal
    cleanPrice = cleanPrice.replace(',', '.');
    
    // Ensure it's a valid number
    const numPrice = parseFloat(cleanPrice);
    if (isNaN(numPrice)) return price; // Return original if not a valid number
    
    // Format with 2 decimal places
    const formatted = numPrice.toFixed(2);
    
    // Add euro sign at the beginning
    return `€${formatted}`;
}

// Get Item Icon
function getItemIcon(item) {
    // You can map specific items to icons here
    if (item.name.toLowerCase().includes('kaffee') || item.name.toLowerCase().includes('coffee')) return '☕';
    if (item.name.toLowerCase().includes('ei') || item.name.toLowerCase().includes('egg')) return '🥚';
    if (item.name.toLowerCase().includes('bowl')) return '🥣';
    if (item.name.toLowerCase().includes('avocado')) return '🥑';
    if (item.name.toLowerCase().includes('saft') || item.name.toLowerCase().includes('juice')) return '🥤';
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
    
    // Convert markdown-style formatting
    let html = text;
    
    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return html;
}

// Format Price
function formatPrice(price) {
    if (!price) return '';
    // Remove currency symbols and format
    const cleanPrice = price.toString().replace(/[€$£¥]/g, '').trim();
    // Ensure decimal format
    if (!cleanPrice.includes('.')) {
        return cleanPrice + '.00';
    }
    return cleanPrice;
}

// Format Image URL
function formatImageUrl(url) {
    if (!url) return '';
    return url.startsWith('/') ? url : `/${url}`;
}

// Display Allergen Legend
function displayAllergenLegend() {
    const container = document.getElementById('allergenLegend');
    const grid = container.querySelector('.allergen-grid');
    
    grid.innerHTML = Object.entries(allergenMap).map(([code, name]) => `
        <div class="allergen-item">
            <span class="allergen-letter">${code}</span>
            <span class="allergen-name">${name}</span>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Download Menu PDF
window.downloadMenuPDF = async function() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        alert('PDF-Funktion wird geladen. Bitte versuchen Sie es in einem Moment erneut.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPos = margin;
    
    // Add Logo/Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('Where wellness meets culinary excellence', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Add Menu Items
    doc.setFont('helvetica', 'normal');
    
    allMenuCategories.forEach((category, catIndex) => {
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margin;
        }
        
        // Category Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(category.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Category Items
        category.items.forEach((item, itemIndex) => {
            // Check page break
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
            }
            
            // Item Name and Price
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(item.name, margin, yPos);
            
            if (item.price) {
                const priceText = `€${formatPrice(item.price)}`;
                doc.text(priceText, pageWidth - margin, yPos, { align: 'right' });
            }
            yPos += lineHeight;
            
            // Description
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            const description = item.description
                .replace(/<[^>]*>/g, '') // Remove HTML
                .replace(/\*/g, '') // Remove asterisks
                .substring(0, 150); // Limit length
            
            const lines = doc.splitTextToSize(description, pageWidth - (margin * 2));
            lines.forEach(line => {
                if (yPos > pageHeight - 30) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 5;
            });
            
            // Tags and Allergens
            if (item.tags || item.allergens) {
                doc.setFontSize(9);
                let infoText = '';
                
                if (item.tags && item.tags.length > 0) {
                    infoText += item.tags.join(', ');
                }
                
                if (item.allergens && item.allergens.length > 0) {
                    if (infoText) infoText += ' | ';
                    infoText += 'Allergene: ' + item.allergens.join(', ');
                }
                
                doc.text(infoText, margin, yPos);
                yPos += lineHeight;
            }
            
            yPos += 5; // Space between items
        });
        
        yPos += 10; // Space between categories
    });
    
    // Add Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Gumpendorfer Straße 9, 1060 Wien | Tel: +43 676 123 456 78 | Seite ${i} von ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
    
    // Save PDF
    doc.save('healthy-brunch-club-menu.pdf');
};

// Load Events
async function loadEventsFromCMS() {
    try {
        const response = await fetch('/.netlify/functions/get-events');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const eventsData = await response.json();
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
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        <button class="event-close-btn" onclick="toggleEventWindow()">×</button>
        
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
    
    // Ensure window starts collapsed
    eventWindow.classList.add('collapsed');
    eventWindow.style.display = 'block';
    
    // Add initial highlight animation after a short delay
    setTimeout(() => {
        const toggleBtn = eventWindow.querySelector('.event-toggle');
        if (toggleBtn) {
            toggleBtn.classList.add('highlight');
            
            // Remove highlight after animation completes
            setTimeout(() => {
                toggleBtn.classList.remove('highlight');
            }, 6000); // 2s animation × 3 iterations
        }
    }, 1000);
}

// Toggle Event Window
window.toggleEventWindow = function() {
    const eventWindow = document.getElementById('eventWindow');
    eventWindow.classList.toggle('collapsed');
    
    // Mark as interacted to remove notification badge
    if (!eventWindow.classList.contains('interacted')) {
        eventWindow.classList.add('interacted');
    }
    
    // Remove highlight animation after first interaction
    const toggleBtn = eventWindow.querySelector('.event-toggle');
    if (toggleBtn) {
        toggleBtn.classList.remove('highlight');
    }
};

// Fallback Menu
function displayFallbackMenu() {
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
        }
    ];
    
    allMenuCategories = fallbackMenu;
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
            document.getElementById('adminBtn').classList.add('show');
        }
    });
    
    window.netlifyIdentity.on("login", () => {
        document.getElementById('adminBtn').classList.add('show');
    });
    
    window.netlifyIdentity.on("logout", () => {
        document.getElementById('adminBtn').classList.remove('show');
    });
}

// Export for global access
window.cmsLoader = {
    refresh: function() {
        loadMenuFromCMS();
        loadEventsFromCMS();
    }
};

console.log('Premium CMS Loader initialized with advanced filtering and PDF export.');
