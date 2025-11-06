const { jsPDF } = require('jspdf');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

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
    if (isNaN(numPrice)) return `€ ${price}`;
    let formatted = numPrice.toFixed(2);
    if (formatted.endsWith('.00')) {
        formatted = formatted.slice(0, -3);
    }
    return `€ ${formatted}`;
}

// Helper to wrap text properly
function wrapText(doc, text, maxWidth) {
    if (!text) return [];
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines;
}

// Clean description text
function cleanDescription(text) {
    if (!text) return '';
    // Remove markdown formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
        .replace(/\*(.*?)\*/g, '$1')      // Italic
        .replace(/^- /gm, '• ')           // List items
        .replace(/\n\n+/g, '\n')          // Multiple newlines
        .trim();
}

// Load logo image with HTTPS URL
async function loadLogoImage() {
    try {
        // Try to fetch from HTTPS URL first
        const https = require('https');
        const logoUrl = 'https://healthybrunchclub.at/content/images/logo-high.png';
        
        return new Promise((resolve, reject) => {
            https.get(logoUrl, (response) => {
                if (response.statusCode !== 200) {
                    console.log('Failed to fetch logo from URL, trying local file');
                    // Fall back to local file
                    loadLocalLogo().then(resolve).catch(reject);
                    return;
                }
                
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer.toString('base64'));
                });
                response.on('error', reject);
            }).on('error', (error) => {
                console.log('Error fetching logo from URL:', error.message);
                // Fall back to local file
                loadLocalLogo().then(resolve).catch(reject);
            });
        });
    } catch (error) {
        console.log('Could not load logo from URL, trying local file');
        return loadLocalLogo();
    }
}

// Load local logo as fallback
async function loadLocalLogo() {
    try {
        const logoPath = path.join(process.cwd(), 'content/images/logo-high.png');
        const logoData = await fs.readFile(logoPath);
        return logoData.toString('base64');
    } catch (error) {
        console.log('Could not load local logo file');
        return null;
    }
}

async function loadStructuredMenu(menuType) {
    const menuDir = path.join(process.cwd(), 'content', `${menuType}-menu`);

    try {
        const files = await fs.readdir(menuDir);
        const markdownFiles = files.filter(file => file.endsWith('.md'));

        if (markdownFiles.length === 0) {
            return null;
        }

        const menus = await Promise.all(
            markdownFiles.map(async (file) => {
                try {
                    const raw = await fs.readFile(path.join(menuDir, file), 'utf8');
                    const { data } = matter(raw);
                    return { ...data, filename: file };
                } catch (error) {
                    console.error('Failed to parse menu file:', file, error);
                    return null;
                }
            })
        );

        const activeMenus = menus
            .filter(entry => entry && entry.active)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return activeMenus[0] || null;
    } catch (error) {
        console.error(`Error loading ${menuType} menu data:`, error);
        return null;
    }
}

async function generateQRCodeData(url) {
    if (!url) {
        return null;
    }

    try {
        return await QRCode.toDataURL(url, {
            width: 150,
            margin: 1,
            color: {
                dark: '#1E4A3C',
                light: '#FFFBF5'
            }
        });
    } catch (error) {
        console.error('QR Code generation failed:', error);
        return null;
    }
}

