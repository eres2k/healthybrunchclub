// cms-loader.js - Updated version that connects to Netlify Functions
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        menuAPI: '/.netlify/functions/get-menu',
        eventsAPI: '/.netlify/functions/get-events',
        refreshInterval: 300000, // 5 minutes
        animationDelay: 100
    };

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

        try {
            console.log('Loading menu from:', CONFIG.menuAPI);
            
            const response = await fetch(CONFIG.menuAPI);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const menuData = await response.json();
            console.log('Menu data loaded:', menuData);

            if (!menuData || menuData.length === 0) {
                menuGrid.innerHTML = `
                    <div class="no-menu-message">
                        <p>Keine Menüeinträge gefunden.</p>
                        <p style="font-size: 14px; margin-top: 10px;">Bitte fügen Sie Einträge über das <a href="/admin">Admin-Panel</a> hinzu.</p>
                    </div>
                `;
                return;
            }

            // Sort categories by order
            menuData.sort((a, b) => (a.order || 0) - (b.order || 0));

            // Clear existing content
            menuGrid.innerHTML = '';

            // Create and append category cards
            const cards = menuData.map(category => createMenuCategoryCard(category));
            cards.forEach(card => menuGrid.appendChild(card));

            // Animate cards
            animateCards(cards);

        } catch (error) {
            console.error('Error loading menu:', error);
            
            // Try to load from local storage as fallback
            const cachedMenu = localStorage.getItem('menuCache');
            if (cachedMenu) {
                console.log('Loading menu from cache');
                const menuData = JSON.parse(cachedMenu);
                displayMenuData(menuGrid, menuData);
            } else {
                menuGrid.innerHTML = `
                    <div class="no-menu-message">
                        <p>Menü konnte nicht geladen werden.</p>
                        <p style="font-size: 14px; margin-top: 10px;">Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.</p>
                    </div>
                `;
            }
        }
    }

    // Helper function to display menu data
    function displayMenuData(menuGrid, menuData) {
        menuData.sort((a, b) => (a.order || 0) - (b.order || 0));
        menuGrid.innerHTML = '';
        const cards = menuData.map(category => createMenuCategoryCard(category));
        cards.forEach(card => menuGrid.appendChild(card));
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
            console.log('Loading events from:', CONFIG.eventsAPI);
            
            const response = await fetch(CONFIG.eventsAPI);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const eventsData = await response.json();
            console.log('Events data loaded:', eventsData);

            if (!eventsData || eventsData.length === 0) {
                eventWindow.style.display = 'none';
                return;
            }

            // Get the first active event
            const event = eventsData[0];
            
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

        } catch (error) {
            console.error('Error loading events:', error);
            eventWindow.style.display = 'none';
        }
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

    // Expose functions globally for debugging
    window.cmsLoader = {
        loadMenu,
        loadEvents,
        refresh: initializeContent
    };

})();