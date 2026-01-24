// Premium App JavaScript - Fixed Mobile Menu
// Enhanced functionality for upper-class restaurant experience

// ===============================================
// MAIN APP INITIALIZATION
// ===============================================

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
    initParallax();
    fillAvailableDates();
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
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = form.querySelector('.btn-submit');
            const statusBox = form.querySelector('.form-status');
            const originalText = submitBtn ? submitBtn.innerHTML : '';

            if (statusBox) {
                statusBox.innerHTML = '';
                statusBox.classList.add('hidden');
                statusBox.classList.remove('success', 'error');
            }

            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> wird gesendet...';
                submitBtn.disabled = true;
            }

            const formData = new FormData(form);
            const plainData = Object.fromEntries(formData.entries());

            try {
                const emailResponse = await fetch('/.netlify/functions/reservation-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(plainData)
                });

                if (!emailResponse.ok) {
                    throw new Error('Email dispatch failed');
                }

                const netlifyResponse = await fetch('/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: encodeFormData(formData)
                });

                if (!netlifyResponse.ok) {
                    throw new Error('Form submission failed');
                }

                form.reset();
                fillAvailableDates();

                if (statusBox) {
                    statusBox.innerHTML = '<span class="status-icon">🎉</span><div><strong>vielen dank!</strong> ihre reservierungsanfrage wurde erfolgreich übermittelt. wir melden uns in kürze mit einer persönlichen bestätigung.</div>';
                    statusBox.classList.remove('hidden');
                    statusBox.classList.add('success');
                }
            } catch (error) {
                console.error('Reservation submission failed:', error);

                if (statusBox) {
                    statusBox.innerHTML = '<span class="status-icon">⚠️</span><div><strong>ups!</strong> leider konnte ihre reservierungsanfrage gerade nicht gesendet werden. bitte versuchen sie es erneut oder schreiben sie an <a href="mailto:hello@healthybrunchclub.at">hello@healthybrunchclub.at</a>.</div>';
                    statusBox.classList.remove('hidden');
                    statusBox.classList.add('error');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
}

function encodeFormData(formData) {
    const pairs = [];
    for (const [key, value] of formData.entries()) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
    return pairs.join('&');
}

function fillAvailableDates() {
    const dateSelect = document.getElementById('date');
    if (!dateSelect) return;

    // Reset dropdown
    dateSelect.innerHTML = '<option value="">Datum wählen</option>';

    // Fixed available dates: 5., 6., 7., 24., 25. and 26. October of the current year
    const currentYear = new Date().getFullYear();
    const availableDates = [
        new Date(currentYear, 9, 5),  // 5 October
        new Date(currentYear, 9, 6),  // 6 October
        new Date(currentYear, 9, 7),  // 7 October
        new Date(currentYear, 9, 24), // 24 October
        new Date(currentYear, 9, 25), // 25 October
        new Date(currentYear, 9, 26)  // 26 October
    ];

    availableDates.forEach(date => {
        const option = document.createElement('option');

        // Format value manually to avoid timezone-related date shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        option.value = `${year}-${month}-${day}`;
        const dayName = date.toLocaleDateString('de-AT', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('de-AT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        option.textContent = `${dayName}, ${formattedDate}`;
        dateSelect.appendChild(option);
    });
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

// ===============================================
// ASK TINA CHATBOT
// ===============================================

let chatbotConversationHistory = [];

// Toggle Chatbot Window
window.toggleChatbot = function() {
    const container = document.getElementById('chatbotContainer');
    const chatWindow = document.getElementById('chatbotWindow');
    const input = document.getElementById('chatbotInput');

    if (container && chatWindow) {
        const isOpen = container.classList.contains('open');

        if (isOpen) {
            container.classList.remove('open');
            chatWindow.style.display = 'none';
        } else {
            container.classList.add('open');
            chatWindow.style.display = 'flex';
            // Focus input when opening
            setTimeout(() => {
                if (input) input.focus();
            }, 300);
        }
    }
};

// Send Chat Message
window.sendChatMessage = async function(event) {
    event.preventDefault();

    const input = document.getElementById('chatbotInput');
    const messagesContainer = document.getElementById('chatbotMessages');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to UI
    addChatMessage('user', message);

    // Add to conversation history
    chatbotConversationHistory.push({ role: 'user', content: message });

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetch('/.netlify/functions/ask-tina', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                conversationHistory: chatbotConversationHistory.slice(-6)
            })
        });

        // Remove typing indicator
        if (typingIndicator) typingIndicator.remove();

        const data = await response.json();

        if (!response.ok) {
            // Handle specific error cases with user-friendly messages
            console.error('Chatbot API error:', response.status, data);

            if (response.status === 429) {
                // Rate limited / spam blocked
                addChatMessage('bot', data.error || 'Du sendest zu viele Nachrichten. Bitte warte kurz und versuche es dann nochmal.');
            } else if (response.status === 400) {
                // Bad request (message too long, etc.)
                addChatMessage('bot', data.error || 'Deine Nachricht konnte nicht verarbeitet werden. Bitte versuche es mit einer kürzeren Nachricht.');
            } else {
                // Server error
                addChatMessage('bot', 'Entschuldigung, der Chatbot ist gerade nicht verfügbar. Bitte versuche es später nochmal oder schreib uns an hello@healthybrunchclub.at');
            }
            return;
        }

        if (data.response) {
            // Add bot response to UI with any recommended products
            addChatMessage('bot', data.response, data.recommendedProducts || []);

            // Add to conversation history
            chatbotConversationHistory.push({ role: 'assistant', content: data.response });
        } else {
            addChatMessage('bot', 'Entschuldigung, ich konnte deine Frage gerade nicht verarbeiten. Bitte versuche es nochmal!');
        }

    } catch (error) {
        console.error('Chatbot error:', error);

        // Remove typing indicator
        if (typingIndicator) typingIndicator.remove();

        addChatMessage('bot', 'Ups, da ist etwas schiefgelaufen. Bitte versuche es später nochmal oder schreib uns an hello@healthybrunchclub.at');
    }

    // Scroll to bottom
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

// Add Chat Message to UI
function addChatMessage(role, content, recommendedProducts = []) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);

    // Add product cards if there are recommended products (for bot messages)
    if (role === 'bot' && recommendedProducts && recommendedProducts.length > 0) {
        const productsContainer = createProductCards(recommendedProducts);
        messageDiv.appendChild(productsContainer);
    }

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create product cards for recommended products in chat
function createProductCards(products) {
    const container = document.createElement('div');
    container.className = 'chat-product-cards';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'chat-product-card';
        card.onclick = () => scrollToMenuItem(product.name);

        // Product image
        if (product.image) {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'chat-product-image';
            const img = document.createElement('img');
            img.src = product.image;
            img.alt = product.name;
            img.loading = 'lazy';
            imageDiv.appendChild(img);
            card.appendChild(imageDiv);
        }

        // Product info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'chat-product-info';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'chat-product-name';
        nameDiv.textContent = product.name;
        infoDiv.appendChild(nameDiv);

        // Tags (max 2)
        if (product.tags && product.tags.length > 0) {
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'chat-product-tags';
            const TAG_DISPLAY = {
                'vegetarisch': 'Vegetarisch',
                'glutenfrei': 'Glutenfrei',
                'proteinreich': 'Proteinreich',
                'sättigend': 'Sättigend',
                'belebend': 'Belebend',
                'immunstärkend': 'Immunstärkend'
            };
            tagsDiv.textContent = product.tags
                .slice(0, 2)
                .map(t => TAG_DISPLAY[t.toLowerCase()] || t)
                .join(' · ');
            infoDiv.appendChild(tagsDiv);
        }

        // Price
        if (product.price) {
            const priceDiv = document.createElement('div');
            priceDiv.className = 'chat-product-price';
            priceDiv.textContent = product.price.replace('.', ',');
            infoDiv.appendChild(priceDiv);
        }

        card.appendChild(infoDiv);

        // Arrow indicator
        const arrowDiv = document.createElement('div');
        arrowDiv.className = 'chat-product-arrow';
        arrowDiv.innerHTML = '<i class="fas fa-chevron-right"></i>';
        card.appendChild(arrowDiv);

        container.appendChild(card);
    });

    return container;
}

