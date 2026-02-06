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
    initScrollReveal();
    initHeroEntrance();
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
// ASK AVA CHATBOT
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
        const response = await fetch('/.netlify/functions/ask-ava', {
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
                addChatMessage('bot', data.error || 'du sendest zu viele Nachrichten. Bitte warte kurz und versuche es dann nochmal.');
            } else if (response.status === 400) {
                // Bad request (message too long, etc.)
                addChatMessage('bot', data.error || 'deine Nachricht konnte nicht verarbeitet werden. Bitte versuche es mit einer kürzeren Nachricht.');
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

            // Handle reservation action if present
            if (data.reservationAction && data.reservationAction.type === 'open_reservation') {
                handleReservationAction(data.reservationAction);
            }
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

// Format chat message for display with line breaks and bullet points
function formatChatMessage(content) {
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Escape the content first
    let formatted = escapeHtml(content);

    // Convert line breaks to <br> tags
    formatted = formatted.replace(/\n/g, '<br>');

    // Convert bullet points (• or -) at the start of lines to styled list items
    formatted = formatted.replace(/(^|<br>)(•|-)\s+/g, '$1<span class="chat-bullet">•</span> ');

    // Make text between ** bold (markdown-style)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    return formatted;
}

// Add Chat Message to UI
function addChatMessage(role, content, recommendedProducts = []) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format the message with line breaks and basic styling
    // Escape HTML but preserve line breaks and bullet points
    const formattedContent = formatChatMessage(content);
    contentDiv.innerHTML = formattedContent;

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

// Handle reservation action from chatbot
function handleReservationAction(action) {
    // Small delay to let the message appear first
    setTimeout(() => {
        // Scroll to reservation section
        const reservationSection = document.getElementById('reservierung');
        if (reservationSection) {
            const offset = 80;
            const targetPosition = reservationSection.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }

        // Close the chatbot window
        const container = document.getElementById('chatbotContainer');
        const chatWindow = document.getElementById('chatbotWindow');
        if (container && chatWindow) {
            container.classList.remove('open');
            chatWindow.style.display = 'none';
        }

        // Store the complete reservation data for auto-fill
        window.pendingReservationAction = {
            date: action.date,
            time: action.time,
            guests: action.guests || 2,
            name: action.name || '',
            email: action.email || '',
            phone: action.phone || ''
        };

        // If date is provided, try to auto-select it after dates load
        if (action.date) {
            // Trigger auto-selection after a short delay to allow dates to load
            setTimeout(() => {
                autoSelectReservationDate(action.date, action.time);
            }, 500);
        }
    }, 800);
}

// Auto-select a date in the reservation widget
function autoSelectReservationDate(targetDate, targetTime) {
    const dateCards = document.querySelectorAll('.date-card');

    // If no date cards yet, dates might still be loading - retry after delay
    if (dateCards.length === 0) {
        console.log('Date cards not loaded yet, retrying...');
        setTimeout(() => autoSelectReservationDate(targetDate, targetTime), 500);
        return;
    }

    for (const card of dateCards) {
        // Try to find the date from the card's click handler or data
        const cardDateText = card.querySelector('.date-day')?.textContent;
        const cardMonthText = card.querySelector('.date-month')?.textContent;

        if (cardDateText && cardMonthText) {
            // Parse the target date
            const target = new Date(targetDate);
            const targetDay = target.getDate();
            const targetMonth = target.toLocaleDateString('de-DE', { month: 'long' });

            // Check if this card matches
            if (parseInt(cardDateText) === targetDay && cardMonthText.toLowerCase() === targetMonth.toLowerCase()) {
                // Click this card to select the date
                card.click();

                // If time is provided, auto-select it after time slots load
                if (targetTime) {
                    // Wait for time slots to load (they load via fetch after date selection)
                    waitForTimeSlotsAndSelect(targetTime);
                } else {
                    // No time specified, just fill the form after a delay
                    setTimeout(() => autoFillReservationForm(), 800);
                }

                return;
            }
        }
    }

    // If no matching date found, log it
    console.log('Could not auto-select date:', targetDate, '- dates available:', dateCards.length);
}

// Wait for time slots to load and then select the target time
function waitForTimeSlotsAndSelect(targetTime, attempts = 0) {
    const maxAttempts = 10;
    const timeSlots = document.querySelectorAll('#time-slots-container .time-slot');

    if (timeSlots.length > 0) {
        autoSelectReservationTime(targetTime);
    } else if (attempts < maxAttempts) {
        // Time slots not loaded yet, retry
        setTimeout(() => waitForTimeSlotsAndSelect(targetTime, attempts + 1), 300);
    } else {
        console.log('Time slots did not load after', maxAttempts, 'attempts');
        // Still try to fill the form with available data
        autoFillReservationForm();
    }
}

// Auto-select a time slot in the reservation widget
function autoSelectReservationTime(targetTime) {
    const timeSlots = document.querySelectorAll('#time-slots-container .time-slot');

    // Normalize the target time (ensure HH:MM format)
    const normalizedTarget = targetTime.includes(':') ? targetTime : targetTime + ':00';

    for (const slot of timeSlots) {
        const slotTime = slot.dataset.time || slot.textContent.replace(' Uhr', '').trim();

        if (slotTime === normalizedTarget || slotTime === targetTime) {
            slot.click();

            // After selecting time, fill in the other form fields from pendingReservationAction
            setTimeout(() => {
                autoFillReservationForm();
            }, 300);

            return;
        }
    }

    console.log('Could not auto-select time:', targetTime);
}

// Auto-fill the reservation form fields with chatbot-collected data
function autoFillReservationForm() {
    const action = window.pendingReservationAction;
    if (!action) return;

    // Try both form structures: index.html (#reservation-form) and reservation-widget.html ([data-reservation-form])
    const form = document.querySelector('#reservation-form') || document.querySelector('[data-reservation-form]');
    if (!form) return;

    // Fill guests (index.html uses #guest-count select, widget uses input[name="guests"])
    if (action.guests) {
        const guestsSelect = document.getElementById('guest-count');
        const guestsInput = form.querySelector('[name="guests"], [data-input-guests]');

        if (guestsSelect) {
            // For select dropdown, find the matching option
            const guestValue = action.guests >= 8 ? '8' : String(action.guests);
            guestsSelect.value = guestValue;
            guestsSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (guestsInput) {
            guestsInput.value = action.guests;
            guestsInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Fill name (index.html uses #guest-name, widget uses input[name="name"])
    if (action.name) {
        const nameInput = document.getElementById('guest-name') || form.querySelector('[name="name"]');
        if (nameInput) {
            nameInput.value = action.name;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Fill email (index.html uses #guest-email, widget uses input[name="email"])
    if (action.email) {
        const emailInput = document.getElementById('guest-email') || form.querySelector('[name="email"]');
        if (emailInput) {
            emailInput.value = action.email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Fill phone (index.html uses #guest-phone, widget uses input[name="phone"])
    if (action.phone) {
        const phoneInput = document.getElementById('guest-phone') || form.querySelector('[name="phone"]');
        if (phoneInput) {
            phoneInput.value = action.phone;
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Auto-advance to step 3 (details) after a short delay
    setTimeout(() => {
        // Try widget next button first
        const widgetNextButton = document.querySelector('[data-reservation-step="2"] [data-action-next]');
        if (widgetNextButton) {
            widgetNextButton.click();
            return;
        }

        // For index.html, show the guest-details step directly
        const guestDetailsStep = document.getElementById('guest-details');
        const timeSelectionStep = document.getElementById('time-selection');
        if (guestDetailsStep && timeSelectionStep) {
            timeSelectionStep.style.display = 'none';
            guestDetailsStep.style.display = 'block';
        }
    }, 500);
}

// Expose for external use
window.handleReservationAction = handleReservationAction;

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

// ===============================================
// AWWWARDS-STYLE SCROLL REVEAL ANIMATIONS
// ===============================================

function initScrollReveal() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Immediately show all elements
        document.querySelectorAll('[data-reveal]').forEach(function(el) {
            el.classList.add('revealed');
        });
        return;
    }

    var revealElements = document.querySelectorAll('[data-reveal]');
    if (!revealElements.length) return;

    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach(function(el) {
        revealObserver.observe(el);
    });
}

// Hero entrance animation
function initHeroEntrance() {
    var heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;

    // Trigger hero animation after loading screen fades
    window.addEventListener('load', function() {
        setTimeout(function() {
            heroContent.classList.add('hero-loaded');
        }, 2200); // slightly after loading screen hides
    });

    // Fallback: trigger after 4s regardless
    setTimeout(function() {
        if (heroContent && !heroContent.classList.contains('hero-loaded')) {
            heroContent.classList.add('hero-loaded');
        }
    }, 4000);
}

// ===============================================
// PREMIUM AWARD-WINNING EFFECTS
// Smooth scroll, parallax layers, magnetic cursor,
// stagger reveals, scroll progress, hero fade
// ===============================================

function initPremiumEffects() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    initScrollProgress();
    initHeroScrollFade();
    initStaggerReveal();
    initMagneticButtons();
    initCursorGlow();
    initParallaxFloat();
    initSmoothCounters();
    initScrollWowEffects();
}

// --- Scroll Progress Bar ---
function initScrollProgress() {
    var progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', function() {
        var scrollTop = window.pageYOffset;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = scrollPercent + '%';
    }, { passive: true });
}

// --- Hero Scroll Fade (content fades as you scroll down) ---
function initHeroScrollFade() {
    var hero = document.querySelector('.hero-premium');
    if (!hero) return;

    var heroHeight = hero.offsetHeight;

    window.addEventListener('scroll', function() {
        var scrollTop = window.pageYOffset;

        if (scrollTop > heroHeight * 0.3) {
            hero.classList.add('hero-scrolled');
        } else {
            hero.classList.remove('hero-scrolled');
        }
    }, { passive: true });
}

// --- Stagger Reveal for Child Elements ---
function initStaggerReveal() {
    var staggerElements = document.querySelectorAll('[data-stagger]');
    if (!staggerElements.length) return;

    var staggerObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                staggerObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    staggerElements.forEach(function(el) {
        staggerObserver.observe(el);
    });
}

// --- Magnetic Button Effect (desktop only) ---
function initMagneticButtons() {
    if (window.innerWidth <= 768 || 'ontouchstart' in window) return;

    var magneticBtns = document.querySelectorAll('.btn-magnetic');
    magneticBtns.forEach(function(btn) {
        btn.addEventListener('mousemove', function(e) {
            var rect = btn.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = 'translate(' + (x * 0.2) + 'px, ' + (y * 0.2) + 'px)';
        });

        btn.addEventListener('mouseleave', function() {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

// --- Cursor Glow Effect (desktop only) ---
function initCursorGlow() {
    if (window.innerWidth <= 768 || 'ontouchstart' in window) return;

    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.opacity = '0';
    document.body.appendChild(glow);

    var mouseX = 0, mouseY = 0;
    var glowX = 0, glowY = 0;
    var rafId = null;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glow.style.opacity = '1';

        if (!rafId) {
            rafId = requestAnimationFrame(updateGlow);
        }
    });

    document.addEventListener('mouseleave', function() {
        glow.style.opacity = '0';
    });

    function updateGlow() {
        glowX += (mouseX - glowX) * 0.15;
        glowY += (mouseY - glowY) * 0.15;

        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';

        if (Math.abs(mouseX - glowX) > 0.5 || Math.abs(mouseY - glowY) > 0.5) {
            rafId = requestAnimationFrame(updateGlow);
        } else {
            rafId = null;
        }
    }
}

// --- Parallax Float Elements ---
function initParallaxFloat() {
    if (window.innerWidth <= 768) return;

    var floatElements = document.querySelectorAll('.parallax-float');
    if (!floatElements.length) return;

    window.addEventListener('scroll', function() {
        var scrollTop = window.pageYOffset;

        floatElements.forEach(function(el) {
            var speed = parseFloat(el.dataset.speed) || 0.05;
            var rect = el.getBoundingClientRect();
            var elementCenter = rect.top + rect.height / 2;
            var windowCenter = window.innerHeight / 2;
            var offset = (elementCenter - windowCenter) * speed;

            el.style.transform = 'translateY(' + offset + 'px)';
        });
    }, { passive: true });
}

// --- Smooth Number Counter Animation ---
function initSmoothCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(function(el) {
        counterObserver.observe(el);
    });
}

function animateCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    var duration = parseInt(el.dataset.duration, 10) || 2000;
    var suffix = el.dataset.suffix || '';
    var start = 0;
    var startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease out cubic
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);

        el.textContent = current + suffix;

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = target + suffix;
        }
    }

    requestAnimationFrame(step);
}

// --- Scroll Wow Effects (progressive section reveals) ---
function initScrollWowEffects() {
    // 1. Section depth effect - sections smoothly fade/scale as they enter
    var sections = document.querySelectorAll('.menu-premium, .about-premium, .elegant-section, .footer-premium');
    sections.forEach(function(section) {
        section.classList.add('wow-section');
    });

    var sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('wow-visible');
            }
        });
    }, {
        threshold: [0, 0.1, 0.2],
        rootMargin: '0px 0px -80px 0px'
    });

    document.querySelectorAll('.wow-section').forEach(function(el) {
        sectionObserver.observe(el);
    });

    // 2. Hero overlay parallax depth (darkens as you scroll)
    var heroOverlay = document.querySelector('.hero-overlay');
    if (heroOverlay) {
        window.addEventListener('scroll', function() {
            var scrollTop = window.pageYOffset;
            var heroHeight = window.innerHeight;
            if (scrollTop < heroHeight) {
                var ratio = scrollTop / heroHeight;
                var opacity = 0.4 + (ratio * 0.35);
                heroOverlay.style.background = 'linear-gradient(to bottom, rgba(0,0,0,' + (opacity * 0.7) + '), rgba(0,0,0,' + opacity + '))';
            }
        }, { passive: true });
    }

    // 3. Scroll-activated text emphasis on about lead
    var aboutLead = document.querySelector('.about-lead');
    if (aboutLead) {
        var leadObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('wow-text-emphasis');
                    leadObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        leadObserver.observe(aboutLead);
    }

    // 4. Progressive reveal for about paragraphs
    var aboutParagraphs = document.querySelectorAll('.about-content p:not(.about-lead):not(.about-cta)');
    aboutParagraphs.forEach(function(p, i) {
        p.classList.add('wow-paragraph');
        p.style.transitionDelay = (i * 0.12) + 's';
    });

    var paragraphObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('wow-visible');
                paragraphObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.wow-paragraph').forEach(function(el) {
        paragraphObserver.observe(el);
    });

    // 5. Scroll indicator fade on scroll
    var scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        window.addEventListener('scroll', function() {
            var scrollTop = window.pageYOffset;
            if (scrollTop > 150) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.pointerEvents = 'none';
            } else {
                scrollIndicator.style.opacity = String(1 - (scrollTop / 150));
                scrollIndicator.style.pointerEvents = '';
            }
        }, { passive: true });
    }

    // 6. Section divider glow on scroll
    var dividers = document.querySelectorAll('.section-divider');
    var dividerObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('divider-glow');
            }
        });
    }, { threshold: 0.5 });

    dividers.forEach(function(d) { dividerObserver.observe(d); });
}

// Initialize premium effects after DOM + loading screen
document.addEventListener('DOMContentLoaded', function() {
    // Wait for loading screen to finish before initializing effects
    setTimeout(initPremiumEffects, 2200);
});

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
