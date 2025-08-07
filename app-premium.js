// Premium App JavaScript - Fixed Mobile Menu
// Enhanced functionality for upper-class restaurant experience

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize all components
    initLoadingScreen();
    initNavigation();
    initMobileMenu();
    initReservationForm();
    initSmoothScrolling();
    initAnimations();
    initVideoOptimization();
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

// Initialize parallax
initParallax();

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

// HAMBURGER MENU FIX
// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check what elements exist
    console.log('Checking for menu elements...');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    console.log('Menu button found:', !!menuBtn);
    console.log('Nav menu found:', !!navMenu);
    
    if (menuBtn && navMenu) {
        // Remove any existing event listeners
        const newBtn = menuBtn.cloneNode(true);
        menuBtn.parentNode.replaceChild(newBtn, menuBtn);
        
        // Add click event to hamburger menu
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Menu button clicked!');
            
            // Toggle active class
            navMenu.classList.toggle('active');
            newBtn.classList.toggle('active');
            
            // Toggle body scroll
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !newBtn.contains(e.target)) {
                navMenu.classList.remove('active');
                newBtn.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                newBtn.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        console.log('✓ Hamburger menu initialized successfully!');
    } else {
        console.error('❌ Could not find menu button or nav menu!');
    }
});

// Alternative fix if the above doesn't work
window.fixHamburgerMenu = function() {
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .mobile-menu-btn {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                position: relative !important;
                z-index: 1001 !important;
                width: 30px !important;
                height: 30px !important;
                background: none !important;
                border: none !important;
                cursor: pointer !important;
            }
            
            .mobile-menu-btn span {
                display: block !important;
                width: 25px !important;
                height: 2px !important;
                background: #1A1A1A !important;
                margin: 6px 0 !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            .nav-menu {
                display: none !important;
            }
            
            .nav-menu.active {
                display: flex !important;
                position: absolute !important;
                top: 100% !important;
                left: 0 !important;
                right: 0 !important;
                background: white !important;
                flex-direction: column !important;
                padding: 20px !important;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
                z-index: 1000 !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('✓ CSS fixes applied!');
};

// Run the CSS fix automatically
if (window.innerWidth <= 768) {
    fixHamburgerMenu();
}

// ===============================================
// DARK MODE FUNCTIONALITY - FIXED VERSION
// ===============================================

// Dark Mode Management
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const body = document.body;
    
    // Check for saved dark mode preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply saved theme
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
    
    // Toggle dark mode on button click
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const isDarkMode = body.classList.toggle('dark-mode');
            
            // Save preference
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            
            // Update icon
            updateDarkModeIcon(isDarkMode);
            
            // Update meta theme-color for mobile browsers
            updateThemeColor(isDarkMode);
            
            // Trigger event for other components that might need to update
            window.dispatchEvent(new CustomEvent('darkModeToggled', { detail: { isDarkMode } }));
        });
    }
    
    // Update icon based on mode
    function updateDarkModeIcon(isDarkMode) {
        if (darkModeIcon) {
            darkModeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    // Update theme color for mobile address bar
    function updateThemeColor(isDarkMode) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.content = isDarkMode ? '#0A0A0A' : '#1A1A1A';
        }
    }
    
    // Handle system theme changes
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Check if user has no saved preference and system prefers dark
        if (!localStorage.getItem('theme') && darkModeQuery.matches) {
            body.classList.add('dark-mode');
            updateDarkModeIcon(true);
            updateThemeColor(true);
        }
        
        // Listen for system theme changes
        darkModeQuery.addEventListener('change', function(e) {
            // Only apply system theme if user hasn't set a preference
            if (!localStorage.getItem('theme')) {
                const isDarkMode = e.matches;
                body.classList.toggle('dark-mode', isDarkMode);
                updateDarkModeIcon(isDarkMode);
                updateThemeColor(isDarkMode);
            }
        });
    }
}

