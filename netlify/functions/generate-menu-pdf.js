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
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Load menu data
        const menuData = await loadMenuData();
        
        // Create PDF with custom size (A4)
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
        const columnWidth = (contentWidth - 10) / 2;
        const columnGap = 10;
        
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
        
        // Helper function for safe rectangle drawing
        function drawRect(x, y, w, h, style = 'F') {
            doc.rect(x, y, w, h, style);
        }
        
        // Cover page
        addPageDecoration();
        
        // Logo area
        let yPos = 40;
        doc.setFillColor(...colors.primary);
        doc.circle(pageWidth / 2, yPos, 12, 'F');
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
        
        // Opening hours box - using regular rect instead of roundedRect
        doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
        drawRect(margin + 40, yPos, contentWidth - 80, 25);
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
        
        // Menu pages start
        doc.addPage();
        addPageDecoration();
        
        // Menu header
        yPos = 20;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'normal');
        doc.text('SPEISEKARTE', pageWidth / 2, yPos, { align: 'center' });
        yPos = 35;
        
        // Track which column we're in
        let currentColumn = 0;
        let leftColumnY = yPos;
        let rightColumnY = yPos;
        
        // Process categories
        for (const category of menuData) {
            const isLeftColumn = currentColumn === 0;
            const columnX = isLeftColumn ? margin : margin + columnWidth + columnGap;
            let columnY = isLeftColumn ? leftColumnY : rightColumnY;
            
            // Check if we need a new page
            if (columnY > pageHeight - 60) {
                if (isLeftColumn && currentColumn === 0) {
                    currentColumn = 1;
                    columnY = rightColumnY;
                } else {
                    doc.addPage();
                    addPageDecoration();
                    leftColumnY = 20;
                    rightColumnY = 20;
                    currentColumn = 0;
                    columnY = leftColumnY;
                }
            }
            
            const startY = columnY;
            
            // Category header with background
            doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
            drawRect(columnX, columnY - 6, columnWidth, 10);
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(category.title.toUpperCase(), columnX + columnWidth / 2, columnY, { align: 'center' });
            columnY += 12;
            
            // Category description if exists
            if (category.description) {
                doc.setTextColor(...colors.gray);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                const descLines = doc.splitTextToSize(category.description, columnWidth - 10);
                if (Array.isArray(descLines)) {
                    descLines.forEach(line => {
                        doc.text(line, columnX + 2, columnY);
                        columnY += 3.5;
                    });
                }
                columnY += 2;
            }
            
            // Menu items
            for (const item of category.items) {
                const itemHeight = 20;
                if (columnY + itemHeight > pageHeight - 20) {
                    if (isLeftColumn && currentColumn === 0) {
                        currentColumn = 1;
                        leftColumnY = columnY;
                        columnY = rightColumnY;
                        const newColumnX = margin + columnWidth + columnGap;
                        
                        // Repeat category header in new column
                        doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
                        drawRect(newColumnX, columnY - 6, columnWidth, 10);
                        doc.setTextColor(...colors.primary);
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text(category.title.toUpperCase() + ' (Forts.)', newColumnX + columnWidth / 2, columnY, { align: 'center' });
                        columnY += 12;
                    } else {
                        doc.addPage();
                        addPageDecoration();
                        leftColumnY = 20;
                        rightColumnY = 20;
                        currentColumn = 0;
                        columnY = leftColumnY;
                        
                        // Repeat category header
                        doc.setFillColor(...colors.cream[0], colors.cream[1], colors.cream[2]);
                        drawRect(margin, columnY - 6, columnWidth, 10);
                        doc.setTextColor(...colors.primary);
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text(category.title.toUpperCase() + ' (Forts.)', margin + columnWidth / 2, columnY, { align: 'center' });
                        columnY += 12;
                    }
                }
                
                const itemStartY = columnY;
                const currentColumnX = currentColumn === 0 ? margin : margin + columnWidth + columnGap;
                
                // Item container with subtle background for special items
                if (item.special) {
                    doc.setFillColor(255, 247, 237);
                    drawRect(currentColumnX, columnY - 2, columnWidth, itemHeight - 2);
                }
                
                // Item name and price
                doc.setTextColor(...colors.darkGray);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                
                const textStartX = currentColumnX + 2;
                const priceText = item.price ? formatPrice(item.price) : '';
                const priceWidth = doc.getTextWidth(priceText);
                const maxNameWidth = columnWidth - 4 - priceWidth - 5;
                
                // Truncate name if too long
                let itemName = item.name;
                if (doc.getTextWidth(itemName) > maxNameWidth) {
                    while (doc.getTextWidth(itemName + '...') > maxNameWidth && itemName.length > 0) {
                        itemName = itemName.slice(0, -1);
                    }
                    itemName += '...';
                }
                
                doc.text(itemName, textStartX, columnY + 3);
                
                // Price
                if (priceText) {
                    doc.setTextColor(...colors.gold);
                    doc.text(priceText, currentColumnX + columnWidth - 2, columnY + 3, { align: 'right' });
                }
                
                columnY += 5;
                
                // Description (compact)
                if (item.description) {
                    doc.setTextColor(...colors.gray);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    const cleanDesc = item.description.replace(/<[^>]*>/g, '').replace(/\*/g, '');
                    const descLines = doc.splitTextToSize(cleanDesc, columnWidth - 4);
                    if (Array.isArray(descLines)) {
                        descLines.slice(0, 2).forEach(line => {
                            doc.text(line, textStartX, columnY);
                            columnY += 2.5;
                        });
                    }
                }
                
                // Nutrition & Tags (very compact)
                if (item.nutrition && item.nutrition.calories) {
                    doc.setFontSize(6);
                    doc.setTextColor(...colors.gray);
                    doc.setFont('helvetica', 'italic');
                    let nutritionText = item.nutrition.calories;
                    if (item.nutrition.protein) nutritionText += ` • ${item.nutrition.protein}`;
                    doc.text(nutritionText, textStartX, columnY);
                    columnY += 2.5;
                }
                
                // Tags and allergens on same line
                if ((item.tags && item.tags.length > 0) || (item.allergens && item.allergens.length > 0)) {
                    doc.setFontSize(6);
                    
                    if (item.tags && item.tags.length > 0) {
                        doc.setTextColor(...colors.primary);
                        const tagText = item.tags.slice(0, 3).join(' • ');
                        doc.text(tagText, textStartX, columnY);
                    }
                    
                    if (item.allergens && item.allergens.length > 0) {
                        doc.setTextColor(214, 38, 30);
                        doc.setFont('helvetica', 'bold');
                        const allergenText = 'Allergene: ' + item.allergens.join(',');
                        doc.text(allergenText, currentColumnX + columnWidth - 2, columnY, { align: 'right' });
                    }
                    columnY += 3;
                }
                
                // Special badge
                if (item.special) {
                    doc.setFillColor(...colors.gold);
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(6);
                    const badgeWidth = 25;
                    const badgeHeight = 4;
                    drawRect(currentColumnX + columnWidth - badgeWidth - 2, itemStartY, badgeWidth, badgeHeight);
                    doc.text("EMPFEHLUNG", currentColumnX + columnWidth - badgeWidth/2 - 2, itemStartY + 2.5, { align: 'center' });
                }
                
                columnY += 3; // Space between items
            }
            
            // Update column Y position
            if (currentColumn === 0) {
                leftColumnY = columnY + 5;
            } else {
                rightColumnY = columnY + 5;
            }
            
            // Switch columns for next category
            if (currentColumn === 0 && rightColumnY < leftColumnY - 20) {
                currentColumn = 1;
            } else if (currentColumn === 1 && leftColumnY < rightColumnY - 20) {
                currentColumn = 0;
            } else {
                currentColumn = currentColumn === 0 ? 1 : 0;
            }
        }
        
        // Allergen legend
        const hasAllergens = menuData.some(cat => 
            cat.items.some(item => item.allergens && item.allergens.length > 0)
        );
        
        if (hasAllergens) {
            const maxY = Math.max(leftColumnY, rightColumnY);
            if (maxY < pageHeight - 50) {
                yPos = pageHeight - 40;
            } else {
                doc.addPage();
                addPageDecoration();
                yPos = 30;
            }
            
            // Allergen legend header
            doc.setDrawColor(...colors.gold);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
            
            doc.setTextColor(...colors.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('ALLERGEN-KENNZEICHNUNG', pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;
            
            // Allergens in 3 columns
            const allergenEntries = Object.entries(allergenMap);
            const allergenColumnWidth = contentWidth / 3;
            let allergenX = margin;
            let allergenY = yPos;
            let allergenColumn = 0;
            
            doc.setFontSize(7);
            allergenEntries.forEach(([code, name], index) => {
                if (index > 0 && index % 5 === 0) {
                    allergenColumn++;
                    allergenX = margin + (allergenColumn * allergenColumnWidth);
                    allergenY = yPos;
                }
                
                doc.setTextColor(...colors.gold);
                doc.setFont('helvetica', 'bold');
                doc.text(code + ':', allergenX, allergenY);
                
                doc.setTextColor(...colors.gray);
                doc.setFont('helvetica', 'normal');
                doc.text(name, allergenX + 8, allergenY);
                
                allergenY += 4;
            });
        }
        
        // Page numbers on all pages
        const totalPages = doc.internal.getNumberOfPages();
        doc.setTextColor(...colors.gray);
        doc.setFontSize(7);
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            if (i > 1) {
                doc.text(
                    `${i} | ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                );
            }
        }
        
        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        
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
