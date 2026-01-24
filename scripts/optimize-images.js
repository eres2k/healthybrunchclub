#!/usr/bin/env node
/**
 * Image Optimization Script
 * Converts images to WebP format and creates responsive variants
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'content', 'images');
const OUTPUT_DIR = path.join(__dirname, '..', 'content', 'images');

// Image sizes for responsive images
const SIZES = [400, 800, 1200];

// Quality settings
const WEBP_QUALITY = 80;
const JPEG_QUALITY = 80;

async function getImageFiles() {
    const files = await fs.readdir(IMAGES_DIR);
    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png'].includes(ext) && !file.includes('.backup');
    });
}

async function optimizeImage(filename) {
    const inputPath = path.join(IMAGES_DIR, filename);
    const baseName = path.basename(filename, path.extname(filename));

    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Create WebP version at original size
        const webpOutput = path.join(OUTPUT_DIR, `${baseName}.webp`);
        await sharp(inputPath)
            .webp({ quality: WEBP_QUALITY })
            .toFile(webpOutput);
        console.log(`✓ Created ${baseName}.webp`);

        // Create responsive WebP versions for larger images
        for (const width of SIZES) {
            if (metadata.width > width) {
                const responsiveOutput = path.join(OUTPUT_DIR, `${baseName}-${width}w.webp`);
                await sharp(inputPath)
                    .resize(width)
                    .webp({ quality: WEBP_QUALITY })
                    .toFile(responsiveOutput);
                console.log(`  ✓ Created ${baseName}-${width}w.webp`);
            }
        }

        // Optimize original JPEG/PNG
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
            const optimizedPath = path.join(OUTPUT_DIR, `${baseName}-optimized.jpg`);
            await sharp(inputPath)
                .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
                .toFile(optimizedPath);
            // Replace original with optimized
            await fs.rename(optimizedPath, inputPath);
            console.log(`  ✓ Optimized ${filename}`);
        } else if (ext === '.png') {
            // For PNGs, just create WebP as the main optimization
            console.log(`  ✓ PNG ${filename} (WebP created as optimization)`);
        }

        return { success: true, filename };
    } catch (error) {
        console.error(`✗ Error processing ${filename}:`, error.message);
        return { success: false, filename, error: error.message };
    }
}

async function main() {
    console.log('🖼️  Image Optimization Starting...\n');

    try {
        const files = await getImageFiles();
        console.log(`Found ${files.length} images to optimize\n`);

        const results = [];
        for (const file of files) {
            const result = await optimizeImage(file);
            results.push(result);
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`\n✅ Optimization complete: ${successful} successful, ${failed} failed`);

        // Create image dimensions manifest for HTML
        const manifest = {};
        for (const file of files) {
            try {
                const inputPath = path.join(IMAGES_DIR, file);
                const metadata = await sharp(inputPath).metadata();
                manifest[file] = {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format
                };
            } catch (e) {
                // Skip files that can't be read
            }
        }

        await fs.writeFile(
            path.join(OUTPUT_DIR, 'image-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        console.log('📋 Created image-manifest.json');

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