async function createStructuredMenuPdf(menuData, menuType) {
    const categories = Array.isArray(menuData?.categories) ? menuData.categories : [];

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const colors = menuType === 'kids' ? {
            primary: '#FFB5A7',
            secondary: '#B8D4B2',
            text: '#1E4A3C',
            accent: '#F8AD9D'
        } : {
            primary: '#1E4A3C',
            secondary: '#8B9474',
            text: '#1E4A3C',
            accent: '#DAC196'
        };

        const pageWidth = doc.page.width;
        const usableWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

        doc.fontSize(32)
            .fillColor(colors.primary)
            .font('Helvetica-Bold')
            .text(menuData.title || (menuType === 'kids' ? 'Kids Menü' : 'Speisekarte'), {
                align: 'center'
            });

        if (menuData.subtitle) {
            doc.moveDown(0.4);
            doc.fontSize(14)
                .fillColor(colors.text)
                .font('Helvetica')
                .text(menuData.subtitle, { align: 'center' });
        }

        doc.moveDown(1.5);

        categories.forEach((category, catIndex) => {
            if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
                doc.addPage();
            }

            if (catIndex > 0) {
                doc.moveDown(1);
            }

            const icon = menuType === 'kids' ? (category.icon || '🍽️') : '';
            const categoryName = category?.name ? String(category.name) : 'Kategorie';
            const categoryTitle = icon ? `${icon} ${categoryName}` : categoryName;

            doc.fontSize(20)
                .fillColor(colors.secondary)
                .font('Helvetica-Bold')
                .text(categoryTitle, {
                    underline: false
                });

            doc.moveDown(0.4);

            const items = Array.isArray(category?.items) ? category.items : [];
            items.forEach(item => {
                if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
                    doc.addPage();
                }

                const itemName = item?.name ? String(item.name) : '';
                const priceLabel = item?.price ? String(item.price).trim() : '';
                const formattedPrice = priceLabel
                    ? (priceLabel.startsWith('€') ? priceLabel : `€ ${priceLabel}`)
                    : '';

                const startingY = doc.y;

                doc.fontSize(14)
                    .fillColor(colors.text)
                    .font('Helvetica-Bold')
                    .text(itemName, {
                        continued: false,
                        width: usableWidth - 120
                    });

                if (formattedPrice) {
                    const priceX = doc.page.width - doc.page.margins.right - 100;
                    doc.fontSize(14)
                        .fillColor(colors.primary)
                        .font('Helvetica-Bold')
                        .text(formattedPrice, priceX, startingY, {
                            width: 100,
                            align: 'right'
                        });
                }

                if (item?.description) {
                    doc.moveDown(0.3);
                    doc.fontSize(11)
                        .fillColor(colors.text)
                        .font('Helvetica')
                        .text(String(item.description), {
                            width: usableWidth,
                            lineGap: 2
                        });
                }

                const extras = [];
                if (item?.allergens) {
                    const allergenText = String(item.allergens).trim();
                    if (allergenText) {
                        extras.push(`Allergene: ${allergenText}`);
                    }
                }
                if (item?.vegetarian) {
                    extras.push('🌱 Vegetarisch');
                }

                if (extras.length > 0) {
                    doc.moveDown(0.1);
                    doc.fontSize(9)
                        .fillColor('#666666')
                        .font('Helvetica-Oblique')
                        .text(extras.join(' | '), {
                            width: usableWidth,
                            lineGap: 1
                        });
                }

                doc.moveDown(0.6);
            });
        });

        if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
            doc.addPage();
        } else {
            doc.moveDown(1.5);
        }

        doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(menuData.footer || 'Alle Preise in Euro. Änderungen vorbehalten.', {
                align: 'center'
            });

        const addQrCode = async () => {
            if (!menuData.qrCodeUrl) {
                return;
            }

            try {
                const qrData = await generateQRCodeData(menuData.qrCodeUrl);
                if (!qrData) {
                    return;
                }

                const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64');
                const qrWidth = 120;
                const qrX = (doc.page.width - qrWidth) / 2;
                const qrY = doc.y + 20;
                doc.image(qrBuffer, qrX, qrY, { width: qrWidth });
                doc.moveDown(8);
                doc.fontSize(10)
                    .fillColor(colors.text)
                    .font('Helvetica-Bold')
                    .text('Scanne für Online-Menü', {
                        align: 'center'
                    });
            } catch (error) {
                console.error('Failed to embed QR code:', error);
            }
        };

        addQrCode().finally(() => {
            doc.moveDown(4);
            doc.fontSize(12)
                .fillColor(colors.primary)
                .font('Helvetica-Bold')
                .text('Healthy Brunch Club Wien', {
                    align: 'center'
                });

            doc.fontSize(10)
                .fillColor(colors.text)
                .font('Helvetica')
                .text('www.healthybrunchclub.at', {
                    align: 'center'
                });

            doc.end();
        });
    });
}

async function persistPdf(buffer, filename) {
    if (!buffer || !filename) {
        return;
    }

    try {
        const contentDir = path.join(process.cwd(), 'content');
        await fs.writeFile(path.join(contentDir, filename), buffer);
    } catch (error) {
        console.warn(`Unable to persist ${filename}:`, error.message);
    }
}

