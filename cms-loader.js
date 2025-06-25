<!-- Replace the existing script section in index.html (around line 1427-1627) with this: -->

<script>
// CMS Content Loader for Healthy Brunch Club
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        contentPath: '/content',
        refreshInterval: 300000, // 5 minutes
        animationDelay: 100
    };

    // Utility function to fetch JSON data
    async function fetchJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    // Function to create menu item HTML
    function createMenuItemHTML(item) {
        // Skip if item is not available
        if (item.available === false) return '';
        
        return `
            <div class="menu-item">
                <div class="menu-item-header">
                    <span class="menu-item-name">${item.name || ''}</span>
                    ${item.price ? `<span class="menu-item-price">€${item.price}</span>` : ''}
                </div>
                <p class="menu-item-description">${item.description || ''}</p>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="menu-tags">
                        ${item.tags.map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Function to create menu category card
    function createMenuCategoryCard(category) {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        // Filter and create items HTML
        const itemsHtml = category.items
            .map(item => createMenuItemHTML(item))
            .filter(html => html !== '')
            .join('');
        
        card.innerHTML = `
            ${category.image ? `
                <div class="menu-card-image">
                    <img src="${category.image}" alt="${category.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ''}
            <div class="menu-card-content">
                <h3 class="menu-category-title">${category.title}</h3>
                <div class="menu-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
        
        return card;
    }

    // Function to animate cards
    function animateCards(cards) {
        cards.forEach((card, index) => {
            card.style.transition = `all 0.6s ease ${index * 0.1}s`;
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, CONFIG.animationDelay);
        });
    }

    // Function to load and display menu
    async function loadMenu() {
        const menuGrid = document.getElementById('menuGrid');
        if (!menuGrid) return;

        try {
            // Try to fetch from Netlify function first
            const response = await fetch('/.netlify/functions/get-menu');
            
            if (response.ok) {
                const menuData = await response.json();
                
                // Clear existing content
                menuGrid.innerHTML = '';

                // Create and append category cards
                const cards = menuData.map(category => createMenuCategoryCard(category));
                cards.forEach(card => menuGrid.appendChild(card));

                // Animate cards
                animateCards(cards);
                
                return;
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback data');
        }

        // Fallback data if Netlify function fails
        const menuData = [
            {
                title: "morning rituals",
                order: 1,
                items: [
                    {
                        name: "warmes wasser mit bio-zitrone",
                        description: "der perfekte start für deine verdauung",
                        tags: ["detox", "vegan"],
                        available: true
                    },
                    {
                        name: "golden milk latte",
                        description: "kurkuma, ingwer, zimt & hafermilch",
                        tags: ["anti-inflammatory", "lactosefrei"],
                        available: true
                    },
                    {
                        name: "matcha zeremonie",
                        description: "ceremonial grade matcha, aufgeschäumt",
                        tags: ["energy", "antioxidants"],
                        available: true
                    }
                ]
            },
            {
                title: "power bowls",
                order: 2,
                items: [
                    {
                        name: "açaí sunrise bowl",
                        description: "açaí, banane, beeren, granola, kokosflocken",
                        tags: ["superfood", "vegan"],
                        available: true
                    },
                    {
                        name: "premium porridge",
                        description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                        tags: ["glutenfrei", "protein"],
                        available: true
                    },
                    {
                        name: "buddha bowl deluxe",
                        description: "quinoa, hummus, grillgemüse, tahini-dressing",
                        tags: ["protein-rich", "vegan"],
                        available: true
                    }
                ]
            }
        ];

        // Sort categories by order
        menuData.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Clear existing content
        menuGrid.innerHTML = '';

        // Create and append category cards
        const cards = menuData.map(category => createMenuCategoryCard(category));
        cards.forEach(card => menuGrid.appendChild(card));

        // Animate cards
        animateCards(cards);
    }

    // Function to format event date
    function formatEventDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-AT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Function to load and display events
    async function loadEvents() {
        const eventWindow = document.getElementById('eventWindow');
        const eventContent = document.getElementById('eventContent');
        
        if (!eventWindow || !eventContent) return;

        try {
            // Try to fetch from Netlify function first
            const response = await fetch('/.netlify/functions/get-events');
            
            if (response.ok) {
                const eventsData = await response.json();
                
                if (eventsData && eventsData.length > 0) {
                    const event = eventsData[0];
                    
                    eventContent.innerHTML = `
                        <div class="event-header">
                            ${event.image ? `
                                <div class="event-image">
                                    <img src="${event.image}" alt="${event.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                                </div>
                            ` : ''}
                            <h3>${event.title}</h3>
                            <p>${event.artist || ''}</p>
                        </div>
                        <div class="event-details">
                            <strong>📅 ${formatEventDate(event.date)}, ${event.startTime || '9:00 Uhr'}</strong>
                            ${event.description}
                            
                            ${event.musicStyle ? `
                                <strong>🎵 musik-stil:</strong>
                                ${event.musicStyle}
                            ` : ''}
                        </div>
                        ${event.audioPreview ? `
                            <div class="audio-player">
                                <h4>hör rein in den sound:</h4>
                                <audio controls>
                                    <source src="${event.audioPreview}" type="audio/mpeg">
                                    dein browser unterstützt kein audio.
                                </audio>
                            </div>
                        ` : ''}
                    `;
                    
                    eventWindow.style.display = 'block';
                    return;
                }
            }
        } catch (error) {
            console.log('Netlify function not available, using fallback event');
        }

        // Fallback event
        const event = {
            title: "next monday special",
            artist: "dj cosmic kitchen",
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            description: "erlebe entspannte lounge-klänge während deines brunches mit unserem special guest dj cosmic kitchen!",
            musicStyle: "downtempo, organic house, world fusion",
            startTime: "9:00 uhr"
        };
        
        eventContent.innerHTML = `
            <div class="event-header">
                <h3>${event.title}</h3>
                <p>${event.artist}</p>
            </div>
            <div class="event-details">
                <strong>📅 ${formatEventDate(event.date)}, ${event.startTime}</strong>
                ${event.description}
                
                <strong>🎵 musik-stil:</strong>
                ${event.musicStyle}
            </div>
        `;
        
        eventWindow.style.display = 'block';
    }

    // Function to initialize content loading
    function initializeContent() {
        // Load content immediately
        loadMenu();
        loadEvents();

        // Set up periodic refresh
        setInterval(() => {
            loadMenu();
            loadEvents();
        }, CONFIG.refreshInterval);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeContent);
    } else {
        initializeContent();
    }

    // Expose functions globally if needed for debugging
    window.cmsLoader = {
        loadMenu,
        loadEvents,
        refresh: initializeContent
    };

})();

// Add additional styles for menu card images
const menuImageStyles = document.createElement('style');
menuImageStyles.textContent = `
    .menu-card {
        overflow: hidden;
    }
    
    .menu-card-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        margin: -30px -30px 20px -30px;
        position: relative;
    }
    
    .menu-card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }
    
    .menu-card:hover .menu-card-image img {
        transform: scale(1.05);
    }
    
    .menu-item-price {
        font-weight: 600;
        color: var(--sage-green);
        font-size: 16px;
        white-space: nowrap;
        margin-left: 10px;
    }
    
    .event-image {
        width: 100%;
        height: 150px;
        overflow: hidden;
        border-radius: 10px;
        margin-bottom: 15px;
    }
    
    .event-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;
document.head.appendChild(menuImageStyles);

// Integration with existing code
document.addEventListener('DOMContentLoaded', function() {
    // Your existing initialization code remains here
    
    // The CMS loader will automatically handle menu and event loading
    console.log('CMS Integration loaded. Use window.cmsLoader.refresh() to manually refresh content.');
});
</script>