// Create mobile dark mode toggle - FIXED VERSION
function createMobileDarkModeToggle() {
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    // Remove any existing mobile toggle first
    const existingToggle = navMenu.querySelector('.mobile-dark-mode-item');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    // Create the structure
    const mobileDarkModeItem = document.createElement('li');
    mobileDarkModeItem.className = 'mobile-dark-mode-item';
    mobileDarkModeItem.style.cssText = 'display: block; width: 100%; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(30, 74, 60, 0.1);';
    
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-dark-mode-toggle';
    mobileToggle.setAttribute('aria-label', 'Dark Mode umschalten');
    
    // Inline styles for mobile toggle button
    mobileToggle.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 1rem;
        background: transparent;
        border: 1px solid #E8E8E8;
        color: #1E4A3C;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.3s ease;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
    `;
    
    // Create label and icon
    const label = document.createElement('span');
    label.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
    
    const icon = document.createElement('i');
    icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    
    mobileToggle.appendChild(label);
    mobileToggle.appendChild(icon);
    mobileDarkModeItem.appendChild(mobileToggle);
    navMenu.appendChild(mobileDarkModeItem);
    
    // Add click handler
    mobileToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const body = document.body;
        const isDarkMode = body.classList.toggle('dark-mode');
        
        // Save preference
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // Update label and icon
        label.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        
        // Update desktop icon if exists
        const desktopIcon = document.getElementById('darkModeIcon');
        if (desktopIcon) {
            desktopIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Update theme color
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.content = isDarkMode ? '#0A0A0A' : '#1A1A1A';
        }
        
        // Update button styles for dark mode
        if (isDarkMode) {
            mobileToggle.style.backgroundColor = '#1A1A1A';
            mobileToggle.style.color = '#FFFFFF';
            mobileToggle.style.borderColor = '#1A1A1A';
        } else {
            mobileToggle.style.backgroundColor = 'transparent';
            mobileToggle.style.color = '#1E4A3C';
            mobileToggle.style.borderColor = '#E8E8E8';
        }
    });
    
    // Add hover effect
    mobileToggle.addEventListener('mouseover', function() {
        if (!document.body.classList.contains('dark-mode')) {
            this.style.backgroundColor = '#1E4A3C';
            this.style.color = '#FFFFFF';
            this.style.borderColor = '#1E4A3C';
        }
    });
    
    mobileToggle.addEventListener('mouseout', function() {
        if (!document.body.classList.contains('dark-mode')) {
            this.style.backgroundColor = 'transparent';
            this.style.color = '#1E4A3C';
            this.style.borderColor = '#E8E8E8';
        } else {
            this.style.backgroundColor = '#1A1A1A';
            this.style.color = '#FFFFFF';
            this.style.borderColor = '#1A1A1A';
        }
    });
    
    // Apply initial dark mode styles if active
    if (document.body.classList.contains('dark-mode')) {
        mobileToggle.style.backgroundColor = '#1A1A1A';
        mobileToggle.style.color = '#FFFFFF';
        mobileToggle.style.borderColor = '#1A1A1A';
    }
}

// Robustere Initialisierung für Mobile
function initializeMobileFeatures() {
    // Create mobile dark mode toggle
    if (window.innerWidth <= 768) {
        createMobileDarkModeToggle();
    }
    
    // Ensure PDF button is visible and working
    const pdfButton = document.querySelector('.mobile-pdf-download');
    if (pdfButton && window.innerWidth <= 768) {
        pdfButton.style.display = 'flex';
        
        // Ensure onclick works
        if (!pdfButton.hasAttribute('data-initialized')) {
            pdfButton.setAttribute('data-initialized', 'true');
            pdfButton.removeAttribute('onclick'); // Remove inline onclick
            pdfButton.addEventListener('click', function(e) {
                e.preventDefault();
                window.open('/content/menu.pdf', '_blank');
                trackPDFDownload();
            });
        }
    }
}

// Multiple initialization points for reliability
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    setTimeout(initializeMobileFeatures, 100);
});

// Also try after window load
window.addEventListener('load', function() {
    setTimeout(initializeMobileFeatures, 200);
});

// And after a delay for slow devices
setTimeout(function() {
    if (window.innerWidth <= 768) {
        initializeMobileFeatures();
    }
}, 1000);

// Re-initialize on orientation change
window.addEventListener('orientationchange', function() {
    setTimeout(initializeMobileFeatures, 300);
});

// Update initialization
document.addEventListener('DOMContentLoaded', function() {
    // Re-create mobile toggle on resize
    window.addEventListener('resize', debounce(function() {
        if (window.innerWidth <= 768) {
            createMobileDarkModeToggle();
        } else {
            // Remove mobile toggle on desktop
            const mobileToggle = document.querySelector('.mobile-dark-mode-item');
            if (mobileToggle) {
                mobileToggle.remove();
            }
        }
    }, 250));
});

// Listen for dark mode changes to update mobile menu if open
window.addEventListener('darkModeToggled', function(e) {
    // Update any UI elements that need to reflect the theme change
    const mobileToggle = document.querySelector('.mobile-dark-mode-toggle');
    if (mobileToggle) {
        const label = mobileToggle.querySelector('span');
        const icon = mobileToggle.querySelector('i');
        
        if (label) {
            label.textContent = e.detail.isDarkMode ? 'Light Mode' : 'Dark Mode';
        }
        if (icon) {
            icon.className = e.detail.isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
});

// Add smooth transition for theme changes
document.addEventListener('DOMContentLoaded', function() {
    // Add transition class to body after initial load to prevent flash
    setTimeout(() => {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }, 100);
});

// PDF Download tracking (optional)
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

// Add tracking to PDF buttons
document.addEventListener('DOMContentLoaded', function() {
    // Desktop PDF button
    const desktopPdfBtn = document.querySelector('.btn-icon[onclick*="pdf"]');
    if (desktopPdfBtn) {
        desktopPdfBtn.addEventListener('click', trackPDFDownload);
    }
    
    // Mobile PDF button
    const mobilePdfBtn = document.querySelector('.mobile-pdf-download');
    if (mobilePdfBtn) {
        mobilePdfBtn.addEventListener('click', trackPDFDownload);
    }
});

// Log initialization
console.log('Premium restaurant app initialized with enhanced features.');
