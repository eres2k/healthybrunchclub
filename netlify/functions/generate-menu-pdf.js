const { jsPDF } = require('jspdf');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Custom fonts encoding (you would need to add actual font files)
// For now, we'll use the built-in fonts with styling

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
    let formatted = numPrice.toFixed(2);
    return formatted;
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

exports.handler = async (event, context) => {
    console.log('Premium PDF generation function called');
    
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
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // Premium Color Palette
        const colors = {
            primary: [30, 74, 60],      // Forest green
            sage: [139, 148, 116],      // Sage green
            sageLight: [196, 208, 185], // Light sage
            cream: [250, 248, 243],     // Cream
            beige: [245, 232, 218],     // Beige
            gray: [72, 72, 72],         // Warm gray
            lightGray: [200, 200, 200], // Light gray
            gold: [212, 196, 168],      // Taupe/gold
            white: [255, 255, 255]      // White
        };
        
        // Set page background
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // ===== COVER PAGE =====
        // Logo placeholder (circle with text)
        let yPos = 50;
        doc.setFillColor(...colors.sageLight);
        doc.circle(pageWidth / 2, yPos, 25, 'F');
        
        // Logo text
        doc.setTextColor(...colors.primary);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('healthy', pageWidth / 2, yPos - 3, { align: 'center' });
        doc.setFontSize(20);
        doc.setFont('helvetica', 'normal');
        doc.text('BRUNCHCLUB', pageWidth / 2, yPos + 7, { align: 'center' });
        
        yPos = 120;
        
        // Introductory text
        doc.setFillColor(...colors.white);
        drawRoundedRect(doc, margin, yPos - 10, contentWidth, 110, 5, 'F');
        
        doc.setTextColor(...colors.gray);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const introText = `wie schön, dass du da bist!

es liegt uns sehr am herzen, dir frische, regionale
köstlichkeiten in bio-qualität anzubieten.

wir verzichten bewusst und größtenteils auf raffinierten
zucker, weißmehl und kuhmilch.

deshalb sind viele unserer speisen
gluten- und laktosefrei und werden mit
natürlichem zucker gesüßt
(dattel- oder ahornsirup und honig)

wer jedoch kuhmilch möchte,
bekommt sie bei uns selbstverständlich auch!

unser fokus liegt auf dem darm, denn er ist der schlüssel
zu deinem wohlbefinden. in unserer küche findest du viele
entzündungshemmende zutaten und
ganz viel gutes für deine innere balance!

genieß die zeit bei unserem brunch.
wir freuen uns, dass du zu uns gefunden hast!`;
        
        const introLines = introText.split('\n');
        let textY = yPos;
        introLines.forEach(line => {
            doc.text(line, pageWidth / 2, textY, { align: 'center' });
            textY += 5;
        });
        
        // Signature
        textY += 5;
        doc.setFont('helvetica', 'italic');
        doc.text('alles Liebe,', pageWidth / 2, textY, { align: 'center' });
        textY += 5;
        doc.setFontSize(12);
        doc.text('tina, charlotte & tessa', pageWidth / 2, textY, { align: 'center' });
        
        // ===== MENU PAGES =====
        let currentPage = 1;
        let needNewPage = true;
        
        for (const category of menuData) {
            if (needNewPage) {
                doc.addPage();
                doc.setFillColor(...colors.cream);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                yPos = 25;
                needNewPage = false;
            }
            
            // Category header with background
            doc.setFillColor(...colors.sageLight);
            drawRoundedRect(doc, margin, yPos - 8, contentWidth, 12, 3, 'F');
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            const categoryTitle = category.title.toUpperCase();
            doc.text(categoryTitle, pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;
            
            // Category items
            for (const item of category.items) {
                // Check if we need a new page (rough estimation)
                const itemHeight = 35 + (item.nutrition ? 15 : 0) + (item.tags ? 8 : 0);
                if (yPos + itemHeight > pageHeight - 30) {
                    needNewPage = true;
                    break;
                }
                
                // Item container
                doc.setFillColor(...colors.white);
                drawRoundedRect(doc, margin, yPos - 5, contentWidth, itemHeight - 5, 3, 'F');
                
                // Item name and price
                doc.setTextColor(...colors.primary);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const itemName = (item.name || 'Unnamed Item').toLowerCase();
                doc.text(itemName, margin + 5, yPos);
                
                // Price
                if (item.price) {
                    doc.setTextColor(...colors.gold);
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'normal');
                    doc.text(formatPrice(item.price), pageWidth - margin - 5, yPos, { align: 'right' });
                }
                
                yPos += 6;
                
                // Description
                if (item.description) {
                    doc.setTextColor(...colors.gray);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    const cleanDesc = item.description.replace(/<[^>]*>/g, '').replace(/\*\*/g, '').replace(/\*/g, '');
                    const descLines = wrapText(doc, cleanDesc, contentWidth - 15);
                    descLines.slice(0, 3).forEach(line => {
                        doc.text(line, margin + 5, yPos);
                        yPos += 4;
                    });
                }
                
                yPos += 2;
                
                // Nutrition badges
                if (item.nutrition && (item.nutrition.calories || item.nutrition.protein || item.nutrition.carbs || item.nutrition.fat)) {
                    let xPos = margin + 5;
                    const badgeSize = 18;
                    const badgeSpacing = 22;
                    
                    // Calories
                    if (item.nutrition.calories) {
                        doc.setFillColor(...colors.beige);
                        doc.circle(xPos + badgeSize/2, yPos + badgeSize/2, badgeSize/2, 'F');
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text(item.nutrition.calories, xPos + badgeSize/2, yPos + badgeSize/2 - 2, { align: 'center' });
                        doc.setFontSize(5);
                        doc.text('kcal', xPos + badgeSize/2, yPos + badgeSize/2 + 2, { align: 'center' });
                        xPos += badgeSpacing;
                    }
                    
                    // Protein
                    if (item.nutrition.protein) {
                        doc.setFillColor(...colors.beige);
                        doc.circle(xPos + badgeSize/2, yPos + badgeSize/2, badgeSize/2, 'F');
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text(item.nutrition.protein.replace('g', ''), xPos + badgeSize/2, yPos + badgeSize/2 - 2, { align: 'center' });
                        doc.setFontSize(5);
                        doc.text('protein', xPos + badgeSize/2, yPos + badgeSize/2 + 2, { align: 'center' });
                        xPos += badgeSpacing;
                    }
                    
                    // Carbs
                    if (item.nutrition.carbs) {
                        doc.setFillColor(...colors.beige);
                        doc.circle(xPos + badgeSize/2, yPos + badgeSize/2, badgeSize/2, 'F');
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text(item.nutrition.carbs.replace('g', ''), xPos + badgeSize/2, yPos + badgeSize/2 - 2, { align: 'center' });
                        doc.setFontSize(5);
                        doc.text('carbs', xPos + badgeSize/2, yPos + badgeSize/2 + 2, { align: 'center' });
                        xPos += badgeSpacing;
                    }
                    
                    // Fat
                    if (item.nutrition.fat) {
                        doc.setFillColor(...colors.beige);
                        doc.circle(xPos + badgeSize/2, yPos + badgeSize/2, badgeSize/2, 'F');
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text(item.nutrition.fat.replace('g', ''), xPos + badgeSize/2, yPos + badgeSize/2 - 2, { align: 'center' });
                        doc.setFontSize(5);
                        doc.text('fett', xPos + badgeSize/2, yPos + badgeSize/2 + 2, { align: 'center' });
                    }
                    
                    yPos += badgeSize + 4;
                }
                
                // Tags and Allergens row
                if (item.tags || item.allergens) {
                    // Tags
                    if (item.tags && item.tags.length > 0) {
                        doc.setTextColor(...colors.sage);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        const tagText = item.tags.join(' • ').toLowerCase();
                        doc.text(tagText, margin + 5, yPos);
                    }
                    
                    // Allergens
                    if (item.allergens && item.allergens.length > 0) {
                        doc.setTextColor(...colors.gray);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        const allergenText = 'Allergene: ' + item.allergens.join(', ');
                        doc.text(allergenText, pageWidth - margin - 5, yPos, { align: 'right' });
                    }
                    yPos += 6;
                }
                
                yPos += 8; // Space between items
            }
            
            yPos += 5; // Extra space after category
        }
        
        // ===== ALLERGEN LEGEND PAGE =====
        doc.addPage();
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        yPos = 30;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ALLERGENINFORMATIONEN', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 15;
        doc.setFillColor(...colors.white);
        drawRoundedRect(doc, margin, yPos - 5, contentWidth, 150, 5, 'F');
        
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        let allergenY = yPos;
        let allergenX = margin + 10;
        let column = 0;
        
        Object.entries(allergenMap).forEach(([code, name], index) => {
            if (index > 0 && index % 7 === 0) {
                column++;
                allergenX = margin + 10 + (column * 65);
                allergenY = yPos;
            }
            
            doc.setTextColor(...colors.gold);
            doc.setFont('helvetica', 'bold');
            doc.text(code, allergenX, allergenY);
            doc.setTextColor(...colors.gray);
            doc.setFont('helvetica', 'normal');
            doc.text(' - ' + name, allergenX + 5, allergenY);
            allergenY += 8;
        });
        
        // Footer info
        yPos = pageHeight - 40;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 5;
        doc.setTextColor(...colors.gray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Gumpendorfer Straße 9, 1060 Wien', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        doc.text('hello@healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 8;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('die angegebenen nährwerte sind durchschnittswerte und dienen lediglich zur orientierung', pageWidth / 2, yPos, { align: 'center' });
        
        // Generate PDF buffer
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        console.log('Premium PDF generated successfully, size:', pdfBuffer.length);
        
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