// Add Typing Indicator
function addTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return null;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return typingDiv;
}

// ===============================================
// INFO MODAL
// ===============================================

window.openInfoModal = function() {
    const overlay = document.getElementById('infoModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeInfoModal = function() {
    const overlay = document.getElementById('infoModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeInfoModal();
        // Also close chatbot if open
        const container = document.getElementById('chatbotContainer');
        if (container && container.classList.contains('open')) {
            toggleChatbot();
        }
    }
});

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

// Initialize desktop PDF button tracking
document.addEventListener('DOMContentLoaded', function() {
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

// ===============================================
// SMART MENU RECOMMENDATIONS
// ===============================================

// User preferences storage key
const PREFERENCES_STORAGE_KEY = 'hbc_user_preferences';
const ORDER_HISTORY_KEY = 'hbc_order_history';

// Initialize recommendations on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeRecommendations();
});

// Initialize the recommendations system
function initializeRecommendations() {
    // Load saved preferences
    const preferences = loadUserPreferences();

    // Update modal UI with saved preferences
    updatePreferencesModal(preferences);

    // Load recommendations
    loadRecommendations();
}

// Load user preferences from localStorage
function loadUserPreferences() {
    try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not load preferences:', e);
    }

    // Default preferences
    return {
        dietaryPreferences: [],
        nutritionalGoal: 'balanced',
        hasSetPreferences: false
    };
}

