#!/usr/bin/env node
/**
 * RaiderPark Icon Generator
 * Converts SVG assets to PNG files for iOS, Android, and Web
 *
 * Usage: npx tsx scripts/generate-icons.js
 * Or install sharp: npm install sharp --save-dev && node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp for conversion
async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Sharp not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const assetsDir = path.join(__dirname, '..', 'assets');
  const svgDir = path.join(assetsDir, 'svg');

  const icons = [
    { input: 'icon.svg', output: 'icon.png', size: 1024 },
    { input: 'adaptive-icon.svg', output: 'adaptive-icon.png', size: 1024 },
    { input: 'splash-icon.svg', output: 'splash-icon.png', size: 512 },
    { input: 'favicon.svg', output: 'favicon.png', size: 48 },
    { input: 'notification-icon.svg', output: 'notification-icon.png', size: 96 },
  ];

  console.log('🎨 Generating RaiderPark icons...\n');

  for (const icon of icons) {
    const inputPath = path.join(svgDir, icon.input);
    const outputPath = path.join(assetsDir, icon.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${icon.input} - file not found`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${icon.output} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error generating ${icon.output}:`, error.message);
    }
  }

  // Generate additional iOS icon sizes if needed
  const iosIconSizes = [
    { size: 180, name: 'icon-180.png' }, // iPhone @3x
    { size: 120, name: 'icon-120.png' }, // iPhone @2x
    { size: 167, name: 'icon-167.png' }, // iPad Pro
    { size: 152, name: 'icon-152.png' }, // iPad @2x
  ];

  const iconSvgPath = path.join(svgDir, 'icon.svg');
  if (fs.existsSync(iconSvgPath)) {
    console.log('\n📱 Generating iOS icon variants...');
    for (const variant of iosIconSizes) {
      try {
        const outputPath = path.join(assetsDir, variant.name);
        await sharp(iconSvgPath)
          .resize(variant.size, variant.size)
          .png()
          .toFile(outputPath);
        console.log(`✅ Generated ${variant.name} (${variant.size}x${variant.size})`);
      } catch (error) {
        console.error(`❌ Error generating ${variant.name}:`, error.message);
      }
    }
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\nNote: These icons use the Double-T parking logo design.');
  console.log('For splash screen, the background color #CC0000 is set in app.json.\n');
}

generateIcons().catch(console.error);
