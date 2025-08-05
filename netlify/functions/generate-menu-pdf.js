const { jsPDF } = require('jspdf');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Helper function to load menu data
async function loadMenuData() {
    // Try multiple path resolutions
    const possiblePaths = [
        path.join(__dirname, '../../content', 'menu-categories'),
        path.join(process.cwd(), 'content', 'menu-categories'),
        path.join(__dirname, '../../../content', 'menu-categories'),
        '/var/task/content/menu-categories' // Netlify Functions runtime path
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
        console.error('Could not find menu directory in any of the expected locations');
        throw new Error('Menu directory not found');
    }
    
    try {
        const files = await fs.readdir(menuDir);
        console.log('Found files:', files);
        
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
    if (isNaN(numPrice)) return `€ ${price}`;
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    return `€ ${formatted}`;
}

// Helper function to safely draw rectangle
function drawRect(doc, x, y, w, h, style = 'F') {
    try {
        doc.rect(x, y, w, h, style);
    } catch (e) {
        console.error('Error drawing rectangle:', e);
        // Fallback to basic rectangle
        if (style === 'F' || style === 'FD') {
            doc.setFillColor(250, 248, 243);
            doc.rect(x, y, w, h, 'F');
        } else {
            doc.rect(x, y, w, h, 'S');
        }
    }
}

// Helper function to safely draw circle (logo)
function drawCircle(doc, x, y, r, style = 'F') {
    try {
        // Try to use circle method
        doc.circle(x, y, r, style);
    } catch (e) {
        console.error('Circle method failed, using ellipse:', e);
        try {
            // Fallback to ellipse
            doc.ellipse(x, y, r, r, style);
        } catch (e2) {
            console.error('Ellipse method also failed:', e2);
            // Ultimate fallback: draw a square
            doc.rect(x - r, y - r, r * 2, r * 2, style);
        }
    }
}

exports.handler = async (event, context) => {
    console.log('PDF generation function called');
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Load menu data with better error handling
        let menuData = [];
        try {
            menuData = await loadMenuData();
            console.log('Loaded menu categories:', menuData.length);
        } catch (loadError) {
            console.error('Failed to load menu data, using fallback:', loadError);
            // Use fallback data
            menuData = [{
                title: "Morning Essentials",
                order: 1,
                description: "Der perfekte Start in den Tag",
                items: [{
                    name: "Bio-Zitronenwasser",
                    price: "4.90",
                    description: "Warmes Wasser mit frisch gepresster Bio-Zitrone",
                    nutrition: { calories: "25" },
                    tags: ["detox", "vegan"],
                    allergens: []
                }]
            }];
        }
        
        // Create PDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // PDF Configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        
        // Colors
        const colors = {
            primary: [30, 74, 60],
            gold: [201, 169, 97],
            gray: [88, 88, 88],
            lightGray: [232, 232, 232],
            cream: [250, 248, 243],
            darkGray: [60, 60, 60]
        };
        
        // Helper function to add decorative elements
        function addPageDecoration() {
            doc.setDrawColor(...colors.gold);
            doc.setLineWidth(0.5);
            doc.line(margin, 10, pageWidth - margin, 10);
            doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        }
        
        // Cover page
        addPageDecoration();
        
        // Logo area - use safe circle drawing
        let yPos = 40;
        doc.setFillColor(...colors.primary);
        drawCircle(doc, pageWidth / 2, yPos, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('HBC', pageWidth / 2, yPos + 1, { align: 'center' });
        
        yPos += 30;
        
        // Restaurant name
        doc.setTextColor(...colors.primary);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'normal');
        doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 12;
        
        // Tagline
        doc.setTextColor(...colors.gray);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.text('Where wellness meets culinary excellence', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 30;
        
        // Opening hours box
        doc.setFillColor(...colors.cream);
        drawRect(doc, margin + 40, yPos, contentWidth - 80, 25);
        doc.setTextColor(...colors.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Jeden Montag | 09:00 - 12:00 Uhr', pageWidth / 2, yPos + 8, { align: 'center' });
        doc.text('Reservierung empfohlen', pageWidth / 2, yPos + 16, { align: 'center' });
        
        // Contact info at bottom
        yPos = pageHeight - 30;
        doc.setTextColor(...colors.gray);
        doc.setFontSize(9);
        doc.text('Gumpendorfer Straße 9, 1060 Wien', pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
        doc.text('+43 676 123 456 78 | hello@healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });
        
        // Menu pages
        doc.addPage();
        addPageDecoration();
        
        // Menu header
        yPos = 20;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'normal');
        doc.text('SPEISEKARTE', pageWidth / 2, yPos, { align: 'center' });
        yPos = 35;
        
        // Simple menu layout (single column for now)
        for (const category of menuData) {
            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                doc.addPage();
                addPageDecoration();
                yPos = 20;
            }
            
            // Category header
            doc.setFillColor(...colors.cream);
            drawRect(doc, margin, yPos - 6, contentWidth, 10);
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(category.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
            yPos += 12;
            
            // Category description
            if (category.description) {
                doc.setTextColor(...colors.gray);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                const descLines = doc.splitTextToSize(category.description, contentWidth - 20);
                descLines.forEach(line => {
                    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
                    yPos += 4;
                });
                yPos += 4;
            }
            
            // Menu items
            if (category.items && category.items.length > 0) {
                for (const item of category.items) {
                    // Check page space
                    if (yPos > pageHeight - 30) {
                        doc.addPage();
                        addPageDecoration();
                        yPos = 20;
                    }
                    
                    // Item name and price
                    doc.setTextColor(...colors.darkGray);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    
                    const itemName = item.name || 'Unnamed Item';
                    const priceText = item.price ? formatPrice(item.price) : '';
                    
                    doc.text(itemName, margin + 5, yPos);
                    if (priceText) {
                        doc.setTextColor(...colors.gold);
                        doc.text(priceText, pageWidth - margin - 5, yPos, { align: 'right' });
                    }
                    yPos += 5;
                    
                    // Description
                    if (item.description) {
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        const cleanDesc = item.description.replace(/<[^>]*>/g, '').replace(/\*/g, '');
                        const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 20);
                        descLines.slice(0, 2).forEach(line => {
                            doc.text(line, margin + 5, yPos);
                            yPos += 3;
                        });
                    }
                    
                    yPos += 5; // Space between items
                }
            }
            
            yPos += 8; // Space between categories
        }
        
        // Generate PDF buffer
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        console.log('PDF generated successfully, size:', pdfBuffer.length);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="healthy-brunch-club-menu.pdf"',
                'Cache-Control': 'public, max-age=3600'
            },
            body: pdfBuffer.toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to generate PDF', 
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
