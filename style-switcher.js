// style-switcher.js - Complete Style Switcher with Dark Mode
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
            this.init();
        }
        
        init() {
            // Apply stored preferences immediately
            this.applyStyle(this.currentStyle, false);
            this.applyTheme(this.currentTheme);
            
            // Create UI after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.createUI());
            } else {
                this.createUI();
            }
            
            // Listen for system theme changes
            this.listenForSystemThemeChanges();
        }
        
        createUI() {
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
            
            this.currentStyle = newStyle;
            this.saveStylePreference(newStyle);
            this.applyStyle(newStyle);
            this.updateUI();
        }
        
        applyStyle(style, reload = true) {
            if (style === STYLES.MINIMALIST) {
                // Load minimalist resources
                this.loadMinimalistStyle();
            } else {
                // Load premium resources
                this.loadPremiumStyle();
            }
            
            // Update body class
            document.body.classList.remove('style-minimalist', 'style-premium');
            document.body.classList.add(`style-${style}`);
            
            // Reload CMS content with new style if needed
            if (reload && window.cmsLoader) {
                window.cmsLoader.refresh();
            } else if (reload && window.cmsLoaderMinimalist) {
                window.cmsLoaderMinimalist.refresh();
            }
        }
        
        loadMinimalistStyle() {
            // Remove premium styles
            const premiumStyles = document.querySelector('link[href*="mystyle-premium.css"]');
            if (premiumStyles) premiumStyles.remove();
            
            // Add minimalist styles if not present
            if (!document.querySelector('link[href*="mystyle-minimalist.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'mystyle-minimalist.css';
                document.head.appendChild(link);
            }
            
            // Load minimalist CMS loader
            if (!window.cmsLoaderMinimalist) {
                const script = document.createElement('script');
                script.src = 'cms-loader-minimalist.js';
                script.onload = () => {
                    if (window.cmsLoaderMinimalist) {
                        window.cmsLoaderMinimalist.refresh();
                    }
                };
                document.body.appendChild(script);
            }
        }
        
        loadPremiumStyle() {
            // Remove minimalist styles
            const minimalistStyles = document.querySelector('link[href*="mystyle-minimalist.css"]');
            if (minimalistStyles) minimalistStyles.remove();
            
            // Premium styles should already be loaded from index.html
            // Just ensure CMS loader is available
            if (window.cmsLoader) {
                window.cmsLoader.refresh();
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
            // Update dropdown toggle text
            const toggleText = this.dropdown.querySelector('.style-dropdown-toggle span');
            toggleText.textContent = this.getDisplayName();
            
            // Update active style
            const styleOptions = this.dropdown.querySelectorAll('.style-option[data-style]');
            styleOptions.forEach(option => {
                option.classList.toggle('active', option.dataset.style === this.currentStyle);
            });
            
            // Update theme toggle
            const themeToggle = this.dropdown.querySelector('.theme-toggle');
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
    window.styleSwitcher = new StyleSwitcher();
    
    // Export for global access
    window.StyleSwitcher = StyleSwitcher;
})();
