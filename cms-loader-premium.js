// CMS Loader Premium - Featured Dishes Display
// Elegant random product showcase for homepage

let allMenuCategories = [];

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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('CMS Loader: Initializing featured dishes...');
    loadFeaturedDishes();
});

// Load and display 3 random featured dishes
async function loadFeaturedDishes() {
    try {
        const container = document.getElementById('featuredDishesContainer');
        if (!container) {
            console.warn('CMS Loader: Featured dishes container not found');
            return;
        }

        const response = await fetch('/.netlify/functions/get-menu');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const menuData = await response.json();
        console.log('CMS Loader: Menu data loaded successfully');

        allMenuCategories = menuData;

        // Collect all items with images
        const allItems = [];
        menuData.forEach(category => {
            if (category.items) {
                category.items.forEach(item => {
                    if (item.image) {
                        allItems.push({
                            ...item,
                            category: category.title
                        });
                    }
                });
            }
        });

        // Shuffle and pick 3 random items
        const shuffled = allItems.sort(() => Math.random() - 0.5);
        const featuredItems = shuffled.slice(0, 3);

        // Display the featured dishes
        displayFeaturedDishes(featuredItems, container);

    } catch (error) {
        console.error('CMS Loader: Error loading featured dishes:', error);
        displayFallbackFeatured();
    }
}

// Display featured dishes in elegant cards
function displayFeaturedDishes(items, container) {
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="no-dishes">Speisekarte wird aktualisiert...</p>';
        return;
    }

    const html = `
        <div class="featured-dishes-grid">
            ${items.map(item => createFeaturedCard(item)).join('')}
        </div>
    `;

    container.innerHTML = html;
    console.log('CMS Loader: Featured dishes displayed');
}

// Create elegant featured dish card (without price)
function createFeaturedCard(item) {
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
        <article class="featured-dish-card">
            <div class="featured-dish-image">
                <picture>
                    <source srcset="${webpSrcset}" sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 400px" type="image/webp">
                    <img src="${imgUrl}" alt="${item.name}" loading="lazy" width="400" height="300">
                </picture>
                <div class="featured-dish-overlay"></div>
            </div>
            <div class="featured-dish-content">
                <span class="featured-dish-category">${item.category}</span>
                <h3 class="featured-dish-name">${item.name}</h3>
                <p class="featured-dish-description">${truncateDescription(item.description, 100)}</p>
                ${displayTags.length > 0 ? `
                    <div class="featured-dish-tags">
                        ${displayTags.map(tag => `<span class="featured-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

// Truncate description to specified length
function truncateDescription(text, maxLength) {
    if (!text) return '';
    // Remove markdown formatting
    let clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength).trim() + '...';
}

// Fallback featured dishes
function displayFallbackFeatured() {
    const container = document.getElementById('featuredDishesContainer');
    if (!container) return;

    const fallbackItems = [
        {
            name: 'Açaí Energy Bowl',
            description: 'Açaí, Banane, Beeren, Granola, Kokosflocken - ein kraftvoller Start in den Tag',
            image: '/content/images/acai-bowl.jpg',
            category: 'Power Bowls',
            tags: ['vegetarisch', 'immunstärkend']
        },
        {
            name: 'Avocado Toast Deluxe',
            description: 'Cremige Avocado auf knusprigem Sauerteigbrot mit pochierten Eiern',
            image: '/content/images/avocado-toast.jpg',
            category: 'Avocado Friends',
            tags: ['vegetarisch', 'proteinreich']
        },
        {
            name: 'Golden Turmeric Latte',
            description: 'Kurkuma, Ingwer, schwarzer Pfeffer in cremiger Hafermilch',
            image: '/content/images/turmeric-latte.jpg',
            category: 'Coffee & Tea',
            tags: ['vegetarisch', 'belebend']
        }
    ];

    displayFeaturedDishes(fallbackItems, container);
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

// Export for global access
window.cmsLoader = {
    refresh: function() {
        console.log('CMS Loader: Refreshing featured dishes...');
        loadFeaturedDishes();
    }
};

console.log('CMS Loader: Featured dishes module initialized.');
