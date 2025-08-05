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
    
    // Simplified - just text for elegant look
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
    
    // Add smooth scroll behavior for mobile horizontal scrolling
    const filterButtons = document.querySelector('.filter-buttons');
    if (filterButtons) {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        filterButtons.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - filterButtons.offsetLeft;
            scrollLeft = filterButtons.scrollLeft;
        });
        
        filterButtons.addEventListener('mouseleave', () => {
            isDown = false;
        });
        
        filterButtons.addEventListener('mouseup', () => {
            isDown = false;
        });
        
        filterButtons.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - filterButtons.offsetLeft;
            const walk = (x - startX) * 2;
            filterButtons.scrollLeft = scrollLeft - walk;
        });
    }
}

// Add visual feedback for active filters
function updateFilterVisualFeedback() {
    const hasActiveFilters = currentFilters.category !== 'all' || currentFilters.tags.length > 0;
    const filterContainer = document.querySelector('.menu-filter-container');
    
    if (hasActiveFilters) {
        filterContainer.classList.add('has-active-filters');
    } else {
        filterContainer.classList.remove('has-active-filters');
    }
    
    // Show filter count badge
    const activeFilterCount = (currentFilters.category !== 'all' ? 1 : 0) + currentFilters.tags.length;
    const resetButton = document.querySelector('.btn-icon[onclick="resetFilters()"]');
    
    if (resetButton && activeFilterCount > 0) {
        const existingBadge = resetButton.querySelector('.filter-count');
        if (existingBadge) {
            existingBadge.textContent = activeFilterCount;
        } else {
            const badge = document.createElement('span');
            badge.className = 'filter-count';
            badge.textContent = activeFilterCount;
            resetButton.appendChild(badge);
        }
    } else if (resetButton) {
        const badge = resetButton.querySelector('.filter-count');
        if (badge) badge.remove();
    }
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

// Update the existing handleTagFilter to include visual feedback
const originalHandleTagFilter = handleTagFilter;
handleTagFilter = function(e) {
    originalHandleTagFilter.call(this, e);
    updateFilterVisualFeedback();
};

// Update the existing handleCategoryFilter to include visual feedback
const originalHandleCategoryFilter = handleCategoryFilter;
handleCategoryFilter = function(e) {
    originalHandleCategoryFilter.call(this, e);
    updateFilterVisualFeedback();
};

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
    // Reset filter state
    currentFilters = {
        category: 'all',
        tags: []
    };
    
    // Reset category buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    
    // Reset all tag checkboxes (now visible on all devices)
    document.querySelectorAll('.tag-filter input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Display all menu items
    displayPremiumMenu(allMenuCategories);
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

// Update the createMenuItemCard function to ensure price is displayed
function createMenuItemCard(item) {
    const hasImage = item.image ? true : false;
    const isSpecial = item.special || false;
    
    // Debug log to check price formatting
    if (item.price) {
        console.log(`Item: ${item.name}, Original price: ${item.price}, Formatted: ${formatPrice(item.price)}`);
    }
    
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

// Format Price - ROBUST VERSION
function formatPrice(price) {
    if (!price && price !== 0) return '';
    
    // Convert to string and clean
    let cleanPrice = String(price).trim();
    
    // Remove any currency symbols and extra spaces
    cleanPrice = cleanPrice.replace(/[€$£¥\s]/g, '');
    
    // Replace comma with dot for decimal
    cleanPrice = cleanPrice.replace(/,/g, '.');
    
    // Parse as float
    const numPrice = parseFloat(cleanPrice);
    
    // Check if valid number
    if (isNaN(numPrice)) {
        console.warn(`Invalid price format: ${price}`);
        return `€ ${price}`;
    }
    
    // Format number
    let formatted = numPrice.toFixed(2);
    
    // Remove .00 for whole numbers
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    
    // Return with euro sign and non-breaking space
    return `€\u00A0${formatted}`;
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

// Enhanced Premium Menu PDF Generation
window.downloadMenuPDF = async function() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        alert('PDF-Funktion wird geladen. Bitte versuchen Sie es in einem Moment erneut.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    // Create new PDF with custom size (A4)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // PDF Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);
    
    // Color palette matching website
    const colors = {
        primary: [30, 74, 60], // Forest green RGB
        gold: [201, 169, 97], // Gold RGB
        gray: [88, 88, 88], // Warm gray RGB
        lightGray: [232, 232, 232], // Light gray RGB
        cream: [250, 248, 243] // Cream RGB
    };
    
    // Helper function to add decorative line
    function addDecorativeLine(y, width = 50) {
        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.5);
        doc.line((pageWidth - width) / 2, y, (pageWidth + width) / 2, y);
    }
    
    // Add background pattern (subtle)
    function addBackgroundPattern() {
        doc.setDrawColor(...colors.lightGray);
        doc.setLineWidth(0.1);
        // Add subtle vertical lines
        for (let x = margin; x < pageWidth - margin; x += 40) {
            doc.line(x, 0, x, pageHeight);
        }
    }
    
    // First page - Cover
    addBackgroundPattern();
    let yPos = 50;
    
    // Logo placeholder (since we can't embed images easily in jsPDF without additional plugins)
    doc.setFillColor(...colors.primary);
    doc.circle(pageWidth / 2, yPos, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('HBC', pageWidth / 2, yPos + 2, { align: 'center' });
    
    yPos += 35;
    
    // Restaurant name
    doc.setTextColor(...colors.primary);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'normal');
    doc.text('HEALTHY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    doc.text('BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    addDecorativeLine(yPos);
    yPos += 10;
    
    // Tagline
    doc.setTextColor(...colors.gray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.text('Where wellness meets culinary excellence', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 25;
    
    // Opening hours box
    doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.roundedRect(margin + 40, yPos, contentWidth - 80, 30, 3, 3, 'F');
    doc.setTextColor(...colors.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Jeden Montag | 09:00 - 12:00 Uhr', pageWidth / 2, yPos + 12, { align: 'center' });
    doc.text('Reservierung empfohlen', pageWidth / 2, yPos + 20, { align: 'center' });
    
    yPos = pageHeight - 60;
    
    // Contact info
    doc.setTextColor(...colors.gray);
    doc.setFontSize(11);
    doc.text('Gumpendorfer Straße 9, 1060 Wien', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.text('+43 676 123 456 78 | hello@healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.text('www.healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });
    
    // Add new page for menu content
    doc.addPage();
    addBackgroundPattern();
    yPos = margin;
    
    // Menu header
    doc.setTextColor(...colors.primary);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'normal');
    doc.text('SPEISEKARTE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    addDecorativeLine(yPos, 80);
    yPos += 20;
    
    // Process categories
    allMenuCategories.forEach((category, catIndex) => {
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
            doc.addPage();
            addBackgroundPattern();
            yPos = margin;
        }
        
        // Category box
        doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.roundedRect(margin, yPos - 8, contentWidth, 12, 2, 2, 'F');
        
        // Category name
        doc.setTextColor(...colors.primary);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(category.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Category description if exists
        if (category.description) {
            doc.setTextColor(...colors.gray);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            const descLines = doc.splitTextToSize(category.description, contentWidth - 20);
            descLines.forEach(line => {
                doc.text(line, pageWidth / 2, yPos, { align: 'center' });
                yPos += 5;
            });
            yPos += 5;
        }
        
        // Category items
        category.items.forEach((item, itemIndex) => {
            // Check page break
            if (yPos > pageHeight - 50) {
                doc.addPage();
                addBackgroundPattern();
                yPos = margin;
            }
            
            // Item container
            const itemStartY = yPos;
            
            // Special item highlight
            if (item.special) {
                doc.setFillColor(255, 247, 237); // Light peach background
                doc.roundedRect(margin + 5, yPos - 5, contentWidth - 10, 40, 2, 2, 'F');
                
                // Chef's choice badge
                doc.setFillColor(...colors.gold);
                doc.circle(pageWidth - margin - 10, yPos, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('CHEF', pageWidth - margin - 10, yPos + 2, { align: 'center' });
            }
            
            // Item name
            doc.setTextColor(...colors.primary);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const itemName = item.name.charAt(0).toUpperCase() + item.name.slice(1);
            doc.text(itemName, margin + 10, yPos);
            
            // Price
            if (item.price) {
                doc.setTextColor(...colors.gold);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const priceText = formatPrice(item.price);
                doc.text(priceText, pageWidth - margin - 10, yPos, { align: 'right' });
            }
            
            yPos += 7;
            
            // Description
            if (item.description) {
                doc.setTextColor(...colors.gray);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                
                const cleanDesc = item.description
                    .replace(/<[^>]*>/g, '')
                    .replace(/\*/g, '');
                
                const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 40);
                descLines.slice(0, 3).forEach(line => { // Max 3 lines
                    doc.text(line, margin + 10, yPos);
                    yPos += 4;
                });
            }
            
            yPos += 2;
            
            // Nutrition info in a subtle box
            if (item.nutrition && item.nutrition.calories) {
                doc.setFillColor(250, 250, 250);
                doc.roundedRect(margin + 10, yPos - 3, 80, 6, 1, 1, 'F');
                doc.setTextColor(...colors.gray);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                let nutritionText = `${item.nutrition.calories} kcal`;
                if (item.nutrition.protein) nutritionText += ` | ${item.nutrition.protein} Protein`;
                if (item.nutrition.carbs) nutritionText += ` | ${item.nutrition.carbs} KH`;
                if (item.nutrition.fat) nutritionText += ` | ${item.nutrition.fat} Fett`;
                
                doc.text(nutritionText, margin + 12, yPos);
                yPos += 8;
            }
            
            // Tags and allergens
            if (item.tags || item.allergens) {
                doc.setFontSize(8);
                
                // Tags
                if (item.tags && item.tags.length > 0) {
                    doc.setTextColor(...colors.primary);
                    const tagsText = item.tags.map(tag => 
                        tag.charAt(0).toUpperCase() + tag.slice(1)
                    ).join(' • ');
                    doc.text(tagsText, margin + 10, yPos);
                    yPos += 5;
                }
                
                // Allergens
                if (item.allergens && item.allergens.length > 0) {
                    doc.setTextColor(214, 38, 30); // Red for allergens
                    doc.setFont('helvetica', 'bold');
                    doc.text('Allergene: ', margin + 10, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item.allergens.join(', '), margin + 10 + 18, yPos);
                    yPos += 5;
                }
            }
            
            yPos += 8; // Space between items
            
            // Subtle separator between items
            if (itemIndex < category.items.length - 1) {
                doc.setDrawColor(...colors.lightGray);
                doc.setLineWidth(0.2);
                doc.line(margin + 30, yPos - 3, pageWidth - margin - 30, yPos - 3);
            }
        });
        
        yPos += 10; // Space between categories
    });
    
    // Allergen legend page
    const hasAllergens = allMenuCategories.some(cat => 
        cat.items.some(item => item.allergens && item.allergens.length > 0)
    );
    
    if (hasAllergens) {
        doc.addPage();
        addBackgroundPattern();
        yPos = margin;
        
        // Allergen header
        doc.setTextColor(...colors.primary);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'normal');
        doc.text('ALLERGEN-INFORMATION', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        addDecorativeLine(yPos, 100);
        yPos += 20;
        
        // Allergen list in two columns
        const allergenEntries = Object.entries(allergenMap);
        const halfLength = Math.ceil(allergenEntries.length / 2);
        const columnWidth = (contentWidth - 20) / 2;
        
        doc.setFontSize(10);
        
        // Left column
        let leftY = yPos;
        allergenEntries.slice(0, halfLength).forEach(([code, name]) => {
            doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
            doc.roundedRect(margin, leftY - 4, columnWidth, 8, 1, 1, 'F');
            
            doc.setTextColor(...colors.gold);
            doc.setFont('helvetica', 'bold');
            doc.text(code, margin + 5, leftY);
            
            doc.setTextColor(...colors.gray);
            doc.setFont('helvetica', 'normal');
            doc.text('= ' + name, margin + 15, leftY);
            
            leftY += 10;
        });
        
        // Right column
        let rightY = yPos;
        allergenEntries.slice(halfLength).forEach(([code, name]) => {
            doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
            doc.roundedRect(margin + columnWidth + 20, rightY - 4, columnWidth, 8, 1, 1, 'F');
            
            doc.setTextColor(...colors.gold);
            doc.setFont('helvetica', 'bold');
            doc.text(code, margin + columnWidth + 25, rightY);
            
            doc.setTextColor(...colors.gray);
            doc.setFont('helvetica', 'normal');
            doc.text('= ' + name, margin + columnWidth + 35, rightY);
            
            rightY += 10;
        });
    }
    
    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Page number
        doc.setTextColor(...colors.gray);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        
        if (i > 1) { // Skip footer on cover page
            doc.text(`Seite ${i} von ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
            
            // QR code placeholder
            doc.setDrawColor(...colors.primary);
            doc.setLineWidth(0.5);
            doc.rect(pageWidth - margin - 20, pageHeight - 35, 20, 20);
            doc.setFontSize(6);
            doc.text('SCAN FOR', pageWidth - margin - 10, pageHeight - 25, { align: 'center' });
            doc.text('DIGITAL MENU', pageWidth - margin - 10, pageHeight - 20, { align: 'center' });
        }
    }
    
    // Generate filename with date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `healthy-brunch-club-menu-${dateStr}.pdf`;
    
    // Save PDF
    doc.save(filename);
    
    // Note about saving to GitHub
    console.log(`PDF generated: ${filename}`);
    console.log('To save this PDF to GitHub, you would need to implement a Netlify function that commits the file to your repository.');
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

// Also check if you're using the old menu display function
// For mystyle.css compatibility
function displayElegantMenu(menuData) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Gerichte in dieser Kategorie gefunden.</div>';
        return;
    }
    
    menuContainer.innerHTML = menuData.map(category => {
        return `
            <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                ${category.image ? `
                    <div class="category-image">
                        <img src="${formatImageUrl(category.image)}" alt="${category.title}" loading="lazy">
                    </div>
                ` : ''}
                
                <div class="category-header">
                    <h3 class="category-title">${category.title}</h3>
                    ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                </div>
                
                <div class="menu-items-grid">
                    ${category.items.map(item => {
                        const hasImage = item.image ? true : false;
                        const isSpecial = item.special || false;
                        const categoryIcon = getCategoryIcon(category.title);
                        
                        return `
                        <div class="menu-item ${isSpecial ? 'special' : ''} ${!hasImage ? 'no-image' : ''}">
                            ${hasImage ? `
                                <div class="menu-item-image">
                                    <img src="${formatImageUrl(item.image)}" alt="${item.name}" loading="lazy">
                                </div>
                            ` : `
                                <div class="menu-item-icon">${categoryIcon}</div>
                            `}
                            
                            <div class="menu-item-header">
                                <h4 class="menu-item-name">${item.name}</h4>
                                ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
                            </div>
                            
                            <div class="menu-item-description">
                                ${processRichText(item.description)}
                            </div>
                            
                            <div class="menu-item-info">
                                ${item.nutrition && item.nutrition.calories ? `
                                    <div class="menu-item-calories">
                                        ${formatNutrition(item.nutrition)}
                                    </div>
                                ` : ''}
                                
                                ${item.tags && item.tags.length > 0 ? `
                                    <div class="menu-item-tags">
                                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                                
                                ${item.allergens && item.allergens.length > 0 ? `
                                    <div class="menu-item-allergens">
                                        <span class="allergen-label">Allergene:</span>
                                        ${formatAllergens(item.allergens)}
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

// Helper Functions for displayElegantMenu
function getCategoryIcon(categoryTitle) {
    if (!categoryTitle) return '🌿';
    const lowerTitle = categoryTitle.toLowerCase();
    for (const [key, icon] of Object.entries(categoryIcons)) {
        if (lowerTitle.includes(key) || key.includes(lowerTitle)) {
            return icon;
        }
    }
    return '🌿';
}

function processRichText(text) {
    return processDescription(text);
}

function formatNutrition(nutrition) {
    if (!nutrition || !nutrition.calories) return '';
    
    let nutritionText = `<span class="calories-value">${nutrition.calories}</span> kcal`;
    
    if (nutrition.protein || nutrition.carbs || nutrition.fat) {
        const extras = [];
        if (nutrition.protein) extras.push(`${nutrition.protein} Protein`);
        if (nutrition.carbs) extras.push(`${nutrition.carbs} KH`);
        if (nutrition.fat) extras.push(`${nutrition.fat} Fett`);
        
        if (extras.length > 0) {
            nutritionText += ` • ${extras.join(' • ')}`;
        }
    }
    
    return nutritionText;
}

function formatAllergens(allergens) {
    if (!allergens || allergens.length === 0) return '';
    return allergens.map(code => 
        `<span class="allergen-code">${code}</span>`
    ).join(' ');
}

console.log('Premium CMS Loader initialized with advanced filtering and PDF export.');
