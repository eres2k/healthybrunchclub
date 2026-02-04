// CMS Loader Premium - Category Showcase
// Simple, robust category display for homepage

let allMenuCategories = [];
let currentCategoryIndex = 0;

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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    loadMenuCategories();
});

// Load menu categories from CMS
async function loadMenuCategories() {
    const carousel = document.getElementById('categoryCarousel');
    const tabsContainer = document.getElementById('categoryTabs');

    if (!carousel) {
        console.warn('CMS Loader: Carousel container not found');
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/get-menu');

        if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
        }

        const menuData = await response.json();

        // Use all categories that have items
        allMenuCategories = menuData.filter(function(category) {
            return category.items && category.items.length > 0;
        });

        if (allMenuCategories.length === 0) {
            carousel.innerHTML = '<p class="menu-error">Keine Kategorien gefunden.</p>';
            return;
        }

        // Build the UI
        buildCategoryTabs(tabsContainer);
        buildCategoryContent(carousel);
        setupNavigation();
        showCategory(0);

    } catch (error) {
        console.error('CMS Loader Error:', error);
        carousel.innerHTML = '<div class="menu-error"><p>Speisekarte konnte nicht geladen werden.</p><a href="/menu.html" class="btn-view-menu"><span>Zur Speisekarte</span></a></div>';
    }
}

// Build category tabs
function buildCategoryTabs(container) {
    if (!container) return;

    var html = '';
    for (var i = 0; i < allMenuCategories.length; i++) {
        var category = allMenuCategories[i];
        var activeClass = i === 0 ? ' active' : '';
        html += '<button class="category-tab' + activeClass + '" data-index="' + i + '">' + category.title + '</button>';
    }
    container.innerHTML = html;

    // Add click handlers
    var tabs = container.querySelectorAll('.category-tab');
    for (var j = 0; j < tabs.length; j++) {
        tabs[j].addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            showCategory(index);
        });
    }
}

// Build category content
function buildCategoryContent(container) {
    if (!container) return;

    var html = '';
    for (var i = 0; i < allMenuCategories.length; i++) {
        var category = allMenuCategories[i];
        var activeClass = i === 0 ? ' active' : '';

        html += '<div class="category-slide' + activeClass + '" data-index="' + i + '">';
        html += '<div class="category-slide-header">';
        html += '<h3 class="category-slide-title">' + category.title + '</h3>';
        if (category.description) {
            html += '<p class="category-slide-description">' + category.description + '</p>';
        }
        html += '</div>';
        html += '<div class="products-scroll-container">';
        html += '<div class="products-grid">';

        var items = category.items || [];
        for (var j = 0; j < items.length; j++) {
            html += createProductCard(items[j]);
        }

        html += '</div></div></div>';
    }
    container.innerHTML = html;
}

// Create product card HTML
function createProductCard(item) {
    var imgUrl = item.image ? formatImageUrl(item.image) : '';
    var hasImage = imgUrl !== '';

    // Get tags
    var displayTags = [];
    if (item.tags && item.tags.length > 0) {
        for (var i = 0; i < item.tags.length && displayTags.length < 2; i++) {
            var tag = item.tags[i].toLowerCase().trim();
            if (ALLOWED_TAGS.indexOf(tag) !== -1) {
                displayTags.push(TAG_DISPLAY_NAMES[tag] || item.tags[i]);
            }
        }
    }

    var html = '<article class="product-card">';

    if (hasImage) {
        html += '<div class="product-card-image">';
        html += '<img src="' + imgUrl + '" alt="' + (item.name || '') + '" loading="lazy">';
        html += '</div>';
    }

    html += '<div class="product-card-content">';
    html += '<h4 class="product-card-name">' + (item.name || 'Unbekannt') + '</h4>';

    if (item.description) {
        html += '<p class="product-card-description">' + truncateText(item.description, 80) + '</p>';
    }

    if (displayTags.length > 0) {
        html += '<div class="product-card-tags">';
        for (var t = 0; t < displayTags.length; t++) {
            html += '<span class="product-tag">' + displayTags[t] + '</span>';
        }
        html += '</div>';
    }

    html += '</div></article>';
    return html;
}

// Show specific category
function showCategory(index) {
    if (index < 0 || index >= allMenuCategories.length) return;

    currentCategoryIndex = index;

    // Update tabs
    var tabs = document.querySelectorAll('.category-tab');
    for (var i = 0; i < tabs.length; i++) {
        if (i === index) {
            tabs[i].classList.add('active');
        } else {
            tabs[i].classList.remove('active');
        }
    }

    // Scroll active tab into view
    if (tabs[index]) {
        tabs[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Update slides
    var slides = document.querySelectorAll('.category-slide');
    for (var j = 0; j < slides.length; j++) {
        if (j === index) {
            slides[j].classList.add('active');
        } else {
            slides[j].classList.remove('active');
        }
    }

    // Update arrows
    updateArrows();
}

// Setup navigation
function setupNavigation() {
    var leftArrow = document.querySelector('.category-nav-left');
    var rightArrow = document.querySelector('.category-nav-right');
    var carousel = document.getElementById('categoryCarousel');

    if (leftArrow) {
        leftArrow.addEventListener('click', function() {
            if (currentCategoryIndex > 0) {
                showCategory(currentCategoryIndex - 1);
            }
        });
    }

    if (rightArrow) {
        rightArrow.addEventListener('click', function() {
            if (currentCategoryIndex < allMenuCategories.length - 1) {
                showCategory(currentCategoryIndex + 1);
            }
        });
    }

    // Touch swipe support
    if (carousel) {
        var touchStartX = 0;

        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        carousel.addEventListener('touchend', function(e) {
            var touchEndX = e.changedTouches[0].clientX;
            var diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentCategoryIndex < allMenuCategories.length - 1) {
                    showCategory(currentCategoryIndex + 1);
                } else if (diff < 0 && currentCategoryIndex > 0) {
                    showCategory(currentCategoryIndex - 1);
                }
            }
        }, { passive: true });
    }

    updateArrows();
}

// Update arrow visibility
function updateArrows() {
    var leftArrow = document.querySelector('.category-nav-left');
    var rightArrow = document.querySelector('.category-nav-right');

    if (leftArrow) {
        if (currentCategoryIndex === 0) {
            leftArrow.classList.add('hidden');
        } else {
            leftArrow.classList.remove('hidden');
        }
    }

    if (rightArrow) {
        if (currentCategoryIndex === allMenuCategories.length - 1) {
            rightArrow.classList.add('hidden');
        } else {
            rightArrow.classList.remove('hidden');
        }
    }

    // Update swipe indicator
    var indicator = document.querySelector('.swipe-indicator');
    if (indicator) {
        var isLast = currentCategoryIndex === allMenuCategories.length - 1;
        indicator.style.display = isLast ? 'none' : 'flex';
    }
}

// Helper: Format image URL
function formatImageUrl(url) {
    if (!url) return '';
    if (url.indexOf('http') === 0) return url;
    return url.charAt(0) === '/' ? url : '/' + url;
}

// Helper: Truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    // Remove markdown
    var clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength).trim() + '...';
}

// Export for global access
window.cmsLoader = {
    refresh: loadMenuCategories,
    showCategory: showCategory
};
