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
        throw new Error('Menu directory not found');
    }
    
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
    if (isNaN(numPrice)) return price;
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    return formatted;
}

// Load logo
async function loadLogoImage() {
    try {
        const logoPath = path.join(process.cwd(), 'content/images/logo-high.png');
        const logoData = await fs.readFile(logoPath);
        return logoData.toString('base64');
    } catch (error) {
        console.log('Could not load logo');
        return null;
    }
}

exports.handler = async (event, context) => {
    console.log('Minimalist PDF generation function called');
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Load menu data
        const menuData = await loadMenuData();
        const logoBase64 = await loadLogoImage();
        
        // Create PDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        
        // Color scheme
        const colors = {
            green: [74, 107, 77],      // #4A6B4D
            cream: [245, 240, 232],    // #F5F0E8
            beige: [232, 223, 211],    // #E8DFD3
            gold: [196, 166, 97],      // #C4A661
            text: [44, 44, 44],        // #2C2C2C
            gray: [107, 107, 107]      // #6B6B6B
        };
        
        // ===== COVER PAGE =====
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Logo area with cream background
        const logoBoxSize = 120;
        const logoBoxX = (pageWidth - logoBoxSize) / 2;
        const logoBoxY = 60;
        
        doc.setFillColor(...colors.beige);
        doc.rect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 'F');
        
        // Logo or text
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', logoBoxX + 20, logoBoxY + 40, 80, 40);
            } catch (e) {
                // Fallback text
                doc.setTextColor(...colors.green);
                doc.setFontSize(24);
                doc.setFont('helvetica', 'normal');
                doc.text('healthy', pageWidth / 2, logoBoxY + 50, { align: 'center' });
                doc.setFontSize(18);
                doc.text('BRUNCHCLUB', pageWidth / 2, logoBoxY + 65, { align: 'center' });
            }
        }
        
        // ===== INTRO PAGE =====
        doc.addPage();
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        let yPos = 40;
        doc.setTextColor(...colors.text);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const introText = [
            'wie schön, dass du da bist!',
            '',
            'es liegt uns sehr am herzen, dir frische, regionale',
            'köstlichkeiten in bio-qualität anzubieten.',
            '',
            'wir verzichten bewusst und größtenteils auf raffinierten',
            'zucker, weißmehl und kuhmilch.',
            '',
            'deshalb sind viele unserer speisen',
            'gluten- und laktosefrei und werden mit',
            'natürlichem zucker gesüßt',
            '(dattel- oder ahornsirup und honig).',
            '',
            'wer jedoch kuhmilch möchte,',
            'bekommt sie bei uns selbstverständlich auch!',
            '',
            'unser fokus liegt auf dem darm, denn er ist der schlüssel',
            'zu deinem wohlbefinden. in unserer küche findest du viele',
            'entzündungshemmende zutaten und',
            'ganz viel gutes für deine innere balance!',
            '',
            'genieß die zeit bei unserem brunch.',
            'wir freuen uns, dass du zu uns gefunden hast!'
        ];
        
        introText.forEach(line => {
            doc.text(line, pageWidth / 2, yPos, { align: 'center' });
            yPos += 6;
        });
        
        yPos += 15;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.green);
        doc.text('alles liebe,', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        doc.setFontSize(12);
        doc.text('tina, charlotte & tessa', pageWidth / 2, yPos, { align: 'center' });
        
        // ===== MENU PAGES =====
        for (const category of menuData) {
            doc.addPage();
            doc.setFillColor(...colors.cream);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Header logo area
            doc.setFillColor(...colors.beige);
            doc.rect(pageWidth / 2 - 30, 20, 60, 60, 'F');
            
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 35, 40, 20);
                } catch (e) {
                    doc.setTextColor(...colors.green);
                    doc.setFontSize(14);
                    doc.text('healthy', pageWidth / 2, 45, { align: 'center' });
                    doc.setFontSize(10);
                    doc.text('BRUNCHCLUB', pageWidth / 2, 55, { align: 'center' });
                }
            }
            
            // Category title (spaced letters)
            yPos = 100;
            doc.setTextColor(...colors.green);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            const spacedTitle = category.title.toUpperCase().split('').join(' ');
            doc.text(spacedTitle, pageWidth / 2, yPos, { align: 'center' });
            
            // Line under title
            yPos += 8;
            doc.setDrawColor(...colors.beige);
            doc.setLineWidth(0.5);
            doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
            
            // Category description
            if (category.description) {
                yPos += 15;
                doc.setTextColor(...colors.gray);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.text(category.description.toLowerCase(), pageWidth / 2, yPos, { align: 'center' });
            }
            
            // Menu items in 2 columns
            yPos += 25;
            const columnWidth = (pageWidth - 2 * margin - 20) / 2;
            let leftY = yPos;
            let rightY = yPos;
            
            category.items.forEach((item, index) => {
                const isLeft = index % 2 === 0;
                const xPos = isLeft ? margin : margin + columnWidth + 20;
                let currentY = isLeft ? leftY : rightY;
                
                // Item name and price
                doc.setTextColor(...colors.text);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(item.name.toLowerCase(), xPos, currentY);
                
                if (item.price) {
                    const price = formatPrice(item.price);
                    doc.text(price, xPos + columnWidth - 10, currentY, { align: 'right' });
                }
                
                currentY += 5;
                
                // Description
                if (item.description) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(...colors.gray);
                    const lines = doc.splitTextToSize(item.description.toLowerCase(), columnWidth - 10);
                    lines.forEach(line => {
                        doc.text(line, xPos, currentY);
                        currentY += 4;
                    });
                }
                
                currentY += 3;
                
                // Nutrition badges
                if (item.nutrition) {
                    const badges = [];
                    const badgeRadius = 6;
                    let badgeX = xPos;
                    
                    // Draw circular badges
                    doc.setFillColor(...colors.gold);
                    
                    if (item.nutrition.calories) {
                        const cal = item.nutrition.calories.replace(/[^0-9]/g, '');
                        // Circle
                        doc.circle(badgeX + badgeRadius, currentY + badgeRadius, badgeRadius, 'F');
                        // Text
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(6);
                        doc.text(cal, badgeX + badgeRadius, currentY + badgeRadius - 1, { align: 'center' });
                        doc.setFontSize(4);
                        doc.text('kcal', badgeX + badgeRadius, currentY + badgeRadius + 2, { align: 'center' });
                        badgeX += badgeRadius * 2.5;
                    }
                    
                    if (item.nutrition.protein) {
                        const protein = item.nutrition.protein.replace(/[^0-9]/g, '');
                        doc.circle(badgeX + badgeRadius, currentY + badgeRadius, badgeRadius, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(6);
                        doc.text(protein + ' g', badgeX + badgeRadius, currentY + badgeRadius - 1, { align: 'center' });
                        doc.setFontSize(4);
                        doc.text('protein', badgeX + badgeRadius, currentY + badgeRadius + 2, { align: 'center' });
                        badgeX += badgeRadius * 2.5;
                    }
                    
                    if (item.nutrition.carbs) {
                        const carbs = item.nutrition.carbs.replace(/[^0-9]/g, '');
                        doc.circle(badgeX + badgeRadius, currentY + badgeRadius, badgeRadius, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(6);
                        doc.text(carbs + ' g', badgeX + badgeRadius, currentY + badgeRadius - 1, { align: 'center' });
                        doc.setFontSize(4);
                        doc.text('carbs', badgeX + badgeRadius, currentY + badgeRadius + 2, { align: 'center' });
                        badgeX += badgeRadius * 2.5;
                    }
                    
                    if (item.nutrition.fat) {
                        const fat = item.nutrition.fat.replace(/[^0-9]/g, '');
                        doc.circle(badgeX + badgeRadius, currentY + badgeRadius, badgeRadius, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(6);
                        doc.text(fat + ' g', badgeX + badgeRadius, currentY + badgeRadius - 1, { align: 'center' });
                        doc.setFontSize(4);
                        doc.text('fett', badgeX + badgeRadius, currentY + badgeRadius + 2, { align: 'center' });
                    }
                    
                    currentY += badgeRadius * 2 + 3;
                }
                
                // Allergens
                if (item.allergens && item.allergens.length > 0) {
                    doc.setTextColor(...colors.text);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`(${item.allergens.join(',')})`, xPos, currentY);
                    currentY += 3;
                }
                
                currentY += 8;
                
                // Update column Y position
                if (isLeft) {
                    leftY = currentY;
                } else {
                    rightY = currentY;
                }
            });
            
            // Footer note
            doc.setTextColor(...colors.gray);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text('die angegebenen nährwerte sind durchschnittswerte und dienen lediglich zur orientierung', 
                     pageWidth / 2, pageHeight - 20, { align: 'center' });
        }
        
        // ===== ALLERGEN PAGE =====
        if (Object.keys(allergenMap).length > 0) {
            doc.addPage();
            doc.setFillColor(...colors.cream);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            yPos = 40;
            doc.setTextColor(...colors.green);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('ALLERGENE', pageWidth / 2, yPos, { align: 'center' });
            
            yPos += 20;
            let xPos = margin;
            
            Object.entries(allergenMap).forEach(([code, name], index) => {
                if (index % 2 === 0 && index > 0) {
                    yPos += 8;
                    xPos = margin;
                }
                
                doc.setTextColor(...colors.green);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(code, xPos, yPos);
                
                doc.setTextColor(...colors.text);
                doc.setFont('helvetica', 'normal');
                doc.text(` – ${name.toLowerCase()}`, xPos + 10, yPos);
                
                if (index % 2 === 0) {
                    xPos = pageWidth / 2;
                }
            });
        }
        
        // Generate PDF
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        console.log('Minimalist PDF generated successfully');
        
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