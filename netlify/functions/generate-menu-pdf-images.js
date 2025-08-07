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

// Load category image from URL
async function loadCategoryImage(imagePath) {
    if (!imagePath) return null;
    
    try {
        const https = require('https');
        const http = require('http');
        
        // Construct full URL if needed
        let imageUrl = imagePath;
        if (!imagePath.startsWith('http')) {
            // If it's a relative path, construct full URL
            const baseUrl = 'https://healthybrunchclub.at';
            if (imagePath.startsWith('/')) {
                imageUrl = baseUrl + imagePath;
            } else {
                imageUrl = baseUrl + '/' + imagePath;
            }
        }
        
        console.log('Loading category image from URL:', imageUrl);
        
        return new Promise((resolve, reject) => {
            const protocol = imageUrl.startsWith('https') ? https : http;
            
            // Set a timeout
            const timeout = setTimeout(() => {
                console.log('Image loading timeout for:', imageUrl);
                resolve(null);
            }, 5000); // 5 second timeout
            
            const request = protocol.get(imageUrl, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Handle redirects
                    clearTimeout(timeout);
                    console.log('Following redirect to:', response.headers.location);
                    loadCategoryImage(response.headers.location).then(resolve).catch(() => resolve(null));
                    return;
                }
                
                if (response.statusCode !== 200) {
                    clearTimeout(timeout);
                    console.log('Failed to fetch image, status:', response.statusCode);
                    resolve(null);
                    return;
                }
                
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    clearTimeout(timeout);
                    try {
                        const buffer = Buffer.concat(chunks);
                        const base64 = buffer.toString('base64');
                        
                        // Determine image type from URL or content-type
                        let imageType = 'jpeg';
                        const contentType = response.headers['content-type'];
                        if (contentType) {
                            if (contentType.includes('png')) imageType = 'png';
                            else if (contentType.includes('gif')) imageType = 'gif';
                            else if (contentType.includes('webp')) imageType = 'webp';
                        } else {
                            // Fallback to extension
                            const ext = path.extname(imageUrl).toLowerCase().substring(1);
                            if (ext === 'png' || ext === 'gif' || ext === 'webp') {
                                imageType = ext;
                            } else if (ext === 'jpg') {
                                imageType = 'jpeg';
                            }
                        }
                        
                        console.log('Successfully loaded image, type:', imageType, 'size:', buffer.length);
                        resolve({ base64, type: imageType });
                    } catch (error) {
                        console.error('Error processing image:', error);
                        resolve(null);
                    }
                });
                response.on('error', (error) => {
                    clearTimeout(timeout);
                    console.error('Error fetching image:', error);
                    resolve(null);
                });
            });
            
            request.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Error with image request:', error);
                resolve(null);
            });
            
            request.setTimeout(5000, () => {
                clearTimeout(timeout);
                request.abort();
                console.log('Request timeout for:', imageUrl);
                resolve(null);
            });
        });
    } catch (error) {
        console.log('Could not load category image:', imagePath, error.message);
        return null;
    }
}

