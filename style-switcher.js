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
            this.currentStyle = this.getStoredStyle() || STYLES.PREMIUM;
            this.currentTheme = this.getStoredTheme() || THEMES.LIGHT;
            this.dropdown = null;
            this.isInitialized = false;
            this.init();
        }
        
        init() {
            console.log('StyleSwitcher: Initializing with style:', this.currentStyle);
            
            // Apply stored preferences immediately
            this.applyStyle(this.currentStyle, false);
            this.applyTheme(this.currentTheme);
            
            // Create UI after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.createUI();
                    this.isInitialized = true;
                });
            } else {
                this.createUI();
                this.isInitialized = true;
            }
            
            // Listen for system theme changes
            this.listenForSystemThemeChanges();
        }
        
        createUI() {
            console.log('StyleSwitcher: Creating UI');
            
            // Remove any existing switcher
            const existing = document.querySelector('.style-switcher');
            if (existing) existing.remove();
            
            // Create switcher container
            const switcher = document.createElement('div');
            switcher.className = 'style-switcher';
            
            // Create dropdown
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'style-dropdown';
            this.dropdown.innerHTML = `
                <button class="style-dropdown-toggle" aria-label="Style Switcher">
                    <span>${this.getDisplayName()}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="style-dropdown-menu">
                    <button class="style-option ${this.currentStyle === STYLES.PREMIUM ? 'active' : ''}" 
                            data-style="${STYLES.PREMIUM}">
                        <i class="fas fa-crown"></i>
                        <span>Premium</span>
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
            document.body.appendChild(switcher);
            
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
            
            this.currentStyle = newStyle;
            this.saveStylePreference(newStyle);
            this.applyStyle(newStyle);
            this.updateUI();
        }
        
        applyStyle(style, reload = true) {
            console.log('StyleSwitcher: Applying style:', style, 'Reload:', reload);
            
            // Update body class
            document.body.classList.remove('style-minimalist', 'style-premium');
            document.body.classList.add(`style-${style}`);
            
            if (style === STYLES.MINIMALIST) {
                // Load minimalist resources
                this.loadMinimalistStyle(reload);
            } else {
                // Load premium resources
                this.loadPremiumStyle(reload);
            }
        }
        
        loadMinimalistStyle(reload = true) {
            console.log('StyleSwitcher: Loading minimalist style');
            
            // Remove premium-specific styles if they exist
            const premiumStyles = document.querySelector('link[href*="mystyle-premium.css"]');
            if (premiumStyles && !document.querySelector('link[href*="mystyle-minimalist.css"]')) {
                premiumStyles.remove();
            }
            
            // Add minimalist styles if not present
            if (!document.querySelector('link[href*="mystyle-minimalist.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'mystyle-minimalist.css';
                document.head.appendChild(link);
            }
            
            // Only load minimalist CMS loader if we need to reload and it's not already loaded
            if (reload) {
                // First, check if premium CMS loader exists and has data
                if (window.cmsLoader && window.allMenuCategories && window.allMenuCategories.length > 0) {
                    console.log('StyleSwitcher: Using existing menu data for minimalist view');
                    
                    // Load minimalist CMS loader
                    if (!window.cmsLoaderMinimalist) {
                        const script = document.createElement('script');
                        script.src = 'cms-loader-minimalist.js';
                        script.onload = () => {
                            console.log('StyleSwitcher: Minimalist CMS loader loaded');
                            // Copy data from premium loader
                            if (window.cmsLoaderMinimalist) {
                                window.cmsLoaderMinimalist.allMenuCategories = window.allMenuCategories;
                                window.cmsLoaderMinimalist.displayMinimalistMenu(window.allMenuCategories);
                            }
                        };
                        document.body.appendChild(script);
                    } else {
                        // Just redisplay with existing data
                        window.cmsLoaderMinimalist.displayMinimalistMenu(window.allMenuCategories);
                    }
                } else {
                    // No data available, load minimalist CMS loader fresh
                    this.loadMinimalistCMSLoader();
                }
            }
        }
        
        loadMinimalistCMSLoader() {
            console.log('StyleSwitcher: Loading minimalist CMS loader fresh');
            
            if (!document.querySelector('script[src*="cms-loader-minimalist.js"]')) {
                const script = document.createElement('script');
                script.src = 'cms-loader-minimalist.js';
                script.onload = () => {
                    console.log('StyleSwitcher: Minimalist CMS loader script loaded');
                    // The script should auto-initialize
                };
                script.onerror = (error) => {
                    console.error('StyleSwitcher: Failed to load minimalist CMS loader:', error);
                };
                document.body.appendChild(script);
            } else if (window.cmsLoaderMinimalist && window.cmsLoaderMinimalist.refresh) {
                window.cmsLoaderMinimalist.refresh();
            }
        }
        
        loadPremiumStyle(reload = true) {
            console.log('StyleSwitcher: Loading premium style');
            
            // Remove minimalist styles
            const minimalistStyles = document.querySelector('link[href*="mystyle-minimalist.css"]');
            if (minimalistStyles) minimalistStyles.remove();
            
            // Premium styles should already be loaded from index.html
            // Just ensure CMS loader is available
            if (reload && window.cmsLoader && window.cmsLoader.refresh) {
                console.log('StyleSwitcher: Refreshing premium CMS loader');
                window.cmsLoader.refresh();
            } else if (reload && !window.cmsLoader) {
                console.error('StyleSwitcher: Premium CMS loader not found!');
                // Try to reload it
                const script = document.createElement('script');
                script.src = 'cms-loader-premium.js';
                script.onload = () => {
                    console.log('StyleSwitcher: Premium CMS loader reloaded');
                };
                document.body.appendChild(script);
            }
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
            const styleText = this.currentStyle === STYLES.MINIMALIST ? 'Minimalist' : 'Premium';
            const themeIcon = this.currentTheme === THEMES.DARK ? '🌙' : '☀️';
            return `${styleText} ${themeIcon}`;
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
            const stored = localStorage.getItem(STORAGE_KEYS.THEME);
            if (stored) return stored;
            
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return THEMES.DARK;
            }
            
            return THEMES.LIGHT;
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
