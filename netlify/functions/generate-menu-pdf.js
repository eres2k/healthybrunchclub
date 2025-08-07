const { jsPDF } = require('jspdf');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Helper function to load menu data
async function loadMenuData() {
    const possiblePaths = [
        path.join(__dirname, '../../content', 'menu-categories'),
        path.join(process.cwd(), 'content', 'menu-categories'),
        path.join(__dirname, '../../../content', 'menu-categories'),
        '/var/task/content/menu-categories'
    ];
    
    let menuDir = null;
    for (const testPath of possiblePaths) {
        try {
            await fs.access(testPath);
            menuDir = testPath;
            console.log('Found menu directory at:', menuDir);
            break;
        } catch (e) {
            console.log('Path not found:', testPath);
        }
    }
    
    if (!menuDir) {
        console.error('Could not find menu directory');
        throw new Error('Menu directory not found');
    }
    
    try {
        const files = await fs.readdir(menuDir);
        const menuCategories = await Promise.all(
            files
                .filter(file => file.endsWith('.md'))
                .map(async (file) => {
                    try {
                        const filePath = path.join(menuDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const { data } = matter(content);
                        
                        return {
                            title: data.title || 'Untitled',
                            order: data.order || 0,
                            description: data.description || '',
                            image: data.image || '',
                            items: data.items || []
                        };
                    } catch (error) {
                        console.error('Error parsing menu file:', file, error);
                        return null;
                    }
                })
        );
        
        return menuCategories
            .filter(cat => cat !== null)
            .sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('Error loading menu data:', error);
        throw error;
    }
}

// Allergen mapping
const allergenMap = {
    'A': 'Glutenhaltiges Getreide',
    'B': 'Krebstiere',
    'C': 'Eier',
    'D': 'Fisch',
    'E': 'Erdnüsse',
    'F': 'Soja',
    'G': 'Milch/Laktose',
    'H': 'Schalenfrüchte',
    'L': 'Sellerie',
    'M': 'Senf',
    'N': 'Sesam',
    'O': 'Sulfite',
    'P': 'Lupinen',
    'R': 'Weichtiere'
};

// Format price helper
function formatPrice(price) {
    if (!price && price !== 0) return '';
    let cleanPrice = String(price).trim();
    cleanPrice = cleanPrice.replace(/[€$£¥\s]/g, '');
    cleanPrice = cleanPrice.replace(/,/g, '.');
    const numPrice = parseFloat(cleanPrice);
    if (isNaN(numPrice)) return `${price}`;
    return numPrice.toFixed(2);
}

// Draw rounded rectangle
function drawRoundedRect(doc, x, y, w, h, r, style = 'S') {
    doc.roundedRect(x, y, w, h, r, r, style);
}

// Helper to wrap text properly
function wrapText(doc, text, maxWidth) {
    if (!text) return [];
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines;
}

// Draw custom logo
function drawLogo(doc, x, y, size) {
    const colors = {
        primary: [78, 125, 102],    // Forest green from logo
        sage: [172, 189, 168],      // Light sage
        text: [58, 86, 75]          // Dark green
    };
    
    // Main circle background
    doc.setFillColor(...colors.sage);
    doc.circle(x, y, size, 'F');
    
    // Inner circle for depth
    doc.setFillColor(...colors.primary);
    doc.circle(x, y, size * 0.85, 'F');
    
    // Leaf decoration (simplified)
    doc.setDrawColor(...colors.sage);
    doc.setLineWidth(1);
    
    // Left leaf
    doc.beginPath();
    doc.moveTo(x - size * 0.6, y - size * 0.2);
    doc.bezierCurveTo(
        x - size * 0.8, y - size * 0.4,
        x - size * 0.7, y - size * 0.6,
        x - size * 0.4, y - size * 0.5
    );
    doc.stroke();
    
    // Text styling
    doc.setTextColor(255, 255, 255);
    
    // "healthy" text
    doc.setFontSize(size * 0.35);
    doc.setFont('helvetica', 'normal');
    doc.text('healthy', x, y - size * 0.15, { align: 'center' });
    
    // "BRUNCHCLUB" text
    doc.setFontSize(size * 0.28);
    doc.setFont('helvetica', 'bold');
    doc.text('BRUNCHCLUB', x, y + size * 0.25, { align: 'center' });
}

exports.handler = async (event, context) => {
    console.log('Premium 2-column PDF generation function called');
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Load menu data
        let menuData = [];
        try {
            menuData = await loadMenuData();
            console.log('Loaded menu categories:', menuData.length);
        } catch (loadError) {
            console.error('Failed to load menu data:', loadError);
            throw loadError;
        }
        
        // Create PDF with custom settings
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // PDF Configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const columnGap = 10;
        const columnWidth = (pageWidth - (margin * 2) - columnGap) / 2;
        
        // Premium Color Palette (matching the logo)
        const colors = {
            primary: [78, 125, 102],      // Forest green from logo
            primaryDark: [58, 86, 75],    // Darker green
            sage: [172, 189, 168],        // Light sage from logo
            sageLight: [196, 208, 185],   // Very light sage
            cream: [252, 250, 247],       // Off-white cream
            beige: [245, 238, 230],       // Warm beige
            taupe: [225, 215, 202],       // Taupe
            gray: [72, 72, 72],           // Charcoal
            lightGray: [150, 150, 150],   // Medium gray
            white: [255, 255, 255]        // Pure white
        };
        
        // ===== COVER PAGE =====
        // Cream background
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Decorative sage accent at top
        doc.setFillColor(...colors.sageLight);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Draw logo
        drawLogo(doc, pageWidth / 2, 65, 28);
        
        // Welcome section with elegant background
        let yPos = 120;
        doc.setFillColor(...colors.white);
        doc.setDrawColor(...colors.sage);
        doc.setLineWidth(0.5);
        drawRoundedRect(doc, margin + 10, yPos - 15, pageWidth - (margin * 2) - 20, 125, 8, 'FD');
        
        // Welcome text
        doc.setTextColor(...colors.primaryDark);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'italic');
        doc.text('Willkommen', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        doc.setTextColor(...colors.gray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const introLines = [
            'Es liegt uns sehr am Herzen, dir frische, regionale',
            'Köstlichkeiten in Bio-Qualität anzubieten.',
            '',
            'Wir verzichten bewusst auf raffinierten Zucker,',
            'Weißmehl und größtenteils auf Kuhmilch.',
            '',
            'Viele unserer Speisen sind gluten- und laktosefrei',
            'und werden mit natürlichem Zucker gesüßt.',
            '',
            'Unser Fokus liegt auf deinem Wohlbefinden.',
            'In unserer Küche findest du entzündungshemmende',
            'Zutaten für deine innere Balance.',
            '',
            'Genieß die Zeit bei unserem Brunch!'
        ];
        
        introLines.forEach(line => {
            doc.text(line, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
        });
        
        // Signature section
        yPos += 10;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.primary);
        doc.text('Alles Liebe,', pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(11);
        doc.text('Tina, Charlotte & Tessa', pageWidth / 2, yPos, { align: 'center' });
        
        // Decorative element at bottom
        yPos = pageHeight - 40;
        doc.setDrawColor(...colors.sage);
        doc.setLineWidth(0.5);
        doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
        
        // ===== MENU PAGES WITH 2-COLUMN LAYOUT =====
        let currentColumn = 0;
        let columnYPos = [35, 35]; // Track Y position for each column
        let currentPage = 1;
        
        const startNewPage = () => {
            doc.addPage();
            doc.setFillColor(...colors.cream);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Header decoration
            doc.setFillColor(...colors.sageLight);
            doc.rect(0, 0, pageWidth, 20, 'F');
            
            // Small logo at top
            drawLogo(doc, pageWidth / 2, 10, 8);
            
            columnYPos = [35, 35];
            currentColumn = 0;
        };
        
        startNewPage();
        
        for (let catIndex = 0; catIndex < menuData.length; catIndex++) {
            const category = menuData[catIndex];
            
            // Calculate space needed for category
            const categoryHeight = 25 + (category.items.length * 45); // Rough estimate
            
            // Check if we need new column or page
            if (columnYPos[currentColumn] + categoryHeight > pageHeight - 30) {
                if (currentColumn === 0) {
                    currentColumn = 1;
                } else {
                    startNewPage();
                }
            }
            
            const xOffset = margin + (currentColumn * (columnWidth + columnGap));
            let yPos = columnYPos[currentColumn];
            
            // Category header with elegant styling
            doc.setFillColor(...colors.primary);
            drawRoundedRect(doc, xOffset, yPos - 8, columnWidth, 14, 3, 'F');
            
            doc.setTextColor(...colors.white);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(category.title.toUpperCase(), xOffset + columnWidth / 2, yPos, { align: 'center' });
            yPos += 18;
            
            // Category items
            for (const item of category.items) {
                // Item container with subtle background
                const itemHeight = 28 + (item.nutrition ? 10 : 0);
                
                // Check if item fits in current column
                if (yPos + itemHeight > pageHeight - 30) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                        xOffset = margin + (currentColumn * (columnWidth + columnGap));
                        yPos = columnYPos[currentColumn];
                    } else {
                        startNewPage();
                        xOffset = margin;
                        yPos = columnYPos[0];
                    }
                }
                
                // Subtle item background
                doc.setFillColor(...colors.white);
                doc.setDrawColor(...colors.sageLight);
                doc.setLineWidth(0.2);
                drawRoundedRect(doc, xOffset, yPos - 4, columnWidth, itemHeight - 2, 2, 'FD');
                
                // Item name
                doc.setTextColor(...colors.primaryDark);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const itemName = item.name || 'Unnamed Item';
                doc.text(itemName, xOffset + 3, yPos);
                
                // Price with decorative dots
                if (item.price) {
                    const price = formatPrice(item.price);
                    const priceX = xOffset + columnWidth - 3;
                    
                    // Dotted line
                    const nameWidth = doc.getTextWidth(itemName);
                    const priceWidth = doc.getTextWidth(price);
                    const dotsStart = xOffset + 3 + nameWidth + 2;
                    const dotsEnd = priceX - priceWidth - 2;
                    
                    doc.setDrawColor(...colors.lightGray);
                    doc.setLineDash([1, 2], 0);
                    doc.line(dotsStart, yPos - 1, dotsEnd, yPos - 1);
                    doc.setLineDash([]);
                    
                    doc.setTextColor(...colors.primary);
                    doc.setFont('helvetica', 'normal');
                    doc.text(price, priceX, yPos, { align: 'right' });
                }
                
                yPos += 5;
                
                // Description
                if (item.description) {
                    doc.setTextColor(...colors.gray);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    const cleanDesc = item.description.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
                    const descLines = wrapText(doc, cleanDesc, columnWidth - 6);
                    descLines.slice(0, 2).forEach(line => {
                        doc.text(line, xOffset + 3, yPos);
                        yPos += 3.5;
                    });
                }
                
                // Nutrition info (compact)
                if (item.nutrition && (item.nutrition.calories || item.nutrition.protein)) {
                    yPos += 1;
                    doc.setFontSize(6);
                    doc.setTextColor(...colors.lightGray);
                    let nutritionText = [];
                    if (item.nutrition.calories) nutritionText.push(`${item.nutrition.calories} kcal`);
                    if (item.nutrition.protein) nutritionText.push(`${item.nutrition.protein} protein`);
                    if (item.nutrition.carbs) nutritionText.push(`${item.nutrition.carbs} carbs`);
                    if (item.nutrition.fat) nutritionText.push(`${item.nutrition.fat} fat`);
                    doc.text(nutritionText.join(' • '), xOffset + 3, yPos);
                    yPos += 3;
                }
                
                // Tags and allergens
                if (item.tags || item.allergens) {
                    doc.setFontSize(6);
                    
                    if (item.tags && item.tags.length > 0) {
                        doc.setTextColor(...colors.primary);
                        doc.setFont('helvetica', 'italic');
                        doc.text(item.tags.slice(0, 3).join(' • '), xOffset + 3, yPos);
                    }
                    
                    if (item.allergens && item.allergens.length > 0) {
                        doc.setTextColor(...colors.gray);
                        doc.setFont('helvetica', 'normal');
                        const allergenText = item.allergens.join(',');
                        doc.text(allergenText, xOffset + columnWidth - 3, yPos, { align: 'right' });
                    }
                    yPos += 3;
                }
                
                yPos += 5; // Space between items
            }
            
            // Update column Y position
            columnYPos[currentColumn] = yPos + 8;
            
            // Switch columns for next category if space allows
            if (currentColumn === 0 && columnYPos[1] < pageHeight - 80) {
                currentColumn = 1;
            }
        }
        
        // ===== ALLERGEN INFO PAGE =====
        doc.addPage();
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header
        doc.setFillColor(...colors.sageLight);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        drawLogo(doc, pageWidth / 2, 15, 8);
        
        yPos = 45;
        doc.setTextColor(...colors.primaryDark);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ALLERGENINFORMATIONEN', pageWidth / 2, yPos, { align: 'center' });
        
        // Allergen grid with elegant styling
        yPos += 15;
        const allergenColumns = 2;
        const allergenColumnWidth = (pageWidth - (margin * 2) - 20) / allergenColumns;
        
        doc.setFillColor(...colors.white);
        doc.setDrawColor(...colors.sage);
        doc.setLineWidth(0.5);
        drawRoundedRect(doc, margin, yPos - 5, pageWidth - (margin * 2), 100, 5, 'FD');
        
        const allergenEntries = Object.entries(allergenMap);
        const itemsPerColumn = Math.ceil(allergenEntries.length / allergenColumns);
        
        yPos += 5;
        allergenEntries.forEach(([code, name], index) => {
            const column = Math.floor(index / itemsPerColumn);
            const row = index % itemsPerColumn;
            const xPos = margin + 10 + (column * allergenColumnWidth);
            const itemY = yPos + (row * 7);
            
            doc.setTextColor(...colors.primary);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(code, xPos, itemY);
            
            doc.setTextColor(...colors.gray);
            doc.setFont('helvetica', 'normal');
            doc.text(' - ' + name, xPos + 8, itemY);
        });
        
        // Footer section
        yPos = pageHeight - 50;
        doc.setDrawColor(...colors.sage);
        doc.setLineWidth(0.5);
        doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
        
        yPos += 10;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('healthy BRUNCHCLUB', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 5;
        doc.setTextColor(...colors.gray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Gumpendorfer Straße 9, 1060 Wien', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        doc.text('hello@healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 6;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.lightGray);
        doc.text('Alle Nährwertangaben sind Durchschnittswerte', pageWidth / 2, yPos, { align: 'center' });
        
        // Generate PDF buffer
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        console.log('Premium 2-column PDF generated successfully, size:', pdfBuffer.length);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="healthy-brunchclub-menu.pdf"',
                'Cache-Control': 'public, max-age=3600'
            },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to generate PDF', 
                details: error.message
            })
        };
    }
};