exports.handler = async (event, context) => {
    console.log('Premium Restaurant PDF generation function called');
    
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
            
            // Log category images for debugging
            menuData.forEach(cat => {
                if (cat.image) {
                    console.log(`Category "${cat.title}" has image: ${cat.image}`);
                }
            });
        } catch (loadError) {
            console.error('Failed to load menu data:', loadError);
            throw loadError;
        }
        
        // Load category images
        console.log('Loading category images...');
        for (let i = 0; i < menuData.length; i++) {
            const category = menuData[i];
            if (category.image) {
                console.log(`Attempting to load image for ${category.title}: ${category.image}`);
                const imageData = await loadCategoryImage(category.image);
                if (imageData) {
                    category.imageData = imageData;
                    console.log(`Successfully loaded image for ${category.title}`);
                } else {
                    console.log(`Failed to load image for ${category.title}`);
                }
            }
        }
        
        // Load logo
        const logoBase64 = await loadLogoImage();
        
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
        const columnGap = 15;
        const columnWidth = (pageWidth - (margin * 2) - columnGap) / 2;
        
        // Premium Color Palette
        const colors = {
            primary: [30, 74, 60],        // #1E4A3C - Forest green
            gold: [201, 169, 97],         // #C9A961 - Gold
            charcoal: [42, 42, 42],       // #2A2A2A - Dark text
            warmGray: [72, 72, 72],       // #484848 - Secondary text
            lightGray: [200, 200, 200],   // Light gray
            cream: [250, 248, 243],       // #FAF8F3 - Background
            white: [255, 255, 255]        // Pure white
        };
        
        // ===== COVER PAGE =====
        // Cream background for elegance
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Logo section
        let yPos = 40;
        if (logoBase64) {
            try {
                // Add actual logo image
                const logoWidth = 80;  // Increased size
                const logoHeight = 40; // Adjusted for better proportions
                doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
                yPos += logoHeight + 20;
            } catch (imgError) {
                console.error('Error adding logo image:', imgError);
                // Fall back to text
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
            // Text fallback
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
        
        // Elegant divider - Fixed positioning
        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.8);
        const lineWidth = 80;
        const lineY = yPos + 5; // Add some spacing
        doc.line((pageWidth - lineWidth) / 2, lineY, (pageWidth + lineWidth) / 2, lineY);
        
        // Welcome message
        yPos = lineY + 30; // Ensure proper spacing after line
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
        
        // Signature
        yPos += 10;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...colors.gold);
        doc.setFontSize(11);
        doc.text('Alles Liebe,', pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(12);
        doc.text('Tina, Charlotte & Tessa', pageWidth / 2, yPos, { align: 'center' });
        
        // ===== MENU PAGES WITH 2-COLUMN LAYOUT =====
        let currentColumn = 0;
        let columnYPos = [35, 35];
        
        const startNewPage = () => {
            doc.addPage();
            doc.setFillColor(...colors.cream);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Subtle header with small logo or text
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, 8, 40, 20);
                } catch (e) {
                    // Fallback to text
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
            
            // Decorative line - Fixed positioning
            doc.setDrawColor(...colors.gold);
            doc.setLineWidth(0.3);
            doc.line(margin + 20, 30, pageWidth - margin - 20, 30);
            
            columnYPos = [40, 40];
            currentColumn = 0;
        };
        
        startNewPage();
        
        for (let catIndex = 0; catIndex < menuData.length; catIndex++) {
            const category = menuData[catIndex];
            
            // Calculate space needed for category (accurate estimation)
            let categoryHeight = 25; // Base category header height
            // Calculate actual image height based on aspect ratio
            const aspectRatio = 16 / 6;
            const actualImgHeight = Math.min((columnWidth - 10) / aspectRatio, 35);
            categoryHeight += actualImgHeight + 12; // Actual image height + margin
            if (category.description) categoryHeight += 12; // Space for description
            category.items.forEach(item => {
                categoryHeight += 12; // Base item height
                if (item.description) categoryHeight += 10;
                if (item.nutrition) categoryHeight += 3;
                if (item.tags || item.allergens) categoryHeight += 3;
            });
            
            // Check if we need new column or page
            if (columnYPos[currentColumn] + categoryHeight > pageHeight - 25) {
                if (currentColumn === 0 && columnYPos[1] < pageHeight - 50) {
                    currentColumn = 1;
                } else {
                    startNewPage();
                }
            }
            
            const xOffset = margin + (currentColumn * (columnWidth + columnGap));
            let yPos = columnYPos[currentColumn];
            
            // Debug log
            console.log(`Processing category: ${category.title}, has image: ${!!category.image}, has imageData: ${!!category.imageData}`);
            
            // Category header with elegant image or placeholder
            const maxImgWidth = columnWidth - 10;
            const maxImgHeight = 35; // Reduced from 40 to match website proportions better
            let imgX = xOffset + 5; // Changed from const to let
            
            if (category.imageData) {
                try {
                    console.log(`Adding image for ${category.title}`);
                    
                    // Calculate proper dimensions maintaining aspect ratio
                    // Website uses 250px height with full width, which is roughly 16:6 ratio
                    const aspectRatio = 16 / 6; // Website's category hero aspect ratio
                    let imgWidth = maxImgWidth;
                    let imgHeight = imgWidth / aspectRatio;
                    
                    // If height exceeds max, scale down
                    if (imgHeight > maxImgHeight) {
                        imgHeight = maxImgHeight;
                        imgWidth = imgHeight * aspectRatio;
                        // Center the narrower image
                        const xOffsetAdjust = (maxImgWidth - imgWidth) / 2;
                        imgX = xOffset + 5 + xOffsetAdjust;
                    }
                    
                    // Add subtle shadow effect
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX + 2, yPos + 2, imgWidth, imgHeight, 'F');
                    
                    // Add white background to prevent transparency issues
                    doc.setFillColor(255, 255, 255);
                    doc.rect(imgX, yPos, imgWidth, imgHeight, 'F');
                    
                    // Add the actual image with aspect ratio preserved
                    // Using ScaleToFit mode to prevent stretching
                    doc.addImage(
                        category.imageData.base64, 
                        category.imageData.type.toUpperCase(), 
                        imgX, 
                        yPos, 
                        imgWidth, 
                        imgHeight,
                        undefined, // alias
                        'FAST', // compression - FAST is better for quality
                        0 // rotation
                    );
                    
                    // Add elegant thin border
                    doc.setDrawColor(...colors.gold);
                    doc.setLineWidth(0.3);
                    doc.rect(imgX, yPos, imgWidth, imgHeight);
                    
                    yPos += imgHeight + 12;
                } catch (imgError) {
                    console.error(`Error adding image for ${category.title}:`, imgError);
                    // Fall through to placeholder
                }
            }
            
            // If no image data, show a tasteful colored placeholder with consistent dimensions
            if (!category.imageData) {
                console.log(`Creating placeholder for ${category.title}`);
                
                // Use same dimensions as images for consistency
                const aspectRatio = 16 / 6;
                const imgWidth = maxImgWidth;
                const imgHeight = Math.min(imgWidth / aspectRatio, maxImgHeight);
                
                // Create a colored placeholder based on category
                const categoryColors = {
                    'sets': [30, 74, 60], // Forest green
                    'eggcitements': [255, 193, 7], // Amber
                    'avo-lution': [139, 195, 74], // Light green
                    'hafer dich lieb': [188, 170, 164], // Taupe
                    'berry good choice': [233, 30, 99], // Pink
                    'coffee, healthtea and me': [121, 85, 72], // Brown
                    'sip happens - make it healthy': [255, 152, 0], // Orange
                    'morning essentials': [255, 235, 59], // Yellow
                    'power bowls': [103, 58, 183], // Deep purple
                    'sweet temptations': [255, 87, 34] // Deep orange
                };
                
                const categoryKey = category.title.toLowerCase().replace(/\s+/g, '-');
                const bgColor = categoryColors[categoryKey] || [201, 169, 97]; // Default to gold
                
                // Add gradient effect
                doc.setFillColor(...bgColor);
                doc.rect(imgX, yPos, imgWidth, imgHeight, 'F');
                
                // Add category name in elegant white text
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14); // Reduced font size to fit better
                doc.setFont('helvetica', 'bold');
                const displayTitle = category.title.toUpperCase();
                doc.text(displayTitle, imgX + imgWidth / 2, yPos + imgHeight / 2 + 2, { align: 'center' });
                
                // Reset text settings
                doc.setTextColor(...colors.charcoal);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                
                // Add elegant border
                doc.setDrawColor(...colors.gold);
                doc.setLineWidth(0.5);
                doc.rect(imgX, yPos, imgWidth, imgHeight);
                
                yPos += imgHeight + 12;
            }
            
            // Category title - Elegant uppercase
            doc.setTextColor(...colors.primary);
            doc.setFontSize(12); // Slightly larger
            doc.setFont('helvetica', 'bold');
            const categoryTitle = category.title.toUpperCase();
            doc.text(categoryTitle, xOffset + columnWidth / 2, yPos, { align: 'center' });
            
            // Decorative underline - Properly positioned
            yPos += 4;
            doc.setDrawColor(...colors.gold);
            doc.setLineWidth(0.6);
            const titleWidth = doc.getTextWidth(categoryTitle);
            const underlineX = xOffset + (columnWidth - titleWidth) / 2;
            doc.line(underlineX, yPos, underlineX + titleWidth, yPos);
            
            // Add category description if exists
            if (category.description) {
                yPos += 6;
                doc.setTextColor(...colors.warmGray);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                const descLines = wrapText(doc, category.description, columnWidth * 0.8);
                descLines.slice(0, 2).forEach(line => {
                    doc.text(line, xOffset + columnWidth / 2, yPos, { align: 'center' });
                    yPos += 3.5;
                });
            }
            
            yPos += 12; // More space before items
            
            // Category items
            for (const item of category.items) {
                // Check if item fits in current column
                let itemHeight = 8;
                if (item.description) itemHeight += 8;
                if (item.nutrition) itemHeight += 3;
                if (item.tags || item.allergens) itemHeight += 3;
                
                if (yPos + itemHeight > pageHeight - 25) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                        yPos = columnYPos[1];
                    } else {
                        startNewPage();
                        yPos = columnYPos[0];
                        currentColumn = 0;
                    }
                }
                
                const itemX = margin + (currentColumn * (columnWidth + columnGap));
                
                // Item name
                doc.setTextColor(...colors.charcoal);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const itemName = item.name || 'Unnamed Item';
                const maxNameWidth = columnWidth - 25; // Leave space for price
                const nameLines = wrapText(doc, itemName, maxNameWidth);
                doc.text(nameLines[0], itemX, yPos);
                
                // Price - aligned right, same line as name
                if (item.price) {
                    doc.setTextColor(...colors.gold);
                    doc.setFont('helvetica', 'normal');
                    const price = formatPrice(item.price);
                    doc.text(price, itemX + columnWidth, yPos, { align: 'right' });
                }
                
                // If name wraps to second line
                if (nameLines.length > 1) {
                    yPos += 3;
                    doc.setTextColor(...colors.charcoal);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text(nameLines[1], itemX, yPos);
                }
                
                yPos += 4;
                
                // Description - smaller, elegant italic
                if (item.description) {
                    doc.setTextColor(...colors.warmGray);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'italic');
                    const cleanDesc = cleanDescription(item.description);
                    const descLines = wrapText(doc, cleanDesc, columnWidth - 2);
                    descLines.slice(0, 3).forEach(line => {
                        doc.text(line, itemX, yPos);
                        yPos += 2.5;
                    });
                    yPos += 1;
                }
                
                // Nutrition info - very subtle, single line
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
                    doc.text(nutritionText, itemX, yPos);
                    yPos += 2.5;
                }
                
                // Tags and allergens - minimal, elegant
                if (item.tags || item.allergens) {
                    doc.setFontSize(6);
                    
                    if (item.tags && item.tags.length > 0) {
                        doc.setTextColor(...colors.primary);
                        doc.setFont('helvetica', 'italic');
                        const tagText = item.tags.slice(0, 2).join(', ').toLowerCase();
                        doc.text(tagText, itemX, yPos);
                    }
                    
                    if (item.allergens && item.allergens.length > 0) {
                        doc.setTextColor(...colors.warmGray);
                        doc.setFont('helvetica', 'normal');
                        const allergenText = item.allergens.join(',');
                        const allergenX = itemX + columnWidth;
                        doc.text(allergenText, allergenX, yPos, { align: 'right' });
                    }
                    yPos += 2.5;
                }
                
                yPos += 4; // Space between items
            }
            
            // Update column Y position
            columnYPos[currentColumn] = yPos + 8;
        }
        
        // ===== ALLERGEN INFO PAGE =====
        doc.addPage();
        doc.setFillColor(...colors.cream);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header
        yPos = 30;
        doc.setTextColor(...colors.primary);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('ALLERGENINFORMATIONEN', pageWidth / 2, yPos, { align: 'center' });
        
        // Decorative line
        yPos += 5;
        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.5);
        doc.line(margin + 50, yPos, pageWidth - margin - 50, yPos);
        
        // Allergen list - elegant 2 column layout
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
            
            // Code in gold
            doc.setTextColor(...colors.gold);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(code, xPos, itemY);
            
            // Name in warm gray
            doc.setTextColor(...colors.warmGray);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(` — ${name}`, xPos + 8, itemY);
        });
        
        // Footer section
        yPos = pageHeight - 50;
        
        // Decorative line
        doc.setDrawColor(...colors.gold);
        doc.setLineWidth(0.5);
        doc.line(margin + 60, yPos, pageWidth - margin - 60, yPos);
        
        // Logo or text
        yPos += 10;
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 15, yPos, 30, 15);
                yPos += 20;
            } catch (e) {
                // Fallback to text
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
        
        // Generate PDF buffer
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        console.log('Premium Restaurant PDF generated successfully, size:', pdfBuffer.length);
        
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
