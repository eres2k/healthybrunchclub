// Simplified initialization
function initializeView() {
    document.querySelectorAll('[data-section]').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    setActiveSection('dashboard');
}
setTimeout(initializeView, 100);

// Robust section switching
function setActiveSection(section) {
    console.log('Setting active section:', section);

    document.querySelectorAll('[data-section]').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    document.querySelectorAll('[data-category-section]').forEach(el => {
        el.style.display = 'none';
    });

    const sectionEl = document.querySelector(`[data-section="${section}"]`);
    if (sectionEl) {
        sectionEl.style.display = 'block';
        sectionEl.classList.add('active');
        console.log('Section found and activated:', section);

        switch (section) {
            case 'dashboard': break;
            case 'inspections':
                if (!state.currentCategory) {
                    showInspectionOverview();
                }
                break;
            case 'reports': renderReports(); break;
            case 'analytics': renderAnalytics(); break;
            case 'settings': renderSettings(); break;
            default: console.warn('Unknown section:', section);
        }
    } else {
        console.error('Section not found:', section);
    }

    Object.entries(elements.navItems).forEach(([key, item]) => {
        if (item) {
            item.classList.toggle('active', key === section);
        }
    });

    if (window.innerWidth <= 1024) {
        closeMobileMenu();
    }

    if (section !== 'inspections') {
        state.currentCategory = null;
    }
}

// Navigation listeners
function attachNavigationListeners() {
    Object.entries(elements.navItems).forEach(([section, element]) => {
        if (element) {
            element.removeEventListener('click', handleNavClick);
            element.addEventListener('click', handleNavClick);
            element.dataset.section = section;
        }
    });
}

function handleNavClick(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    if (section) {
        setActiveSection(section);
    }
}

attachNavigationListeners();

// Global exposure
window.setActiveSection = setActiveSection;
