// CMS Content Loader for Healthy Brunch Club
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        menuAPI: '/.netlify/functions/get-menu',
        eventsAPI: '/.netlify/functions/get-events',
        refreshInterval: 300000, // 5 minutes
        animationDelay: 100
    };

    // Check if running locally (without Netlify Dev)
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '';
    
    // If running locally without Netlify Dev, always use fallback data
    const useOnlyFallback = isLocalhost && !window.location.port.includes('8888');

    // Fallback Menü-Daten (falls CMS nicht verfügbar)
    const FALLBACK_MENU_DATA = [
        {
            title: "morning rituals",
            icon: "🌅",
            order: 1,
            items: [
                {
                    name: "warmes wasser mit bio-zitrone",
                    description: "der perfekte start für deine verdauung",
                    tags: ["detox", "vegan"]
                },
                {
                    name: "golden milk latte",
                    description: "kurkuma, ingwer, zimt & hafermilch",
                    tags: ["anti-inflammatory", "lactosefrei"]
                },
                {
                    name: "matcha zeremonie",
                    description: "ceremonial grade matcha, aufgeschäumt",
                    tags: ["energy", "antioxidants"]
                }
            ]
        },
        {
            title: "power bowls",
            icon: "🥣",
            order: 2,
            items: [
                {
                    name: "açaí sunrise bowl",
                    description: "açaí, banane, beeren, granola, kokosflocken",
                    tags: ["superfood", "vegan"]
                },
                {
                    name: "premium porridge",
                    description: "haferflocken, chia, hanfsamen, heidelbeeren, mandeln",
                    tags: ["glutenfrei", "protein"]
                },
                {
                    name: "buddha bowl deluxe",
                    description: "quinoa, hummus, grillgemüse, tahini-dressing",
                    tags: ["protein-rich", "vegan"]
                }
            ]
        },
        {
            title: "egg creations",
            icon: "🥚",
            order: 3,
            items: [
                {
                    name: "shakshuka wien style",
                    description: "pochierte eier in würziger tomatensauce, feta, kräuter",
                    tags: ["vegetarisch", "spicy"]
                },
                {
                    name: "eggs benedict deluxe",
                    description: "sauerteigbrot, pochierte eier, avocado-hollandaise",
                    tags: ["signature"]
                },
                {
                    name: "farmers omelette",
                    description: "bio-eier, saisongemüse, bergkäse, kräuter",
                    tags: ["protein", "glutenfrei"]
                }
            ]
        },
        {
            title: "avocado love",
            icon: "🥑",
            order: 4,
            items: [
                {
                    name: "rainbow avocado toast",
                    description: "vollkornbrot, avocado, radieschen, sprossen, dukkah",
                    tags: ["instagram-worthy", "vegan"]
                },
                {
                    name: "guacamole bowl",
                    description: "hausgemachte guacamole, tortilla chips, gemüsesticks",
                    tags: ["sharing", "glutenfrei"]
                },
                {
                    name: "avo & egg smash",
                    description: "zerdrückte avocado, pochiertes ei, chili, lime",
                    tags: ["bestseller"]
                }
            ]
        },
        {
            title: "pancakes & more",
            icon: "🥞",
            order: 5,
            items: [
                {
                    name: "fluffy protein pancakes",
                    description: "hafermehl, banane, ahornsirup, beeren",
                    tags: ["protein", "glutenfrei"]
                },
                {
                    name: "french toast supreme",
                    description: "brioche, vanille, zimt, kompott",
                    tags: ["comfort food"]
                },
                {
                    name: "belgian waffles",
                    description: "knusprige waffeln, nutella, früchte",
                    tags: ["sweet treat"]
                }
            ]
        },
        {
            title: "hot beverages",
            icon: "☕",
            order: 6,
            items: [
                {
                    name: "specialty coffee",
                    description: "single origin, lokal geröstet",
                    tags: ["fair trade"]
                },
                {
                    name: "chai latte hausgemacht",
                    description: "gewürze, schwarztee, pflanzenmilch",
                    tags: ["warming"]
                },
                {
                    name: "hot chocolate deluxe",
                    description: "belgische schokolade, marshmallows",
                    tags: ["comfort"]
                }
            ]
        }
    ];

    // Fallback Event-Daten
    const FALLBACK_EVENT_DATA = [
        {
            title: "next monday special",
            artist: "dj cosmic kitchen",
            date: "2025-01-27T09:00:00+01:00",
            description: "erlebe entspannte lounge-klänge während deines brunches mit unserem special guest dj cosmic kitchen!",
            musicStyle: "downtempo, organic house, world fusion",
            startTime: "9:00 uhr",
            audioPreview: "/content/audio/dj-preview.mp3",
            active: true
        }
    ];

    // Function to create menu item HTML
    function createMenuItemHTML(item) {
        return `
            <div class="menu-item">
                <div class="menu-item-header">
                    <span class="menu-item-name">${item.name || ''}</span>
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
        
        card.innerHTML = `
            <h3 class="menu-category-title">${category.title} ${category.icon || ''}</h3>
            <div class="menu-items">
                ${category.items && category.items.length > 0 
                    ? category.items.map(item => createMenuItemHTML(item)).join('')
                    : '<p style="color: #999; font-style: italic;">Keine Einträge vorhanden</p>'
                }
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

        let menuData = FALLBACK_MENU_DATA;

        // If running locally without Netlify Dev, skip API call
        if (useOnlyFallback) {
            console.log('Lokale Entwicklung erkannt - verwende Fallback-Daten');
        } else {
            try {
                console.log('Versuche Menü von CMS zu laden...');
                
                // Versuche vom CMS zu laden
                const response = await fetch(CONFIG.menuAPI);

                if (response.ok) {
                    const cmsData = await response.json();
                    console.log('Menü erfolgreich vom CMS geladen:', cmsData);
                    
                    // Use CMS data if available and not empty
                    if (cmsData && cmsData.length > 0) {
                        menuData = cmsData;
                    } else {
                        console.log('CMS Menü ist leer, verwende Fallback-Daten');
                    }
                } else {
                    throw new Error(`CMS nicht verfügbar: ${response.status}`);
                }

            } catch (error) {
                console.log('CMS nicht verfügbar, verwende lokale Fallback-Daten:', error.message);
                
                // Cache Fallback-Daten für spätere Verwendung
                try {
                    localStorage.setItem('menuCache', JSON.stringify(menuData));
                } catch (e) {
                    console.warn('Konnte Menü nicht im Local Storage cachen:', e);
                }
            }
        }

        displayMenuData(menuGrid, menuData);
    }

    // Helper function to display menu data
    function displayMenuData(menuGrid, menuData) {
        // Sort categories by order
        menuData.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Clear existing content
        menuGrid.innerHTML = '';

        // Create and append category cards
        const cards = menuData.map(category => createMenuCategoryCard(category));
        cards.forEach(card => menuGrid.appendChild(card));

        // Animate cards
        animateCards(cards);

        console.log(`${menuData.length} Menü-Kategorien erfolgreich angezeigt`);
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
        if (!eventWindow) {
            console.log('Event Window nicht gefunden, erstelle es...');
            createEventWindow();
            return;
        }

        const eventContent = document.getElementById('eventContent');
        if (!eventContent) return;

        let eventsData = FALLBACK_EVENT_DATA;

        // If running locally without Netlify Dev, skip API call
        if (useOnlyFallback) {
            console.log('Lokale Entwicklung erkannt - verwende Fallback-Events');
        } else {
            try {
                console.log('Versuche Events von CMS zu laden...');
                
                const response = await fetch(CONFIG.eventsAPI);

                if (response.ok) {
                    const cmsData = await response.json();
                    console.log('Events erfolgreich vom CMS geladen:', cmsData);
                    
                    // Use CMS data if available and not empty
                    if (cmsData && cmsData.length > 0) {
                        eventsData = cmsData;
                    } else {
                        console.log('Keine Events im CMS, verwende Fallback-Daten');
                    }
                } else {
                    throw new Error(`CMS nicht verfügbar: ${response.status}`);
                }

            } catch (error) {
                console.log('CMS nicht verfügbar, verwende lokale Fallback-Events:', error.message);
            }
        }

        // Get the first active event
        const activeEvents = eventsData.filter(event => event.active);
        
        if (activeEvents.length > 0) {
            const event = activeEvents[0];
            
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
        } else {
            eventWindow.style.display = 'none';
        }
    }

    // Function to create event window if it doesn't exist
    function createEventWindow() {
        const eventWindow = document.createElement('div');
        eventWindow.id = 'eventWindow';
        eventWindow.className = 'event-window';
        eventWindow.innerHTML = `
            <button class="event-toggle" onclick="toggleEventWindow()">
                <span id="toggleIcon">−</span>
            </button>
            <div class="event-content" id="eventContent">
                <!-- Content will be loaded here -->
            </div>
        `;
        document.body.appendChild(eventWindow);
    }

    // Function to check if CMS is available
    async function checkCMSStatus() {
        try {
            const response = await fetch('/.netlify/functions/get-menu', { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Function to initialize content loading
    async function initializeContent() {
        console.log('Initialisiere CMS Content Loader...');
        
        if (useOnlyFallback) {
            console.log('Lokale Entwicklung ohne Netlify Dev - verwende nur Fallback-Daten');
        } else {
            // Check CMS availability
            const cmsAvailable = await checkCMSStatus();
            console.log('CMS verfügbar:', cmsAvailable);
        }

        // Load content immediately
        await loadMenu();
        await loadEvents();

        // Set up periodic refresh only if CMS is available and not in local mode
        if (!useOnlyFallback) {
            console.log('Setze periodische Aktualisierung ein (alle 5 Minuten)');
            setInterval(() => {
                loadMenu();
                loadEvents();
            }, CONFIG.refreshInterval);
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeContent);
    } else {
        initializeContent();
    }

    // Expose functions globally for debugging
    window.cmsLoader = {
        loadMenu,
        loadEvents,
        refresh: initializeContent,
        useFallback: () => {
            displayMenuData(document.getElementById('menuGrid'), FALLBACK_MENU_DATA);
        },
        checkStatus: checkCMSStatus
    };

})();
