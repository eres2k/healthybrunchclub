// Style Switcher Implementation
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
    
    // Default settings
    const DEFAULT_STYLE = STYLES.PREMIUM;
    const DEFAULT_THEME = THEMES.LIGHT;
    
    // Storage keys
    const STORAGE_KEYS = {
        STYLE: 'hbc-style-preference',
        THEME: 'hbc-theme-preference'
    };
    
    class StyleSwitcher {
        constructor() {
            this.currentStyle = this.getStoredStyle() || DEFAULT_STYLE;
            this.currentTheme = this.getStoredTheme() || DEFAULT_THEME;
            this.isInitialized = false;
            
            this.init();
        }
        
        init() {
            // Apply stored preferences immediately
            this.applyStyle(this.currentStyle);
            this.applyTheme(this.currentTheme);
            
            // Create UI after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.createUI());
            } else {
                this.createUI();
            }
            
            // Listen for system theme changes
            this.listenForSystemThemeChanges();
            
            this.isInitialized = true;
        }
        
        createUI() {
            // Create style swit