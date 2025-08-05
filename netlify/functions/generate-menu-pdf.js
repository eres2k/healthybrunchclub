const { jsPDF } = require('jspdf');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

// Helper function to load menu data
async function loadMenuData() {
    const menuDir = path.join(process.cwd(), 'content', 'menu-categories');
    
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
                            title: data.title,
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
    } catch (error) {
        console.error('Error loading menu data:', error);
        return [];
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

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Load menu data
        const menuData = await loadMenuData();
        
        // Create PDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // PDF Configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        const contentWidth = pageWidth - (margin * 2);
        
        // Colors
        const colors = {
            primary: [30, 74, 60],
            gold: [201, 169, 97],
            gray: [88, 88, 88],
            lightGray: [232, 232, 232],
            cream: [250, 248, 243]
        };
        
        // Cover page
        let yPos = 60;
        
        // Restaurant name
        doc.setTextColor(...colors.primary);
        doc.setFontSize(36);
        doc.text('HEALTHY', pageWidth / 2, yPos, { align: 'center' });
        yPos += 14;
        doc.text('BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 20;
        
        // Tagline
        doc.setTextColor(...colors.gray);
        doc.setFontSize(14);
        doc.text('Where wellness meets culinary excellence', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 40;
        
        // Info box
        doc.setFillColor(...colors.cream);
        doc.rect(margin + 30, yPos, contentWidth - 60, 40, 'F');
        doc.setTextColor(...colors.primary);
        doc.setFontSize(12);
        doc.text('Jeden Montag | 09:00 - 12:00 Uhr', pageWidth / 2, yPos + 15, { align: 'center' });
        doc.text('Gumpendorfer Straße 9, 1060 Wien', pageWidth / 2, yPos + 25, { align: 'center' });
        
        // New page for menu
        doc.addPage();
        yPos = margin;
        
        // Menu header
        doc.setTextColor(...colors.primary);
        doc.setFontSize(24);
        doc.text('SPEISEKARTE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
        
        // Process menu categories
        menuData.forEach((category, catIndex) => {
            if (yPos > pageHeight - 80) {
                doc.addPage();
                yPos = margin;
            }
            
            // Category header
            doc.setFillColor(...colors.cream);
            doc.rect(margin, yPos - 8, contentWidth, 14, 'F');
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(category.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;
            
            // Items
            category.items.forEach((item, itemIndex) => {
                if (yPos > pageHeight - 50) {
                    doc.addPage();
                    yPos = margin;
                }
                
                // Item name and price
                doc.setTextColor(...colors.primary);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(item.name, margin + 5, yPos);
                
                if (item.price) {
                    doc.setTextColor(...colors.gold);
                    doc.text(formatPrice(item.price), pageWidth - margin - 5, yPos, { align: 'right' });
                }
                
                yPos += 7;
                
                // Description
                if (item.description) {
                    doc.setTextColor(...colors.gray);
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    const cleanDesc = item.description.replace(/<[^>]*>/g, '').replace(/\*/g, '');
                    const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 20);
                    descLines.slice(0, 2).forEach(line => {
                        doc.text(line, margin + 5, yPos);
                        yPos += 4;
                    });
                }
                
                // Nutrition
                if (item.nutrition && item.nutrition.calories) {
                    doc.setFontSize(8);
                    doc.setTextColor(...colors.gray);
                    let nutritionText = `${item.nutrition.calories} kcal`;
                    if (item.nutrition.protein) nutritionText += ` | ${item.nutrition.protein} Protein`;
                    doc.text(nutritionText, margin + 5, yPos);
                    yPos += 4;
                }
                
                // Tags and allergens
                if (item.tags && item.tags.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(...colors.primary);
                    doc.text(item.tags.join(' • '), margin + 5, yPos);
                    yPos += 4;
                }
                
                if (item.allergens && item.allergens.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(214, 38, 30);
                    doc.text('Allergene: ' + item.allergens.join(', '), margin + 5, yPos);
                    yPos += 4;
                }
                
                yPos += 8;
            });
            
            yPos += 10;
        });
        
        // Add allergen legend if needed
        const hasAllergens = menuData.some(cat => 
            cat.items.some(item => item.allergens && item.allergens.length > 0)
        );
        
        if (hasAllergens) {
            doc.addPage();
            yPos = margin;
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(18);
            doc.text('ALLERGEN-INFORMATION', pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;
            
            doc.setFontSize(10);
            Object.entries(allergenMap).forEach(([code, name]) => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = margin;
                }
                
                doc.setTextColor(...colors.gold);
                doc.setFont(undefined, 'bold');
                doc.text(code + ':', margin + 5, yPos);
                
                doc.setTextColor(...colors.gray);
                doc.setFont(undefined, 'normal');
                doc.text(name, margin + 15, yPos);
                
                yPos += 6;
            });
        }
        
        // Footer on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setTextColor(...colors.gray);
            doc.setFontSize(8);
            doc.text(
                `Seite ${i} von ${totalPages} | www.healthybrunchclub.at`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }
        
        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        
        // Return PDF as response
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
            body: JSON.stringify({ error: 'Failed to generate PDF', details: error.message })
        };
    }
};
