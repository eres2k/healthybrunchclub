// Premium App JavaScript - Fixed Mobile Menu with Enhanced Dark Mode
// Enhanced functionality for upper-class restaurant experience

// ===============================================
// DARK MODE MANAGEMENT SYSTEM
// ===============================================

const DarkModeManager = {
    // Configuration
    config: {
        storageKey: 'healthy-brunch-theme',
        defaultTheme: 'light',
        transitionDuration: 300
    },

    // Initialize dark mode
    init() {
        // Prevent flash of incorrect theme
        this.preventFlash();
        
        // Get saved theme or system preference
        const savedTheme = this.getSavedTheme();
        const systemTheme = this.getSystemTheme();
        const theme = savedTheme || systemTheme || this.config.defaultTheme;
        
        // Apply theme immediately
        this.applyTheme(theme, false);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Watch for system theme changes
        this.watchSystemTheme();
        
        // Initialize mobile toggle if needed
        if (window.innerWidth <= 768) {
            this.initializeMobileToggle();
        }
        
        // Remove no-transition class after initialization
        setTimeout(() => {
            document.body.classList.remove('no-transition');
        }, 100);
    },

    // Prevent flash of incorrect theme
    preventFlash() {
        // Add no-transition class to prevent animations on load
        document.body.classList.add('no-transition');
        
        // Apply saved theme immediately if available
        const savedTheme = localStorage.getItem(this.config.storageKey);
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    },

    // Get saved theme from localStorage
    getSavedTheme() {
        return localStorage.getItem(this.config.storageKey);
    },

    // Get system theme preference
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    },

    // Apply theme
    applyTheme(theme, animate = true) {
        const isDark = theme === 'dark';
        
        if (!animate) {
            document.body.classList.add('no-transition');
        }
        
        // Apply theme class
        document.body.classList.toggle('dark-mode', isDark);
        
        // Update all icons
        this.updateIcons(isDark);
        
        // Update meta theme color
        this.updateMetaThemeColor(isDark);
        
        // Save preference
        localStorage.setItem(this.config.storageKey, theme);
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme, isDark } 
        }));
        
        if (!animate) {
            // Force reflow
            document.body.offsetHeight;
            
            setTimeout(() => {
                document.body.classList.remove('no-transition');
            }, 50);
        }
    },

    // Toggle theme
    toggle() {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    },

    // Update all theme icons
    updateIcons(isDark) {
        // Desktop icon
        const desktopIcon = document.getElementById('darkModeIcon');
        if (desktopIcon) {
            desktopIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Mobile icon
        const mobileIcon = document.querySelector('.mobile-dark-mode-toggle i');
        if (mobileIcon) {
            mobileIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Mobile label
        const mobileLabel = document.querySelector('.mobile-dark-mode-toggle span');
        if (mobileLabel) {
            mobileLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
    },

    // Update meta theme color
    updateMetaThemeColor(isDark) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = isDark ? '#0A0A0A' : '#1A1A1A';
        }
    },

    // Set up event listeners
    setupEventListeners() {
        // Desktop toggle button
        const desktopToggle = document.getElementById('darkModeToggle');
        if (desktopToggle) {
            desktopToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }
        
        // Handle resize events
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth <= 768 && !document.querySelector('.mobile-dark-mode-toggle')) {
                    this.initializeMobileToggle();
                }
            }, 250);
        });
    },

    // Watch for system theme changes
    watchSystemTheme() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            darkModeQuery.addEventListener('change', (e) => {
                // Only apply system theme if user hasn't set a preference
                if (!this.getSavedTheme()) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    },

    // Initialize mobile toggle
    initializeMobileToggle() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        // Remove existing toggle if present
        const existingToggle = navMenu.querySelector('.mobile-dark-mode-item');
        if (existingToggle) {
            existingToggle.remove();
        }
        
        // Create new toggle
        const mobileToggleItem = document.createElement('li');
        mobileToggleItem.className = 'mobile-dark-mode-item';
        
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-dark-mode-toggle';
        mobileToggle.setAttribute('aria-label', 'Toggle dark mode');
        mobileToggle.type = 'button';
        
        const isDark = document.body.classList.contains('dark-mode');
        
        mobileToggle.innerHTML = `
            <span>${isDark ? 'Light Mode' : 'Dark Mode'}</span>
            <i class="${isDark ? 'fas fa-sun' : 'fas fa-moon'}"></i>
        `;
        
        mobileToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });
        
        mobileToggleItem.appendChild(mobileToggle);
        navMenu.appendChild(mobileToggleItem);
    }
};

