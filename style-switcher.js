// style-switcher.js - Fixed Style Switcher with Better Loading
(function() {
    'use strict';
    
    // Style configurations
    const STYLES = {
        MINIMALIST: 'minimalist',
        PREMIUM: 'premium'
    };
    
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };
    
    // Storage keys
    const STORAGE_KEYS = {
        STYLE: 'hbc-style-preference',
        THEME: 'hbc-theme-preference'
    };
    
    class StyleSwitcher {
        constructor() {
            // Default to premium light (elegant light)
            this.currentStyle = this.getStoredStyle() || STYLES.PREMIUM;
            this.currentTheme = this.getStoredTheme() || THEMES.LIGHT;
            this.dropdown = null;
            this.isInitialized = false;
            this.menuData = null; // Store menu data to prevent reloading
            this.init();
        }
        
        init() {
            console.log('StyleSwitcher: Initializing with style:', this.currentStyle, 'theme:', this.currentTheme);
            
            // Apply stored preferences immediately
            this.applyInitialStyles();
            
            // Create UI after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.createUI();
                    this.isInitialized = true;
                    this.captureMenuData();
                });
            } else {
                this.createUI();
                this.isInitialized = true;
                this.captureMenuData();
            }
            
            // Listen for system theme changes
            this.listenForSystemThemeChanges();
        }
        
        captureMenuData() {
            // Capture menu data when available to prevent reloading
            if (window.allMenuCategories) {
                this.menuData = window.allMenuCategories;
            }
            
            // Listen for menu data loading
            const checkMenuData = setInterval(() => {
                if (window.allMenuCategories && window.allMenuCategories.length > 0) {
                    this.menuData = window.allMenuCategories;
                    clearInterval(checkMenuData);
                }
            }, 100);
            
            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkMenuData), 10000);
        }
        
        applyInitialStyles() {
            // Apply theme
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            
            // Apply style class
            document.body.classList.add(`style-${this.currentStyle}`);
            
            // Don't load minimalist styles on initial load if premium is selected
            if (this.currentStyle === STYLES.MINIMALIST) {
                this.loadMinimalistStylesheet();
            }
        }
        
        createUI() {
            console.log('StyleSwitcher: Creating UI');
            
            // Remove any existing switcher
            const existing = document.querySelector('.style-switcher');
            if (existing) existing.remove();
            
            // Create switcher container
            const switcher = document.createElement('div');
            switcher.className = 'style-switcher style-switcher-top';
            
            // Create dropdown
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'style-dropdown';
            this.dropdown.innerHTML = `
                <button class="style-dropdown-toggle" aria-label="Style Switcher">
                    <i class="fas fa-palette"></i>
                    <span>${this.getDisplayName()}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="style-dropdown-menu">
                    <button class="style-option ${this.currentStyle === STYLES.PREMIUM ? 'active' : ''}" 
                            data-style="${STYLES.PREMIUM}">
                        <i class="fas fa-crown"></i>
                        <span>Elegant</span>
                    </button>
                    <button class="style-option ${this.currentStyle === STYLES.MINIMALIST ? 'active' : ''}" 
                            data-style="${STYLES.MINIMALIST}">
                        <i class="fas fa-leaf"></i>
                        <span>Minimalist</span>
                    </button>
                    <div class="style-divider"></div>
                    <button class="style-option theme-toggle" data-theme="toggle">
                        <i class="fas ${this.currentTheme === THEMES.DARK ? 'fa-sun' : 'fa-moon'}"></i>
                        <span>${this.currentTheme === THEMES.DARK ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>
            `;
            
            switcher.appendChild(this.dropdown);
            
            // Insert after navigation
            const nav = document.querySelector('.nav-premium');
            if (nav) {
                nav.parentNode.insertBefore(switcher, nav.nextSibling);
            } else {
                document.body.insertBefore(switcher, document.body.firstChild);
            }
            
            // Add event listeners
            this.attachEventListeners();
        }
        
        attachEventListeners() {
            const toggle = this.dropdown.querySelector('.style-dropdown-toggle');
            const menu = this.dropdown.querySelector('.style-dropdown-menu');
            
            // Toggle dropdown
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                this.dropdown.classList.remove('active');
            });
            
            // Prevent closing when clicking inside menu
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Style options
            const styleOptions = this.dropdown.querySelectorAll('.style-option[data-style]');
            styleOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const newStyle = e.currentTarget.dataset.style;
                    if (newStyle !== this.currentStyle) {
                        this.switchStyle(newStyle);
                    }
                    this.dropdown.classList.remove('active');
                });
            });
            
            // Theme toggle
            const themeToggle = this.dropdown.querySelector('.theme-toggle');
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
                this.dropdown.classList.remove('active');
            });
        }
        
        switchStyle(newStyle) {
            if (!Object.values(STYLES).includes(newStyle)) return;
            
            console.log('StyleSwitcher: Switching to style:', newStyle);
            
            // Show loading state
            document.body.classList.add('switching-styles');
            
            this.currentStyle = newStyle;
            this.saveStylePreference(newStyle);
            this.applyStyle(newStyle);
            this.updateUI();
            
            // Remove loading state
            setTimeout(() => {
                document.body.classList.remove('switching-styles');
            }, 300);
        }
        
        applyStyle(style) {
            console.log('StyleSwitcher: Applying style:', style);
            
            // Update body class
            document.body.classList.remove('style-minimalist', 'style-premium');
            document.body.classList.add(`style-${style}`);
            
            if (style === STYLES.MINIMALIST) {
                this.switchToMinimalist();
            } else {
                this.switchToPremium();
            }
        }
        
        switchToMinimalist() {
            console.log('StyleSwitcher: Switching to minimalist');
            
            // Add minimalist stylesheet if not present
            this.loadMinimalistStylesheet();
            
            // Hide premium-specific elements
            document.querySelectorAll('.hero-premium, .philosophy-section, .about-premium, .reservation-premium').forEach(el => {
                el.style.display = 'none';
            });
            
            // Use stored menu data or get from premium loader
            if (this.menuData || window.allMenuCategories) {
                const data = this.menuData || window.allMenuCategories;
                this.displayMinimalistMenu(data);
            }
        }
        
        switchToPremium() {
            console.log('StyleSwitcher: Switching to premium');
            
            // Remove minimalist stylesheet
            const minimalistLink = document.querySelector('link[href*="mystyle-minimalist.css"]');
            if (minimalistLink) {
                minimalistLink.remove();
            }
            
            // Show premium elements
            document.querySelectorAll('.hero-premium, .philosophy-section, .about-premium, .reservation-premium').forEach(el => {
                el.style.display = '';
            });
            
            // Restore premium menu display
            if (this.menuData || window.allMenuCategories) {
                const data = this.menuData || window.allMenuCategories;
                if (window.cmsLoader && window.cmsLoader.displayPremiumMenu) {
                    window.cmsLoader.displayPremiumMenu(data);
                }
            }
        }
        
        loadMinimalistStylesheet() {
            if (!document.querySelector('link[href*="mystyle-minimalist.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'mystyle-minimalist.css';
                document.head.appendChild(link);
            }
        }
        
        displayMinimalistMenu(menuData) {
            // Import minimalist display function inline to avoid loading issues
            const container = document.getElementById('menuContainer');
            if (!container || !menuData) return;
            
            let menuHTML = '';
            menuData.forEach((category) => {
                const spacedTitle = category.title.toUpperCase().split('').join(' ');
                
                menuHTML += `
                    <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                        <div class="category-header">
                            <h3 class="category-name">${spacedTitle}</h3>
                            ${category.description ? `<p class="category-description">${category.description.toLowerCase()}</p>` : ''}
                        </div>
                        <div class="menu-grid">
                            ${category.items ? category.items.map(item => this.createMinimalistItem(item)).join('') : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = menuHTML + `
                <div class="pdf-footer-note">
                    die angegebenen nährwerte sind durchschnittswerte und dienen lediglich zur orientierung
                </div>
            `;
        }
        
        createMinimalistItem(item) {
            const formatPrice = (price) => {
                if (!price) return '';
                let cleanPrice = String(price).replace(/[€$£¥\s]/g, '').replace(/,/g, '.');
                const numPrice = parseFloat(cleanPrice);
                if (isNaN(numPrice)) return price;
                let formatted = numPrice.toFixed(2);
                if (formatted.endsWith('.00')) formatted = formatted.slice(0, -3);
                return formatted;
            };
            
            let nutritionBadges = '';
            if (item.nutrition) {
                if (item.nutrition.calories) {
                    const calories = item.nutrition.calories.replace(/[^0-9]/g, '');
                    nutritionBadges += `<div class="nutrition-badge"><span class="nutrition-value">${calories}</span><span class="nutrition-label">kcal</span></div>`;
                }
                if (item.nutrition.protein) {
                    const protein = item.nutrition.protein.replace(/[^0-9,\.]/g, '');
                    nutritionBadges += `<div class="nutrition-badge"><span class="nutrition-value">${protein} g</span><span class="nutrition-label">protein</span></div>`;
                }
                if (item.nutrition.carbs) {
                    const carbs = item.nutrition.carbs.replace(/[^0-9,\.]/g, '');
                    nutritionBadges += `<div class="nutrition-badge"><span class="nutrition-value">${carbs} g</span><span class="nutrition-label">carbs</span></div>`;
                }
                if (item.nutrition.fat) {
                    const fat = item.nutrition.fat.replace(/[^0-9,\.]/g, '');
                    nutritionBadges += `<div class="nutrition-badge"><span class="nutrition-value">${fat} g</span><span class="nutrition-label">fett</span></div>`;
                }
            }
            
            return `
                <div class="menu-item-card">
                    <div class="menu-item-header">
                        <h4 class="menu-item-name">${item.name.toLowerCase()}</h4>
                        ${item.price ? `<span class="menu-item-price">${formatPrice(item.price)}</span>` : ''}
                    </div>
                    <div class="menu-item-description">${item.description ? item.description.toLowerCase() : ''}</div>
                    ${nutritionBadges ? `<div class="menu-item-nutrition">${nutritionBadges}</div>` : ''}
                    ${item.allergens && item.allergens.length > 0 ? `<div class="menu-item-allergens">(${item.allergens.join(',')})</div>` : ''}
                </div>
            `;
        }
        
        toggleTheme() {
            const newTheme = this.currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
            this.currentTheme = newTheme;
            this.saveThemePreference(newTheme);
            this.applyTheme(newTheme);
            this.updateUI();
        }
        
        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            
            // Update meta theme-color
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.content = theme === THEMES.DARK ? '#1A1A1A' : '#FAFAF8';
            }
        }
        
        updateUI() {
            if (!this.dropdown) return;
            
            // Update dropdown toggle text
            const toggleText = this.dropdown.querySelector('.style-dropdown-toggle span');
            if (toggleText) {
                toggleText.textContent = this.getDisplayName();
            }
            
            // Update active style
            const styleOptions = this.dropdown.querySelectorAll('.style-option[data-style]');
            styleOptions.forEach(option => {
                option.classList.toggle('active', option.dataset.style === this.currentStyle);
            });
            
            // Update theme toggle
            const themeToggle = this.dropdown.querySelector('.theme-toggle');
            if (themeToggle) {
                const themeIcon = themeToggle.querySelector('i');
                const themeText = themeToggle.querySelector('span');
                
                if (this.currentTheme === THEMES.DARK) {
                    themeIcon.className = 'fas fa-sun';
                    themeText.textContent = 'Light Mode';
                } else {
                    themeIcon.className = 'fas fa-moon';
                    themeText.textContent = 'Dark Mode';
                }
            }
        }
        
        getDisplayName() {
            const styleText = this.currentStyle === STYLES.MINIMALIST ? 'Minimalist' : 'Elegant';
            const themeText = this.currentTheme === THEMES.DARK ? 'Dark' : 'Light';
            return `${styleText} ${themeText}`;
        }
        
        listenForSystemThemeChanges() {
            if (!window.matchMedia) return;
            
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.hasStoredTheme()) {
                    this.currentTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
                    this.applyTheme(this.currentTheme);
                    this.updateUI();
                }
            });
        }
        
        // Storage methods
        getStoredStyle() {
            return localStorage.getItem(STORAGE_KEYS.STYLE);
        }
        
        saveStylePreference(style) {
            localStorage.setItem(STORAGE_KEYS.STYLE, style);
        }
        
        getStoredTheme() {
            return localStorage.getItem(STORAGE_KEYS.THEME);
        }
        
        saveThemePreference(theme) {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
        }
        
        hasStoredTheme() {
            return localStorage.getItem(STORAGE_KEYS.THEME) !== null;
        }
    }
    
    // Initialize style switcher
    console.log('StyleSwitcher: Creating new instance');
    window.styleSwitcher = new StyleSwitcher();
    
    // Export for global access
    window.StyleSwitcher = StyleSwitcher;
})();
