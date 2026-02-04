// CMS Loader Premium - Category Carousel Display
// Swipeable category showcase for homepage

let allMenuCategories = [];
let currentCategoryIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let touchStartedInProducts = false;

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
    console.log('CMS Loader: Initializing category carousel...');
    loadMenuCategories();
});

// Load menu categories from CMS
async function loadMenuCategories() {
    const carousel = document.getElementById('categoryCarousel');

    try {
        const response = await fetch('/.netlify/functions/get-menu');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const menuData = await response.json();
        console.log('CMS Loader: Menu data loaded successfully');

        // Filter categories that have items with images
        allMenuCategories = menuData.filter(category =>
            category.items && category.items.some(item => item.image)
        );

        if (allMenuCategories.length === 0) {
            console.warn('CMS Loader: No categories with images found');
            // Show all categories even without images as fallback
            allMenuCategories = menuData.filter(category => category.items && category.items.length > 0);
        }

        if (allMenuCategories.length === 0) {
            if (carousel) {
                carousel.innerHTML = '<p class="menu-error">Speisekarte wird aktualisiert...</p>';
            }
            return;
        }

        // Initialize the carousel
        createCategoryTabs();
        createCategorySlides();
        initializeCarouselNavigation();
        initializeScrollDetection();
        updateSwipeIndicator();

    } catch (error) {
        console.error('CMS Loader: Error loading menu:', error);
        // Show error state
        if (carousel) {
            carousel.innerHTML = `
                <div class="menu-error">
                    <p>Speisekarte konnte nicht geladen werden.</p>
                    <a href="/menu.html" class="btn-view-menu" style="margin-top: 1rem;">
                        <span>Zur Speisekarte</span>
                    </a>
                </div>
            `;
        }
    }
}

// Create category tabs
function createCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = allMenuCategories.map((category, index) => `
        <button class="category-tab ${index === 0 ? 'active' : ''}"
                data-index="${index}"
                aria-selected="${index === 0}">
            ${category.title}
        </button>
    `).join('');

    // Add click handlers to tabs
    tabsContainer.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const index = parseInt(tab.dataset.index);
            goToCategory(index);
        });
    });
}