// Save user preferences to localStorage
function saveUserPreferences(preferences) {
    try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
        console.warn('Could not save preferences:', e);
    }
}

// Load order history from localStorage
function loadOrderHistory() {
    try {
        const stored = localStorage.getItem(ORDER_HISTORY_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not load order history:', e);
    }
    return [];
}

// Add item to order history
window.addToOrderHistory = function(itemName) {
    try {
        const history = loadOrderHistory();
        if (!history.includes(itemName)) {
            history.push(itemName);
            // Keep only last 20 items
            const trimmed = history.slice(-20);
            localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(trimmed));
        }
    } catch (e) {
        console.warn('Could not save order history:', e);
    }
};

// Update the preferences modal UI
function updatePreferencesModal(preferences) {
    // Update dietary checkboxes
    const dietaryCheckboxes = document.querySelectorAll('input[name="dietary"]');
    dietaryCheckboxes.forEach(checkbox => {
        checkbox.checked = preferences.dietaryPreferences.includes(checkbox.value);
    });

    // Update goal radio buttons
    const goalRadios = document.querySelectorAll('input[name="goal"]');
    goalRadios.forEach(radio => {
        radio.checked = radio.value === preferences.nutritionalGoal;
    });
}

// Open preferences modal
window.openPreferencesModal = function() {
    const overlay = document.getElementById('preferencesModalOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

// Close preferences modal
window.closePreferencesModal = function() {
    const overlay = document.getElementById('preferencesModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Save preferences from modal
window.savePreferences = function() {
    const dietaryCheckboxes = document.querySelectorAll('input[name="dietary"]:checked');
    const goalRadio = document.querySelector('input[name="goal"]:checked');

    const preferences = {
        dietaryPreferences: Array.from(dietaryCheckboxes).map(cb => cb.value),
        nutritionalGoal: goalRadio ? goalRadio.value : 'balanced',
        hasSetPreferences: true
    };

    saveUserPreferences(preferences);
    closePreferencesModal();
    loadRecommendations();
};

// Load recommendations from API
async function loadRecommendations() {
    const section = document.getElementById('recommendationsSection');
    const track = document.getElementById('recommendationsTrack');
    const subtitle = document.getElementById('recommendationsSubtitle');

    if (!section || !track) return;

    // Show loading state
    track.innerHTML = `
        <div class="recommendation-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Empfehlungen werden geladen...</span>
        </div>
    `;
    section.style.display = 'block';

    try {
        const preferences = loadUserPreferences();
        const orderHistory = loadOrderHistory();

        const response = await fetch('/.netlify/functions/get-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dietaryPreferences: preferences.dietaryPreferences,
                nutritionalGoal: preferences.nutritionalGoal,
                previousOrders: orderHistory,
                count: 4
            })
        });

        if (!response.ok) {
            throw new Error('Failed to load recommendations');
        }

        const data = await response.json();

        if (data.recommendations && data.recommendations.length > 0) {
            renderRecommendations(data.recommendations);

            // Update subtitle based on preferences
            if (preferences.hasSetPreferences) {
                const goalLabels = {
                    'fitness': 'Fitness & Muskelaufbau',
                    'wellness': 'Wellness & Leichtigkeit',
                    'energy': 'Energie & Vitalität',
                    'balanced': 'Ausgewogen'
                };
                const dietaryText = preferences.dietaryPreferences.length > 0
                    ? preferences.dietaryPreferences.join(', ') + ' · '
                    : '';
                subtitle.textContent = `${dietaryText}${goalLabels[preferences.nutritionalGoal] || 'Ausgewogen'}`;
            } else {
                subtitle.textContent = 'Basierend auf der Tageszeit und beliebten Gerichten';
            }

            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        // Hide section on error
        section.style.display = 'none';
    }
}

// Render recommendation cards
function renderRecommendations(recommendations) {
    const track = document.getElementById('recommendationsTrack');
    if (!track) return;

    const TAG_DISPLAY_NAMES = {
        'vegetarisch': 'Vegetarisch',
        'glutenfrei': 'Glutenfrei',
        'proteinreich': 'Proteinreich',
        'sättigend': 'Sättigend',
        'belebend': 'Belebend',
        'immunstärkend': 'Immunstärkend'
    };

    track.innerHTML = recommendations.map(item => {
        const hasImage = item.image ? true : false;
        const price = item.price ? `€ ${item.price}`.replace('.', ',') : '';
        const tags = (item.tags || [])
            .slice(0, 2)
            .map(tag => TAG_DISPLAY_NAMES[tag.toLowerCase()] || tag)
            .join(' · ');

        const reason = item.reasons && item.reasons.length > 0
            ? `<span class="recommendation-reason">${item.reasons[0]}</span>`
            : '';

        return `
            <div class="recommendation-card" onclick="scrollToMenuItem('${item.name.replace(/'/g, "\\'")}')">
                ${hasImage ? `
                    <div class="recommendation-image">
                        <img src="${item.image}" alt="${item.name}" loading="lazy">
                    </div>
                ` : `
                    <div class="recommendation-image recommendation-image-placeholder">
                        <span class="recommendation-icon">${getItemEmoji(item.name)}</span>
                    </div>
                `}
                <div class="recommendation-content">
                    <h4 class="recommendation-name">${item.name}</h4>
                    ${tags ? `<span class="recommendation-tags">${tags}</span>` : ''}
                    ${reason}
                    <span class="recommendation-price">${price}</span>
                </div>
            </div>
        `;
    }).join('');

    // Update arrow visibility
    updateCarouselArrows();
}

// Get emoji for item based on name
function getItemEmoji(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('kaffee') || lowerName.includes('coffee') || lowerName.includes('latte')) return '☕';
    if (lowerName.includes('ei') || lowerName.includes('egg')) return '🥚';
    if (lowerName.includes('bowl')) return '🥣';
    if (lowerName.includes('avocado') || lowerName.includes('avo')) return '🥑';
    if (lowerName.includes('saft') || lowerName.includes('juice')) return '🥤';
    if (lowerName.includes('pancake') || lowerName.includes('pfannkuchen')) return '🥞';
    if (lowerName.includes('toast') || lowerName.includes('bread') || lowerName.includes('brot')) return '🍞';
    if (lowerName.includes('porridge') || lowerName.includes('hafer') || lowerName.includes('oat')) return '🥣';
    if (lowerName.includes('berry') || lowerName.includes('beere')) return '🫐';
    if (lowerName.includes('shot')) return '🧴';
    if (lowerName.includes('tea') || lowerName.includes('tee')) return '🍵';
    return '🌿';
}

// Scroll to menu item when clicking a recommendation
window.scrollToMenuItem = function(itemName) {
    // Add to order history (user showed interest)
    addToOrderHistory(itemName);

    // Find the menu item card
    const menuItems = document.querySelectorAll('.menu-item-card');
    for (const card of menuItems) {
        const nameEl = card.querySelector('.menu-item-name');
        if (nameEl && nameEl.textContent.toLowerCase() === itemName.toLowerCase()) {
            // Scroll to the item
            const offset = 100;
            const elementPosition = card.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });

            // Highlight the card briefly
            card.classList.add('highlight-card');
            setTimeout(() => {
                card.classList.remove('highlight-card');
            }, 2000);

            return;
        }
    }

    // If item not found, scroll to menu section
    const menuSection = document.getElementById('menu');
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
    }
};

