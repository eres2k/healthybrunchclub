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
            // Add bot response to UI
            addChatMessage('bot', data.response);

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
function addChatMessage(role, content) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Log initialization
console.log('Premium restaurant app initialized.');