// ===============================================
// MAIN APP INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize dark mode first
    DarkModeManager.init();
    
    // Initialize all other components
    initLoadingScreen();
    initNavigation();
    initMobileMenu();
    initReservationForm();
    initSmoothScrolling();
    initAnimations();
    initVideoOptimization();
    initParallax();
    fillAvailableDates();
    
    // Initialize event window
    const eventWindow = document.getElementById('eventWindow');
    if (eventWindow) {
        eventWindow.classList.add('collapsed');
        eventWindow.style.display = 'block';
    }
}

// Loading Screen
function initLoadingScreen() {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }, 2000);
    });
}

// Premium Navigation
function initNavigation() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class
        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show on scroll (only on desktop)
        if (window.innerWidth > 768) {
            if (currentScroll > lastScroll && currentScroll > 500) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }
        
        lastScroll = currentScroll;
    });
}

// Mobile Menu - Fixed Implementation
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuBtn || !navMenu) return;
    
    // Click handler for mobile menu button
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileMenu();
    });
    
    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeMobileMenu();
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navMenu.contains(e.target) && !menuBtn.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuBtn || !navMenu) return;
    
    const isActive = navMenu.classList.contains('active');
    
    if (isActive) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// Open Mobile Menu
function openMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuBtn || !navMenu) return;
    
    navMenu.classList.add('active');
    menuBtn.classList.add('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
    
    // Ensure mobile dark mode toggle exists
    if (window.innerWidth <= 768 && !navMenu.querySelector('.mobile-dark-mode-toggle')) {
        DarkModeManager.initializeMobileToggle();
    }
}

// Close Mobile Menu
function closeMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!menuBtn || !navMenu) return;
    
    navMenu.classList.remove('active');
    menuBtn.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Smooth Scrolling
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offset = 80; // Navigation height
                const targetPosition = targetSection.offsetTop - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Reservation Form
function initReservationForm() {
    const form = document.querySelector('.reservation-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            // Form is handled by Netlify
            // Add loading state
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird gesendet...';
            submitBtn.disabled = true;
            
            // Reset after submission
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 3000);
        });
    }
}

function fillAvailableDates() {
    const dateSelect = document.getElementById('date');
    if (!dateSelect) return;
    
    // Reset dropdown
    dateSelect.innerHTML = '<option value="">Datum wählen</option>';
    
    // Compute next Sunday
    const today = new Date();
    // Calculate days until next Sunday (0): if today is Sunday, move 7 days ahead
    const daysUntilSunday = ((0 - today.getDay() + 7) % 7) || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    
    // Create option for next Sunday
    const option = document.createElement('option');
    option.value = nextSunday.toISOString().split('T')[0];
    const dayName = nextSunday.toLocaleDateString('de-AT', { weekday: 'long' });
    const formattedDate = nextSunday.toLocaleDateString('de-AT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    option.textContent = `${dayName}, ${formattedDate}`;
    
    dateSelect.appendChild(option);
}

// Animations
function initAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Stagger animations for grid items
                if (entry.target.classList.contains('menu-item-card') || 
                    entry.target.classList.contains('philosophy-card')) {
                    const cards = entry.target.parentElement.children;
                    Array.from(cards).forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('visible');
                        }, index * 100);
                    });
                }
            }
        });
    }, observerOptions);
    
    // Observe elements
    const animatedElements = document.querySelectorAll(
        '.menu-category, .philosophy-card, .feature-card, .section-title'
    );
    
    animatedElements.forEach(el => {
        el.classList.add('fade-in-up');
        observer.observe(el);
    });
}

