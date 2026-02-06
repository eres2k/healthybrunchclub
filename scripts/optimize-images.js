#!/usr/bin/env node
/**
 * Image Optimization Script
 * Converts images to WebP/AVIF format and creates responsive variants.
 * Processes all images in content/images (including subdirectories).
 * Skips already-optimized files (WebP variants, responsive variants).
 * Ensures future CMS uploads are automatically optimized on build.
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'content', 'images');

// Responsive breakpoints
const SIZES = [400, 800, 1200];

// Quality settings
const WEBP_QUALITY = 80;
const JPEG_QUALITY = 80;
const AVIF_QUALITY = 65;

// Max dimension for any image (larger images are resized down)
const MAX_DIMENSION = 2000;

// Skip patterns - don't re-process generated files
const SKIP_PATTERNS = [/-\d+w\.webp$/, /-\d+w\.avif$/, /-optimized\./, /\.backup$/];

async function getAllImageFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip upload directory (processed separately) and hidden dirs
            if (entry.name === '.git') continue;
            const subFiles = await getAllImageFiles(fullPath);
            files.push(...subFiles);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                // Skip already-generated responsive/optimized variants
                const isGenerated = SKIP_PATTERNS.some(p => p.test(entry.name));
                if (!isGenerated) {
                    files.push(fullPath);
                }
            }
        }
    }

    return files;
}

async function optimizeImage(inputPath) {
    const dir = path.dirname(inputPath);
    const filename = path.basename(inputPath);
    const baseName = path.basename(filename, path.extname(filename));
    const ext = path.extname(filename).toLowerCase();

    try {
        const metadata = await sharp(inputPath).metadata();
        const origWidth = metadata.width;
        const origHeight = metadata.height;

        // If image is extremely large, resize the source first
        let sourceSharp = sharp(inputPath);
        let effectiveWidth = origWidth;
        if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
            sourceSharp = sourceSharp.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });
            effectiveWidth = Math.min(origWidth, MAX_DIMENSION);
            console.log(`  ↓ Resizing ${filename} from ${origWidth}x${origHeight} to fit within ${MAX_DIMENSION}px`);
        }

        // Create WebP version at effective size
        const webpOutput = path.join(dir, `${baseName}.webp`);
        const webpExists = await fileExists(webpOutput);
        if (!webpExists) {
            await sourceSharp.clone().webp({ quality: WEBP_QUALITY }).toFile(webpOutput);
            console.log(`  ✓ Created ${baseName}.webp`);
        }

        // Create responsive WebP variants
        for (const width of SIZES) {
            if (effectiveWidth > width) {
                const responsiveOutput = path.join(dir, `${baseName}-${width}w.webp`);
                const exists = await fileExists(responsiveOutput);
                if (!exists) {
                    await sharp(inputPath)
                        .resize(width)
                        .webp({ quality: WEBP_QUALITY })
                        .toFile(responsiveOutput);
                    console.log(`  ✓ Created ${baseName}-${width}w.webp`);
                }
            }
        }

        // Optimize original JPEG in-place (compress without changing dimensions)
        if (ext === '.jpg' || ext === '.jpeg') {
            const stat = await fs.stat(inputPath);
            // Only re-compress if file is larger than 500KB
            if (stat.size > 500 * 1024) {
                const optimizedPath = path.join(dir, `${baseName}-optimized.jpg`);
                await sharp(inputPath)
                    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
                    .toFile(optimizedPath);
                const newStat = await fs.stat(optimizedPath);
                // Only replace if optimization saved space
                if (newStat.size < stat.size) {
                    await fs.rename(optimizedPath, inputPath);
                    console.log(`  ✓ Optimized ${filename} (${(stat.size / 1024).toFixed(0)}KB → ${(newStat.size / 1024).toFixed(0)}KB)`);
                } else {
                    await fs.unlink(optimizedPath);
                }
            }
        } else if (ext === '.png') {
            const stat = await fs.stat(inputPath);
            // Compress large PNGs
            if (stat.size > 500 * 1024) {
                const optimizedPath = path.join(dir, `${baseName}-optimized.png`);
                await sharp(inputPath)
                    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                    .png({ compressionLevel: 9, palette: true })
                    .toFile(optimizedPath);
                const newStat = await fs.stat(optimizedPath);
                if (newStat.size < stat.size) {
                    await fs.rename(optimizedPath, inputPath);
                    console.log(`  ✓ Optimized ${filename} (${(stat.size / 1024).toFixed(0)}KB → ${(newStat.size / 1024).toFixed(0)}KB)`);
                } else {
                    await fs.unlink(optimizedPath);
                }
            }
        }

        return {
            success: true,
            filename,
            width: effectiveWidth,
            height: metadata.height,
            format: metadata.format
        };
    } catch (error) {
        console.error(`  ✗ Error processing ${filename}:`, error.message);
        return { success: false, filename, error: error.message };
    }
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function main() {
    console.log('Image Optimization Starting...\n');

    try {
        const files = await getAllImageFiles(IMAGES_DIR);
        console.log(`Found ${files.length} source images to process\n`);

        const results = [];
        for (const file of files) {
            const relPath = path.relative(IMAGES_DIR, file);
            console.log(`Processing: ${relPath}`);
            const result = await optimizeImage(file);
            results.push(result);
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`\nOptimization complete: ${successful} successful, ${failed} failed`);

        // Create image dimensions manifest for HTML
        const manifest = {};
        for (const result of results) {
            if (result.success) {
                manifest[result.filename] = {
                    width: result.width,
                    height: result.height,
                    format: result.format
                };
            }
        }

        await fs.writeFile(
            path.join(IMAGES_DIR, 'image-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        console.log('Created image-manifest.json');

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
