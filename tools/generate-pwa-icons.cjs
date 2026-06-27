const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'MEXICANO.png');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

async function generateIcons() {
  console.log('Generating PWA icons from:', SOURCE);
  
  for (const { name, size } of sizes) {
    const output = path.join(ICONS_DIR, name);
    
    // Create a square canvas with dark background, centered logo
    const bg = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 2, g: 2, b: 2, alpha: 1 } // #020202
      }
    }).png();

    // Resize the logo to fit within the icon with some padding
    const logoPadding = Math.round(size * 0.12);
    const logoSize = size - (logoPadding * 2);
    
    const resizedLogo = await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await bg
      .composite([{
        input: resizedLogo,
        top: logoPadding,
        left: logoPadding,
      }])
      .toFile(output);
    
    console.log(`  ✓ ${name} (${size}x${size})`);
  }
  
  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