async function generatePremiumRegularMenuPdf() {
    console.log('Generating premium regular menu PDF');

    let menuData = [];
    try {
        menuData = await loadMenuData();
        console.log('Loaded menu categories:', menuData.length);
    } catch (loadError) {
        console.error('Failed to load menu data:', loadError);
        throw loadError;
    }

    const logoBase64 = await loadLogoImage();

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const columnGap = 15;
    const columnWidth = (pageWidth - (margin * 2) - columnGap) / 2;

    const colors = {
        primary: [30, 74, 60],        // #1E4A3C - Forest green
        gold: [201, 169, 97],         // #C9A961 - Gold
        charcoal: [42, 42, 42],       // #2A2A2A - Dark text
        warmGray: [72, 72, 72],       // #484848 - Secondary text
        lightGray: [200, 200, 200],   // Light gray
        cream: [250, 248, 243],       // #FAF8F3 - Background
        white: [255, 255, 255]        // Pure white
    };

    doc.setFillColor(...colors.cream);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    let yPos = 40;
    if (logoBase64) {
        try {
            const logoWidth = 80;
            const logoHeight = 40;
            doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
            yPos += logoHeight + 20;
        } catch (imgError) {
            console.error('Error adding logo image:', imgError);
            doc.setTextColor(...colors.primary);
            doc.setFontSize(26);
            doc.setFont('helvetica', 'bold');
            doc.text('HEALTHY', pageWidth / 2, yPos, { align: 'center' });

            yPos += 10;
            doc.setFontSize(22);
            doc.setFont('helvetica', 'normal');
            doc.text('BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;
        }
    } else {
        doc.setTextColor(...colors.primary);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('HEALTHY', pageWidth / 2, yPos, { align: 'center' });

        yPos += 10;
        doc.setFontSize(22);
        doc.setFont('helvetica', 'normal');
        doc.text('BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
    }

    doc.setDrawColor(...colors.gold);
    doc.setLineWidth(0.8);
    const lineWidth = 80;
    const lineY = yPos + 5;
    doc.line((pageWidth - lineWidth) / 2, lineY, (pageWidth + lineWidth) / 2, lineY);

    yPos = lineY + 30;
    doc.setTextColor(...colors.charcoal);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');

    const introLines = [
        'Wie schön, dass du da bist!',
        '',
        'Es liegt uns sehr am Herzen, dir frische, regionale',
        'Köstlichkeiten in Bio-Qualität anzubieten.',
        '',
        'Wir verzichten bewusst und größtenteils auf raffinierten',
        'Zucker, Weißmehl und Kuhmilch.',
        '',
        'Deshalb sind viele unserer Speisen',
        'gluten- und laktosefrei und werden mit',
        'natürlichem Zucker gesüßt',
        '(Dattel- oder Ahornsirup und Honig).',
        '',
        'Wer jedoch Kuhmilch möchte,',
        'bekommt sie bei uns selbstverständlich auch!',
        '',
        'Unser Fokus liegt auf dem Darm, denn er ist der Schlüssel',
        'zu deinem Wohlbefinden. In unserer Küche findest du viele',
        'entzündungshemmende Zutaten und',
        'ganz viel Gutes für deine innere Balance!',
        '',
        'Genieß die Zeit bei unserem Brunch.',
        'Wir freuen uns, dass du zu uns gefunden hast!'
    ];

    doc.setFont('helvetica', 'normal');
    introLines.forEach(line => {
        doc.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
    });

    yPos += 10;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...colors.gold);
    doc.setFontSize(11);
    doc.text('Alles Liebe,', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(12);
    doc.text('Tina, Charlotte & Tessa', pageWidth / 2, yPos, { align: 'center' });

    let currentColumn = 0;
    let columnYPos = [35, 35];

    const startNewPage = () => {
        doc.addPage();
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 10, 40, 20);
            } catch (e) {
                doc.setTextColor(...colors.primary);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, 20, { align: 'center' });
            }
        } else {
            doc.setTextColor(...colors.primary);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, 20, { align: 'center' });
        }

        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.3);
        doc.line(margin + 20, 30, pageWidth - margin - 20, 30);

        columnYPos = [40, 40];
        currentColumn = 0;
    };

    startNewPage();

    for (let catIndex = 0; catIndex < menuData.length; catIndex++) {
        const category = menuData[catIndex];

        let categoryHeight = 20;
        category.items.forEach(item => {
            categoryHeight += 12;
            if (item.description) categoryHeight += 10;
            if (item.nutrition) categoryHeight += 3;
            if (item.tags || item.allergens) categoryHeight += 3;
        });

        if (columnYPos[currentColumn] + categoryHeight > pageHeight - 25) {
            if (currentColumn === 0 && columnYPos[1] < pageHeight - 50) {
                currentColumn = 1;
            } else {
                startNewPage();
            }
        }

        const xOffset = margin + (currentColumn * (columnWidth + columnGap));
        let columnY = columnYPos[currentColumn];

        doc.setTextColor(...colors.primary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const categoryTitle = category.title.toUpperCase();
        doc.text(categoryTitle, xOffset + columnWidth / 2, columnY, { align: 'center' });

        columnY += 3;
        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.5);
        const titleWidth = doc.getTextWidth(categoryTitle);
        const underlineX = xOffset + (columnWidth - titleWidth) / 2;
        doc.line(underlineX, columnY, underlineX + titleWidth, columnY);

        columnY += 10;

        for (const item of category.items) {
            let itemHeight = 8;
            if (item.description) itemHeight += 8;
            if (item.nutrition) itemHeight += 3;
            if (item.tags || item.allergens) itemHeight += 3;

            if (columnY + itemHeight > pageHeight - 25) {
                if (currentColumn === 0) {
                    currentColumn = 1;
                    columnY = columnYPos[1];
                } else {
                    startNewPage();
                    columnY = columnYPos[0];
                    currentColumn = 0;
                }
            }

            const itemX = margin + (currentColumn * (columnWidth + columnGap));

            doc.setTextColor(...colors.charcoal);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const itemName = item.name || 'Unnamed Item';
            const maxNameWidth = columnWidth - 25;
            const nameLines = wrapText(doc, itemName, maxNameWidth);
            doc.text(nameLines[0], itemX, columnY);

            if (item.price) {
                doc.setTextColor(...colors.gold);
                doc.setFont('helvetica', 'normal');
                const price = formatPrice(item.price);
                doc.text(price, itemX + columnWidth, columnY, { align: 'right' });
            }

            if (nameLines.length > 1) {
                columnY += 3;
                doc.setTextColor(...colors.charcoal);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(nameLines[1], itemX, columnY);
            }

            columnY += 4;

            if (item.description) {
                doc.setTextColor(...colors.warmGray);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                const cleanDesc = cleanDescription(item.description);
                const descLines = wrapText(doc, cleanDesc, columnWidth - 2);
                descLines.slice(0, 3).forEach(line => {
                    doc.text(line, itemX, columnY);
                    columnY += 2.5;
                });
                columnY += 1;
            }

            if (item.nutrition && item.nutrition.calories) {
                doc.setFontSize(5.5);
                doc.setTextColor(...colors.lightGray);
                doc.setFont('helvetica', 'normal');
                let nutritionText = item.nutrition.calories;
                if (item.nutrition.protein || item.nutrition.carbs || item.nutrition.fat) {
                    nutritionText += ' • ';
                    const parts = [];
                    if (item.nutrition.protein) parts.push(item.nutrition.protein);
                    if (item.nutrition.carbs) parts.push(item.nutrition.carbs);
                    if (item.nutrition.fat) parts.push(item.nutrition.fat);
                    nutritionText += parts.join(' ');
                }
                doc.text(nutritionText, itemX, columnY);
                columnY += 2.5;
            }

            if (item.tags || item.allergens) {
                doc.setFontSize(6);

                if (item.tags && item.tags.length > 0) {
                    doc.setTextColor(...colors.primary);
                    doc.setFont('helvetica', 'italic');
                    const tagText = item.tags.slice(0, 2).join(', ').toLowerCase();
                    doc.text(tagText, itemX, columnY);
                }

                if (item.allergens && item.allergens.length > 0) {
                    doc.setTextColor(...colors.warmGray);
                    doc.setFont('helvetica', 'normal');
                    const allergenText = item.allergens.join(',');
                    const allergenX = itemX + columnWidth;
                    doc.text(allergenText, allergenX, columnY, { align: 'right' });
                }
                columnY += 2.5;
            }

            columnY += 4;
        }

        columnYPos[currentColumn] = columnY + 8;
    }

    doc.addPage();
    doc.setFillColor(...colors.cream);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    yPos = 30;
    doc.setTextColor(...colors.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('ALLERGENINFORMATIONEN', pageWidth / 2, yPos, { align: 'center' });

    yPos += 5;
    doc.setDrawColor(...colors.gold);
    doc.setLineWidth(0.5);
    doc.line(margin + 50, yPos, pageWidth - margin - 50, yPos);

    yPos += 20;
    const allergenColumns = 2;
    const allergenColumnWidth = (pageWidth - (margin * 2) - 20) / allergenColumns;

    const allergenEntries = Object.entries(allergenMap);
    const itemsPerColumn = Math.ceil(allergenEntries.length / allergenColumns);

    allergenEntries.forEach(([code, name], index) => {
        const column = Math.floor(index / itemsPerColumn);
        const row = index % itemsPerColumn;
        const xPos = margin + (column * allergenColumnWidth);
        const itemY = yPos + (row * 7);

        doc.setTextColor(...colors.gold);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(code, xPos, itemY);

        doc.setTextColor(...colors.warmGray);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(` — ${name}`, xPos + 8, itemY);
    });

    yPos = pageHeight - 50;
    doc.setDrawColor(...colors.gold);
    doc.setLineWidth(0.5);
    doc.line(margin + 60, yPos, pageWidth - margin - 60, yPos);

    yPos += 10;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 15, yPos, 30, 15);
            yPos += 20;
        } catch (e) {
            doc.setTextColor(...colors.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;
        }
    } else {
        doc.setTextColor(...colors.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('HEALTHY BRUNCH CLUB', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
    }

    doc.setTextColor(...colors.charcoal);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gumpendorfer Straße 9 • 1060 Wien', pageWidth / 2, yPos, { align: 'center' });

    yPos += 4;
    doc.setTextColor(...colors.warmGray);
    doc.setFontSize(8);
    doc.text('hello@healthybrunchclub.at', pageWidth / 2, yPos, { align: 'center' });

    yPos += 8;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...colors.lightGray);
    doc.text('Die angegebenen Nährwerte sind Durchschnittswerte und dienen lediglich zur Orientierung', pageWidth / 2, yPos, { align: 'center' });

    const pdfOutput = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfOutput);

    console.log('Premium Restaurant PDF generated successfully, size:', pdfBuffer.length);

    return pdfBuffer;
}