// Create category slides with products
function createCategorySlides() {
    const carousel = document.getElementById('categoryCarousel');
    if (!carousel) return;

    carousel.innerHTML = allMenuCategories.map((category, index) => `
        <div class="category-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="category-slide-header">
                <h3 class="category-slide-title">${category.title}</h3>
                ${category.description ? `<p class="category-slide-description">${category.description}</p>` : ''}
            </div>
            <div class="products-scroll-container">
                <div class="products-grid">
                    ${category.items
                        .filter(item => item.image)
                        .map(item => createProductCard(item))
                        .join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Create product card (without price)
function createProductCard(item) {
    const imgUrl = formatImageUrl(item.image);
    const webpSrcset = getWebPSrcset(item.image);

    // Get up to 2 tags to display
    const displayTags = item.tags
        ? item.tags
            .filter(tag => ALLOWED_TAGS.includes(tag.toLowerCase().trim()))
            .slice(0, 2)
            .map(tag => TAG_DISPLAY_NAMES[tag.toLowerCase().trim()] || tag)
        : [];

    return `
        <article class="product-card">
            <div class="product-card-image">
                <picture>
                    <source srcset="${webpSrcset}" sizes="(max-width: 480px) 280px, 300px" type="image/webp">
                    <img src="${imgUrl}" alt="${item.name}" loading="lazy" width="300" height="200">
                </picture>
            </div>
            <div class="product-card-content">
                <h4 class="product-card-name">${item.name}</h4>
                <p class="product-card-description">${truncateDescription(item.description, 80)}</p>
                ${displayTags.length > 0 ? `
                    <div class="product-card-tags">
                        ${displayTags.map(tag => `<span class="product-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

// Initialize carousel navigation
function initializeCarouselNavigation() {
    const carousel = document.getElementById('categoryCarousel');
    const leftArrow = document.querySelector('.category-nav-left');
    const rightArrow = document.querySelector('.category-nav-right');

    // Arrow navigation
    if (leftArrow) {
        leftArrow.addEventListener('click', () => navigateCategory(-1));
    }
    if (rightArrow) {
        rightArrow.addEventListener('click', () => navigateCategory(1));
    }

    // Touch/swipe support
    if (carousel) {
        carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
        carousel.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const menuSection = document.getElementById('menu');
        if (!menuSection) return;

        const rect = menuSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;

        if (isInView) {
            if (e.key === 'ArrowLeft') {
                navigateCategory(-1);
            } else if (e.key === 'ArrowRight') {
                navigateCategory(1);
            }
        }
    });

    updateArrowVisibility();
}

// Navigate to next/previous category
function navigateCategory(direction) {
    const newIndex = currentCategoryIndex + direction;
    if (newIndex >= 0 && newIndex < allMenuCategories.length) {
        goToCategory(newIndex);
    }
}

// Go to specific category
function goToCategory(index) {
    if (index < 0 || index >= allMenuCategories.length) return;

    currentCategoryIndex = index;

    // Update tabs
    document.querySelectorAll('.category-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        tab.setAttribute('aria-selected', i === index);
    });

    // Scroll active tab into view
    const activeTab = document.querySelector('.category-tab.active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Update slides
    document.querySelectorAll('.category-slide').forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    updateArrowVisibility();
    updateSwipeIndicator();
}

// Update arrow visibility based on current position
function updateArrowVisibility() {
    const leftArrow = document.querySelector('.category-nav-left');
    const rightArrow = document.querySelector('.category-nav-right');

    if (leftArrow) {
        leftArrow.classList.toggle('hidden', currentCategoryIndex === 0);
    }
    if (rightArrow) {
        rightArrow.classList.toggle('hidden', currentCategoryIndex === allMenuCategories.length - 1);
    }
}

// Update swipe indicator visibility
function updateSwipeIndicator() {
    const indicator = document.querySelector('.swipe-indicator');
    if (indicator) {
        // Hide indicator if on last category or on desktop
        const isLastCategory = currentCategoryIndex === allMenuCategories.length - 1;
        const isMobile = window.innerWidth <= 768;
        indicator.style.display = (isMobile && !isLastCategory) ? 'flex' : 'none';
    }
}

// Initialize scroll detection for auto-category-switch
function initializeScrollDetection() {
    let scrollTimeout = null;
    let hasTriggeredSwitch = false;

    document.querySelectorAll('.products-scroll-container').forEach((container, index) => {
        container.addEventListener('scroll', () => {
            // Clear previous timeout
            if (scrollTimeout) clearTimeout(scrollTimeout);

            // Wait for scroll to stop
            scrollTimeout = setTimeout(() => {
                // Only check if this is the active category
                if (index !== currentCategoryIndex) return;

                const scrollLeft = container.scrollLeft;
                const scrollWidth = container.scrollWidth;
                const clientWidth = container.clientWidth;
                const scrollRight = scrollWidth - scrollLeft - clientWidth;

                // Check if at the end (with 20px threshold)
                if (scrollRight < 20 && !hasTriggeredSwitch) {
                    if (currentCategoryIndex < allMenuCategories.length - 1) {
                        hasTriggeredSwitch = true;
                        goToCategory(currentCategoryIndex + 1);
                        // Reset scroll position of new category
                        setTimeout(() => {
                            const newContainer = document.querySelectorAll('.products-scroll-container')[currentCategoryIndex];
                            if (newContainer) newContainer.scrollLeft = 0;
                            hasTriggeredSwitch = false;
                        }, 100);
                    }
                }
                // Check if at the beginning (scrolled back)
                else if (scrollLeft < 20 && !hasTriggeredSwitch) {
                    if (currentCategoryIndex > 0) {
                        hasTriggeredSwitch = true;
                        goToCategory(currentCategoryIndex - 1);
                        // Scroll to end of previous category
                        setTimeout(() => {
                            const newContainer = document.querySelectorAll('.products-scroll-container')[currentCategoryIndex];
                            if (newContainer) {
                                newContainer.scrollLeft = newContainer.scrollWidth;
                            }
                            hasTriggeredSwitch = false;
                        }, 100);
                    }
                }
            }, 150);
        }, { passive: true });
    });
}

// Touch handlers for swipe
function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    // Check if touch started inside the products scroll area
    touchStartedInProducts = e.target.closest('.products-scroll-container') !== null;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    // Don't trigger category swipe if user was scrolling products
    if (touchStartedInProducts) {
        touchStartedInProducts = false;
        return;
    }

    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - go to next category
            navigateCategory(1);
        } else {
            // Swipe right - go to previous category
            navigateCategory(-1);
        }
    }
}

// Truncate description
function truncateDescription(text, maxLength) {
    if (!text) return '';
    let clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength).trim() + '...';
}

// Format Image URL
function formatImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? url : `/${url}`;
}

// Get responsive srcset for WebP images
function getWebPSrcset(url) {
    if (!url) return '';
    const formatted = formatImageUrl(url);
    const basePath = formatted.replace(/\.(jpg|jpeg|png)$/i, '');
    const ext = 'webp';
    return `${basePath}-400w.${ext} 400w, ${basePath}-800w.${ext} 800w, ${basePath}.${ext} 1200w`;
}

// Handle window resize
window.addEventListener('resize', () => {
    updateSwipeIndicator();
});

// Export for global access
window.cmsLoader = {
    refresh: function() {
        console.log('CMS Loader: Refreshing categories...');
        loadMenuCategories();
    },
    goToCategory: goToCategory,
    getCurrentCategory: () => currentCategoryIndex
};

console.log('CMS Loader: Category carousel module initialized.');
