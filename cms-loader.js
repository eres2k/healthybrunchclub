// CMS Loader with Traditional Menu Card Design and PDF Export
// Supports 3-column layout, modal popups, and PDF generation

let allMenuCategories = [];
let menuModal = null;

document.addEventListener('DOMContentLoaded', function() {
    // Load external libraries
    loadExternalLibraries();
    
    // Initialize menu
    loadMenuFromCMS();
    loadEventsFromCMS();
    
    // Create modal element
    createMenuModal();
    
    // Add PDF download listener
    addPDFDownloadListener();
});

// Load external libraries for PDF generation
function loadExternalLibraries() {
    // Load jsPDF
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(jsPDFScript);
    
    // Load html2canvas for better PDF rendering
    const html2canvasScript = document.createElement('script');
    html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(html2canvasScript);
}

// Load Menu from CMS
async function loadMenuFromCMS() {
    try {
        console.log('Loading menu from CMS...');
        const response = await fetch('/.netlify/functions/get-menu');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const menuData = await response.json();
        console.log('Menu data loaded:', menuData);
        
        allMenuCategories = menuData;
        displayTraditionalMenu(menuData);
        createFilterButtons(menuData);
        
    } catch (error) {
        console.error('Error loading menu:', error);
        displayFallbackMenu();
    }
}

// Create Filter Buttons
function createFilterButtons(menuData) {
    const filtersContainer = document.getElementById('menuFilters');
    if (!filtersContainer) return;
    
    // Clear container
    filtersContainer.innerHTML = '';
    
    // Add "all" button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.setAttribute('data-filter', 'all');
    allBtn.textContent = 'alle anzeigen';
    allBtn.addEventListener('click', handleFilterClick);
    filtersContainer.appendChild(allBtn);
    
    // Add category filters
    menuData.forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-btn';
        filterBtn.setAttribute('data-filter', category.title.toLowerCase().replace(/\s+/g, '-'));
        filterBtn.textContent = category.title.toLowerCase();
        filterBtn.addEventListener('click', handleFilterClick);
        filtersContainer.appendChild(filterBtn);
    });
}