// Scroll the recommendations carousel
window.scrollRecommendations = function(direction) {
    const track = document.getElementById('recommendationsTrack');
    if (!track) return;

    const cardWidth = track.querySelector('.recommendation-card')?.offsetWidth || 280;
    const gap = 16; // Gap between cards
    const scrollAmount = cardWidth + gap;

    if (direction === 'left') {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Update arrows after scroll
    setTimeout(updateCarouselArrows, 300);
};

// Update carousel arrow visibility
function updateCarouselArrows() {
    const track = document.getElementById('recommendationsTrack');
    const leftArrow = document.querySelector('.carousel-arrow-left');
    const rightArrow = document.querySelector('.carousel-arrow-right');

    if (!track || !leftArrow || !rightArrow) return;

    const isAtStart = track.scrollLeft <= 0;
    const isAtEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 5;

    leftArrow.style.opacity = isAtStart ? '0.3' : '1';
    leftArrow.style.pointerEvents = isAtStart ? 'none' : 'auto';

    rightArrow.style.opacity = isAtEnd ? '0.3' : '1';
    rightArrow.style.pointerEvents = isAtEnd ? 'none' : 'auto';
}

// Add scroll listener to track
document.addEventListener('DOMContentLoaded', function() {
    const track = document.getElementById('recommendationsTrack');
    if (track) {
        track.addEventListener('scroll', debounce(updateCarouselArrows, 50));
    }
});

// Close preferences modal on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const prefsOverlay = document.getElementById('preferencesModalOverlay');
        if (prefsOverlay && prefsOverlay.classList.contains('active')) {
            closePreferencesModal();
        }
    }
});

// Log initialization
console.log('Premium restaurant app initialized.');