// Video Optimization
function initVideoOptimization() {
    const heroVideo = document.querySelector('.hero-video');
    
    if (heroVideo) {
        // Pause video when not in viewport
        const videoObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    heroVideo.play();
                } else {
                    heroVideo.pause();
                }
            });
        });
        
        videoObserver.observe(heroVideo);
        
        // Optimize for mobile
        if (window.innerWidth <= 768) {
            heroVideo.removeAttribute('autoplay');
        }
    }
}

// Parallax effect for hero (desktop only)
function initParallax() {
    if (window.innerWidth <= 768) return;
    
    const heroContent = document.querySelector('.hero-content');
    
    if (heroContent) {
        window.addEventListener('scroll', debounce(() => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            if (scrolled < window.innerHeight) {
                heroContent.style.transform = `translateY(${rate}px)`;
            }
        }, 10));
    }
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    }, 250);
});

// Form Success Handling
if (window.location.search.includes('success=true')) {
    // Show success message
    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <h3>Vielen Dank für Ihre Reservierung!</h3>
        <p>Wir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.</p>
    `;
    
    document.body.appendChild(message);
    
    // Style the message
    Object.assign(message.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '3rem',
        borderRadius: '8px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: '10000',
        textAlign: 'center',
        maxWidth: '500px'
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s ease';
        setTimeout(() => message.remove(), 500);
    }, 5000);
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Netlify Identity Integration
if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
        if (!user) {
            window.netlifyIdentity.on("login", () => {
                document.location.href = "/admin/";
            });
        }
        
        // Show admin button if logged in
        if (user) {
            const adminBtn = document.getElementById('adminBtn');
            if (adminBtn) {
                adminBtn.classList.add('show');
            }
        }
    });
    
    window.netlifyIdentity.on("login", () => {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.add('show');
        }
    });
    
    window.netlifyIdentity.on("logout", () => {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.classList.remove('show');
        }
    });
}

// Utility Functions
// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toggle Event Window
window.toggleEventWindow = function() {
    const eventWindow = document.getElementById('eventWindow');
    if (eventWindow) {
        eventWindow.classList.toggle('collapsed');
    }
};

// PDF Download tracking
function trackPDFDownload() {
    // Track PDF download event if analytics is set up
    if (typeof gtag !== 'undefined') {
        gtag('event', 'download', {
            'event_category': 'Menu',
            'event_label': 'PDF Menu Download'
        });
    }
    
    // Or custom tracking
    console.log('Menu PDF downloaded');
}

// Initialize mobile PDF button
document.addEventListener('DOMContentLoaded', function() {
    const pdfButton = document.querySelector('.mobile-pdf-download');
    if (pdfButton && window.innerWidth <= 768) {
        pdfButton.style.display = 'flex';
        
        // Ensure onclick works
        if (!pdfButton.hasAttribute('data-initialized')) {
            pdfButton.setAttribute('data-initialized', 'true');
            pdfButton.removeAttribute('onclick'); // Remove inline onclick
            pdfButton.addEventListener('click', function(e) {
                e.preventDefault();
                window.open('content/menu.pdf', '_blank');
                trackPDFDownload();
            });
        }
    }
    
    // Desktop PDF button
    const desktopPdfBtn = document.querySelector('.btn-icon[onclick*="pdf"]');
    if (desktopPdfBtn) {
        desktopPdfBtn.addEventListener('click', trackPDFDownload);
    }
});

// Add fade-in-up class styles dynamically
const style = document.createElement('style');
style.textContent = `
    .fade-in-up {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease, transform 0.8s ease;
    }
    
    .fade-in-up.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .success-message i {
        font-size: 4rem;
        color: var(--gold);
        margin-bottom: 1rem;
    }
    
    .success-message h3 {
        font-family: var(--font-display);
        font-size: 2rem;
        margin-bottom: 1rem;
    }
    
    .success-message p {
        font-size: 1.125rem;
        color: var(--warm-gray);
    }
`;
document.head.appendChild(style);

// Service Worker Registration (if you have one)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed'));
    });
}

// Handle theme changes for dynamic content
window.addEventListener('themeChanged', function(e) {
    console.log('Theme changed to:', e.detail.theme);
    
    // Update any dynamically loaded content
    const dynamicElements = document.querySelectorAll('[data-theme-aware]');
    dynamicElements.forEach(element => {
        // Update element based on theme
        if (e.detail.isDark) {
            element.classList.add('dark-theme');
        } else {
            element.classList.remove('dark-theme');
        }
    });
});

// Keyboard shortcut for dark mode toggle (Ctrl/Cmd + Shift + D)
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        DarkModeManager.toggle();
    }
});

// Ensure mobile dark mode toggle is created after menu loads
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu && !navMenu.querySelector('.mobile-dark-mode-item')) {
                    if (window.innerWidth <= 768) {
                        DarkModeManager.initializeMobileToggle();
                    }
                }
            }
        });
    });
    
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) {
        observer.observe(navContainer, {
            childList: true,
            subtree: true
        });
    }
});

// Export DarkModeManager for global access
window.DarkModeManager = DarkModeManager;

/* Force all visible text to lowercase (incl. dynamically loaded content) */
(() => {
  const LOCALE = 'de-AT';
  const EXCLUDE_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','IFRAME','SVG']);
  const EXCLUDE_SELECTOR = '[data-keep-case], .keep-case, [contenteditable="true"]';

  const hasUpper = /[A-ZÄÖÜẞ]/;

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return true;
    const s = getComputedStyle(el);
    return s && s.visibility !== 'hidden' && s.display !== 'none';
  }

  function shouldSkip(node) {
    let el = node.parentElement;
    if (el && el.closest(EXCLUDE_SELECTOR)) return true;
    while (el) {
      if (EXCLUDE_TAGS.has(el.nodeName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function lowerTextNode(n) {
    const t = n.nodeValue;
    if (!t || !hasUpper.test(t)) return;
    n.nodeValue = t.toLocaleLowerCase(LOCALE);
  }

  function walkAndLower(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !hasUpper.test(node.nodeValue)) return NodeFilter.FILTER_SKIP;
        if (!isVisible(node.parentElement)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const toProcess = [];
    while (walker.nextNode()) toProcess.push(walker.currentNode);
    toProcess.forEach(lowerTextNode);
  }

  function lowerUsefulAttributes(root) {
    root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (ph) el.setAttribute('placeholder', ph.toLocaleLowerCase(LOCALE));
    });
    root.querySelectorAll('img[alt]').forEach(el => {
      const alt = el.getAttribute('alt');
      if (alt) el.setAttribute('alt', alt.toLocaleLowerCase(LOCALE));
    });
    root.querySelectorAll('[title]').forEach(el => {
      const tt = el.getAttribute('title');
      if (tt) el.setAttribute('title', tt.toLocaleLowerCase(LOCALE));
    });
  }

  function process(root = document.body) {
    walkAndLower(root);
    lowerUsefulAttributes(root);
  }

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) process(n);
          else if (n.nodeType === 3) lowerTextNode(n);
        });
      } else if (m.type === 'characterData') {
        lowerTextNode(m.target);
      } else if (m.type === 'attributes') {
        const el = m.target;
        const val = el.getAttribute(m.attributeName);
        if (!val) continue;
        if (m.attributeName === 'placeholder' || m.attributeName === 'title' || m.attributeName === 'alt') {
          el.setAttribute(m.attributeName, val.toLocaleLowerCase(LOCALE));
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    process();
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder','title','alt']
    });
  });

  // optional: allow manual re-run
  window.forceLowercase = { process };
})();

// Log initialization
console.log('Premium restaurant app initialized with enhanced dark mode features.');