// Handle Filter Click
function handleFilterClick(e) {
    const filterValue = e.target.getAttribute('data-filter');
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter menu
    if (filterValue === 'all') {
        displayTraditionalMenu(allMenuCategories);
    } else {
        const filtered = allMenuCategories.filter(category => 
            category.title.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
        displayTraditionalMenu(filtered);
    }
}

// Display Traditional Menu Card with 3 Columns
function displayTraditionalMenu(menuData) {
    const menuContainer = document.getElementById('menuGrid') || document.getElementById('menuContainer');
    
    if (!menuData || menuData.length === 0) {
        menuContainer.innerHTML = '<div class="menu-loading">Keine Einträge gefunden.</div>';
        return;
    }
    
    // Create menu card header with logo
    const menuHTML = `
        <div class="menu-card-header">
            <img src="content/images/logo.png" alt="Healthy Brunch Club" class="menu-logo">
            <h2 class="menu-card-title">Speisekarte</h2>
            <p class="menu-card-subtitle">100% bio und mit ganz viel liebe zubereitet</p>
        </div>
        
        <div class="menu-actions">
            <button class="download-menu-btn" id="downloadPdfBtn">
                <span>📄</span>
                <span>PDF Download</span>
            </button>
        </div>
        
        <div class="menu-filters" id="menuFilters">
            <!-- Filter buttons will be added here -->
        </div>
        
        <div class="menu-columns-wrapper">
            ${menuData.map((category, index) => {
                // Handle category image URL
                let imageUrl = '';
                if (category.image) {
                    imageUrl = category.image.startsWith('/') ? category.image : `/${category.image}`;
                }
                
                return `
                    <div class="menu-category" data-category="${category.title.toLowerCase().replace(/\s+/g, '-')}">
                        <div class="category-header">
                            <h3 class="category-title">${category.title}</h3>
                            ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                        </div>
                        
                        <div class="menu-items-grid">
                            ${category.items.map((item, itemIndex) => {
                                // Check if item has image
                                const hasImage = item.image ? true : false;
                                
                                // Create unique ID for item
                                const itemId = `item-${category.order || index}-${itemIndex}`;
                                
                                return `
                                <div class="menu-item-card ${hasImage ? 'has-image' : ''}" 
                                     data-item-id="${itemId}"
                                     onclick="openMenuItemModal('${itemId}')"
                                     role="button"
                                     tabindex="0">
                                    ${item.special ? '<div class="menu-item-badge">Empfehlung</div>' : ''}
                                    ${hasImage ? '<div class="has-image-indicator"></div>' : ''}
                                    
                                    <div class="menu-item-header">
                                        <h4 class="menu-item-name">${item.name}</h4>
                                        ${item.price ? `<span class="menu-item-price">€${item.price}</span>` : ''}
                                    </div>
                                    
                                    <div class="menu-item-description">
                                        ${truncateDescription(processRichText(item.description), 80)}
                                    </div>
                                    
                                    ${item.nutrition && Object.keys(item.nutrition).length > 0 ? `
                                        <div class="nutrition-info">
                                            ${item.nutrition.calories ? `
                                                <div class="nutrition-item">
                                                    <span class="nutrition-value">${item.nutrition.calories}</span>
                                                    <span class="nutrition-label">kcal</span>
                                                </div>
                                            ` : ''}
                                            ${item.nutrition.protein ? `
                                                <div class="nutrition-item">
                                                    <span class="nutrition-value">${item.nutrition.protein}</span>
                                                    <span class="nutrition-label">protein</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                    
                                    ${item.tags && item.tags.length > 0 ? `
                                        <div class="menu-item-tags">
                                            ${item.tags.slice(0, 3).map(tag => `<span class="menu-tag">${tag}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    menuContainer.innerHTML = menuHTML;
    
    // Store menu data for modal access
    window.menuData = menuData;
    
    // Re-create filter buttons after updating HTML
    createFilterButtons(menuData);
    
    // Add PDF download listener to new button
    const pdfBtn = document.getElementById('downloadPdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', generateMenuPDF);
    }
}

// Truncate description for card display
function truncateDescription(html, maxLength) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
    }
    return html;
}

// Create Menu Item Modal
function createMenuModal() {
    const modalHTML = `
        <div class="menu-item-modal" id="menuItemModal">
            <div class="modal-content">
                <button class="modal-close" onclick="closeMenuItemModal()">&times;</button>
                <div id="modalContent">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    menuModal = document.getElementById('menuItemModal');
    
    // Close modal on background click
    menuModal.addEventListener('click', function(e) {
        if (e.target === menuModal) {
            closeMenuItemModal();
        }
    });
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuModal.classList.contains('show')) {
            closeMenuItemModal();
        }
    });
}

// Open Menu Item Modal
window.openMenuItemModal = function(itemId) {
    if (!window.menuData) return;
    
    // Find the item
    let foundItem = null;
    let foundCategory = null;
    
    for (const category of window.menuData) {
        const itemIndex = itemId.split('-').pop();
        const categoryIndex = itemId.split('-')[1];
        
        if (category.order == categoryIndex || window.menuData.indexOf(category) == categoryIndex) {
            if (category.items[itemIndex]) {
                foundItem = category.items[itemIndex];
                foundCategory = category;
                break;
            }
        }
    }
    
    if (!foundItem) return;
    
    // Handle image URL
    let imageHTML = '';
    if (foundItem.image) {
        const imageUrl = foundItem.image.startsWith('/') ? foundItem.image : `/${foundItem.image}`;
        imageHTML = `<img src="${imageUrl}" alt="${foundItem.name}" class="modal-image">`;
    }
    
    // Create modal content
    const modalContentHTML = `
        ${imageHTML}
        <div class="modal-body">
            <div class="modal-header">
                <h3 class="modal-title">${foundItem.name}</h3>
                ${foundItem.price ? `<div class="modal-price">€${foundItem.price}</div>` : ''}
            </div>
            
            <div class="modal-description">
                ${processRichText(foundItem.description)}
            </div>
            
            ${foundItem.nutrition && Object.keys(foundItem.nutrition).length > 0 ? `
                <div class="modal-nutrition">
                    <h4>Nährwerte</h4>
                    <div class="nutrition-grid">
                        ${foundItem.nutrition.calories ? `
                            <div class="nutrition-item">
                                <span class="nutrition-label">Kalorien:</span>
                                <span class="nutrition-value">${foundItem.nutrition.calories}</span>
                            </div>
                        ` : ''}
                        ${foundItem.nutrition.protein ? `
                            <div class="nutrition-item">
                                <span class="nutrition-label">Protein:</span>
                                <span class="nutrition-value">${foundItem.nutrition.protein}</span>
                            </div>
                        ` : ''}
                        ${foundItem.nutrition.carbs ? `
                            <div class="nutrition-item">
                                <span class="nutrition-label">Kohlenhydrate:</span>
                                <span class="nutrition-value">${foundItem.nutrition.carbs}</span>
                            </div>
                        ` : ''}
                        ${foundItem.nutrition.fat ? `
                            <div class="nutrition-item">
                                <span class="nutrition-label">Fett:</span>
                                <span class="nutrition-value">${foundItem.nutrition.fat}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${foundItem.tags && foundItem.tags.length > 0 ? `
                <div class="modal-tags">
                    ${foundItem.tags.map(tag => `<span class="modal-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('modalContent').innerHTML = modalContentHTML;
    menuModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close Menu Item Modal
window.closeMenuItemModal = function() {
    menuModal.classList.remove('show');
    document.body.style.overflow = '';
}

// Process rich text from markdown
function processRichText(text) {
    if (!text) return '';
    
    // Convert markdown to HTML
    let html = text;
    
    // Convert bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already
    if (!html.startsWith('<p>')) {
        html = `<p>${html}</p>`;
    }
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    return html;
}

// Add PDF Download Listener
function addPDFDownloadListener() {
    // Wait for button to be created
    setTimeout(() => {
        const pdfBtn = document.getElementById('downloadPdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', generateMenuPDF);
        }
    }, 1000);
}

// Generate PDF of Menu
async function generateMenuPDF() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        alert('PDF library is still loading. Please try again in a moment.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    // Create new PDF document
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Set fonts
    doc.setFont('helvetica');
    
    // Add logo
    const logoImg = new Image();
    logoImg.src = 'content/images/logo.png';
    
    logoImg.onload = function() {
        // Add logo
        doc.addImage(logoImg, 'PNG', 75, 10, 60, 33);
        
        // Add title
        doc.setFontSize(24);
        doc.setTextColor(30, 74, 60); // Forest green
        doc.text('SPEISEKARTE', 105, 55, { align: 'center' });
        
        // Add subtitle
        doc.setFontSize(12);
        doc.setTextColor(107, 107, 107);
        doc.text('100% bio und mit ganz viel liebe zubereitet', 105, 62, { align: 'center' });
        
        // Draw decorative line
        doc.setDrawColor(218, 193, 150);
        doc.setLineWidth(0.5);
        doc.line(30, 70, 180, 70);
        
        // Starting positions
        let yPos = 80;
        let columnWidth = 60;
        let columnX = [20, 75, 130]; // Three columns
        let currentColumn = 0;
        const pageHeight = 280;
        const bottomMargin = 20;
        
        // Process each category
        allMenuCategories.forEach((category, catIndex) => {
            // Check if we need to move to next column or page
            if (yPos > pageHeight - bottomMargin - 40) {
                currentColumn++;
                if (currentColumn > 2) {
                    doc.addPage();
                    currentColumn = 0;
                    yPos = 30;
                }
                yPos = currentColumn === 0 ? 80 : 30;
            }
            
            // Category title
            doc.setFontSize(14);
            doc.setTextColor(30, 74, 60);
            doc.setFont('helvetica', 'bold');
            const categoryLines = doc.splitTextToSize(category.title.toUpperCase(), columnWidth);
            doc.text(categoryLines, columnX[currentColumn], yPos);
            yPos += categoryLines.length * 6 + 5;
            
            // Category items
            category.items.forEach((item, itemIndex) => {
                // Check if we need to move to next column or page
                if (yPos > pageHeight - bottomMargin - 20) {
                    currentColumn++;
                    if (currentColumn > 2) {
                        doc.addPage();
                        currentColumn = 0;
                        yPos = 30;
                    }
                    yPos = currentColumn === 0 ? 80 : 30;
                }
                
                // Item name and price
                doc.setFontSize(11);
                doc.setTextColor(30, 74, 60);
                doc.setFont('helvetica', 'bold');
                
                const itemName = item.name;
                const itemPrice = item.price ? `€${item.price}` : '';
                
                // Calculate available width for name
                const priceWidth = doc.getTextWidth(itemPrice);
                const nameMaxWidth = columnWidth - priceWidth - 5;
                
                // Wrap name if too long
                const nameLines = doc.splitTextToSize(itemName, nameMaxWidth);
                doc.text(nameLines, columnX[currentColumn], yPos);
                
                // Add price aligned to right
                if (itemPrice) {
                    doc.text(itemPrice, columnX[currentColumn] + columnWidth, yPos, { align: 'right' });
                }
                
                yPos += nameLines.length * 4 + 2;
                
                // Item description (simplified)
                doc.setFontSize(9);
                doc.setTextColor(107, 107, 107);
                doc.setFont('helvetica', 'normal');
                
                // Clean description
                const cleanDesc = item.description
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/\n/g, ' ')
                    .substring(0, 100);
                
                const descLines = doc.splitTextToSize(cleanDesc + (cleanDesc.length < item.description.length ? '...' : ''), columnWidth);
                doc.text(descLines, columnX[currentColumn], yPos);
                yPos += descLines.length * 3.5;
                
                // Tags
                if (item.tags && item.tags.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(139, 148, 116);
                    const tagsText = item.tags.slice(0, 3).join(' • ');
                    doc.text(tagsText, columnX[currentColumn], yPos);
                    yPos += 4;
                }
                
                yPos += 6; // Space between items
            });
            
            yPos += 8; // Space between categories
        });
        
        // Add footer
        doc.setFontSize(10);
        doc.setTextColor(107, 107, 107);
        doc.text('healthy brunch club wien • gumpendorfer straße 9 • 1060 wien', 105, 285, { align: 'center' });
        
        // Save PDF
        doc.save('healthy-brunch-club-menu.pdf');
    };
}

// Fallback Menu
function displayFallbackMenu() {
    const fallbackMenu = [
        {
            title: "eggcitements",
            order: 1,
            items: [
                {
                    name: "eggs any style",
                    price: "12.90",
                    description: "Wähle zwischen **Spiegelei**, **pochiert** oder **Rührei**\n\nServiert auf Süßkartoffel- und Avocadoscheiben mit sautierten Champignons oder Shiitake-Pilzen, garniert mit frischem Rucola, Sprossen und Kresse",
                    nutrition: {
                        calories: "320",
                        protein: "18g",
                        carbs: "22g",
                        fat: "16g"
                    },
                    tags: ["vegetarisch", "proteinreich"],
                    special: false
                },
                {
                    name: "omelette creation",
                    price: "13.90",
                    description: "Fluffiges Omelette aus 2 Bio-Eiern auf knusprigem Sauerteigbrot\n\n**Basis:** Zwiebel, Shiitake-Pilze, Spinat\n**Add-ons:** Tomaten, Speckwürfel, Käse oder Avocado",
                    nutrition: {
                        calories: "380",
                        protein: "20g",
                        carbs: "26g",
                        fat: "22g"
                    },
                    tags: ["vegetarisch", "anpassbar"],
                    special: false
                },
                {
                    name: "beggs enedict",
                    price: "14.90",
                    description: "Pochierte Bio-Eier auf Sauerteigbrot mit cremiger Avocado-Hollandaise\n\n*Wähle deine Beilage:*\n- Bio-Schinken\n- Räucherlachs\n- Gegrilltes Gemüse",
                    nutrition: {
                        calories: "420",
                        protein: "22g",
                        carbs: "28g",
                        fat: "24g"
                    },
                    tags: ["signature"],
                    special: true
                }
            ]
        },
        {
            title: "hafer dich lieb",
            order: 2,
            items: [
                {
                    name: "premium-porridge",
                    price: "9.90",
                    description: "Ein wärmender Genuss aus zarten **Bio-Haferflocken**, verfeinert mit Hanf- und Chiasamen, Kokosflocken und geriebenem Apfel. Ceylon-Zimt, geröstete Mandeln und frische Beeren",
                    nutrition: {
                        calories: "380",
                        protein: "12g",
                        carbs: "45g",
                        fat: "18g"
                    },
                    tags: ["glutenfrei", "lactosefrei", "darmfreundlich"],
                    special: false
                },
                {
                    name: "kokoscreme power-oats",
                    price: "11.90",
                    description: "Kraftvolle Haferflocken in cremiger Kokosmilch\n\n*Getoppt mit:* Hanf- und Chiasamen, frische Heidel- und Himbeeren, Kokosflocken, Ahornsirup",
                    nutrition: {
                        calories: "410",
                        protein: "14g",
                        carbs: "48g",
                        fat: "20g"
                    },
                    tags: ["vegan", "energizing"],
                    special: false
                }
            ]
        },
        {
            title: "avo-lution",
            order: 3,
            items: [
                {
                    name: "avocado bowl",
                    price: "8.90",
                    description: "Frisch zerdrückte Avocado, veredelt mit fein geriebenem Apfel für eine süß-frische Note, gekrönt von zart gerösteten Mandeln",
                    nutrition: {
                        calories: "285",
                        protein: "6g",
                        carbs: "18g",
                        fat: "24g"
                    },
                    tags: ["vegetarisch", "leicht", "nahrhaft"],
                    special: false
                },
                {
                    name: "avocado bread",
                    price: "12.90",
                    description: "Knuspriges Sauerteigbrot vom Öfferl, handwerklich gebacken, großzügig bestrichen mit cremiger, zerdrückter Avocado\n\n**Add-ons:** Ei / Bio-Speck / Bio-Lachs / Pilze",
                    nutrition: {
                        calories: "320",
                        protein: "8g",
                        carbs: "38g",
                        fat: "16g"
                    },
                    tags: ["vegetarisch", "herzhaft", "anpassbar"],
                    special: false
                }
            ]
        }
    ];
    
    allMenuCategories = fallbackMenu;
    displayTraditionalMenu(fallbackMenu);
    createFilterButtons(fallbackMenu);
}

// Load Events from CMS
async function loadEventsFromCMS() {
    try {
        console.log('Loading events from CMS...');
        const response = await fetch('/.netlify/functions/get-events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const eventsData = await response.json();
        console.log('Events data loaded:', eventsData);
        
        displayEvents(eventsData);
    } catch (error) {
        console.error('Error loading events:', error);
        displayFallbackEvent();
    }
}

// Display Events
function displayEvents(eventsData) {
    const eventWindow = document.getElementById('eventWindow');
    const eventContent = document.getElementById('eventContent');
    
    if (!eventsData || eventsData.length === 0) {
        eventWindow.style.display = 'none';
        return;
    }
    
    const nextEvent = eventsData[0];
    
    let imageUrl = '';
    if (nextEvent.featuredImage) {
        imageUrl = nextEvent.featuredImage.startsWith('/') ? nextEvent.featuredImage : `/${nextEvent.featuredImage}`;
    }
    
    let audioUrl = '';
    if (nextEvent.audioAnnouncement) {
        audioUrl = nextEvent.audioAnnouncement.startsWith('/') ? nextEvent.audioAnnouncement : `/${nextEvent.audioAnnouncement}`;
    }
    
    const eventDate = new Date(nextEvent.date);
    const formattedDate = eventDate.toLocaleDateString('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    
    eventContent.innerHTML = `
        ${imageUrl ? `
            <div class="event-image">
                <img src="${imageUrl}" alt="${nextEvent.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
        ` : ''}
        <div class="event-header" style="${imageUrl ? 'background: none; color: var(--text-dark); padding: 0; margin: 0 0 15px 0;' : ''}">
            <h3>${nextEvent.title}</h3>
            <p style="${imageUrl ? 'color: var(--text-medium);' : ''}">${formattedDate}</p>
        </div>
        <div class="event-details">
            <p style="margin-bottom: 10px;">${nextEvent.body || ''}</p>
            
            ${nextEvent.location ? `
                <strong>📍 Location:</strong>
                <p>${nextEvent.location}</p>
            ` : ''}
            
            ${nextEvent.price ? `
                <strong>💶 Eintritt:</strong>
                <p>${nextEvent.price}€</p>
            ` : ''}
        </div>
        
        ${audioUrl ? `
            <div class="audio-player">
                <h4>🎧 Preview</h4>
                <audio controls preload="none" style="width: 100%;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/wav">
                    <source src="${audioUrl}" type="audio/ogg">
                    Dein Browser unterstützt das Audio-Element nicht.
                </audio>
            </div>
        ` : ''}
    `;
    
    eventWindow.style.display = 'block';
}

// Fallback Event
function displayFallbackEvent() {
    const fallbackEvent = [{
        title: "next monday special",
        artist: "dj cosmic kitchen",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "erlebe entspannte lounge-klänge während deines brunches!"
    }];
    
    displayEvents(fallbackEvent);
}

// Make functions globally accessible
window.generateMenuPDF = generateMenuPDF;