exports.handler = async (event, context) => {
    console.log('Premium Restaurant PDF generation function called');

    const method = event.httpMethod || 'GET';
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    if (method !== 'GET') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const menuType = event.queryStringParameters?.menuType || 'regular';

    try {
        if (menuType === 'kids') {
            const kidsMenu = await loadStructuredMenu('kids');
            if (!kidsMenu) {
                return {
                    statusCode: 404,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'No active kids menu found' })
                };
            }

            const kidsBuffer = await createStructuredMenuPdf(kidsMenu, 'kids');
            await persistPdf(kidsBuffer, 'kidsmenu.pdf');

            return {
                statusCode: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="kids-menu.pdf"',
                    'Cache-Control': 'public, max-age=3600'
                },
                body: kidsBuffer.toString('base64'),
                isBase64Encoded: true
            };
        }

        const structuredRegular = await loadStructuredMenu('regular');
        let regularBuffer;

        if (structuredRegular) {
            console.log('Using structured regular menu collection for PDF');
            regularBuffer = await createStructuredMenuPdf(structuredRegular, 'regular');
        } else {
            regularBuffer = await generatePremiumRegularMenuPdf();
        }

        await persistPdf(regularBuffer, 'menu.pdf');

        return {
            statusCode: 200,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="healthy-brunchclub-menu.pdf"',
                'Cache-Control': 'public, max-age=3600'
            },
            body: regularBuffer.toString('base64'),
            isBase64Encoded: true
        };
    } catch (error) {
        console.error('PDF generation failed:', error);

        return {
            statusCode: 500,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Failed to generate PDF',
                details: error.message
            })
        };
    }
};
