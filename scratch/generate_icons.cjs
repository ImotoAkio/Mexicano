const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Golden logo SVG with padding on dark background (#020202)
const svgLogo = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background -->
  <rect width="512" height="512" fill="#020202" />
  
  <!-- Centered Vila Náutica Gold Sails Logo -->
  <g transform="translate(106, 106) scale(3.0)">
    <!-- Bottom Triangle -->
    <polygon points="12,75 80,75 85,55" fill="#B69D74" />
    
    <!-- Middle Triangle -->
    <polygon points="23,64 72,50 77,30" fill="#B69D74" />
    
    <!-- Top Triangle -->
    <polygon points="37,42 64,25 69,5" fill="#B69D74" />
  </g>
</svg>
`;

const sizes = [
  { name: 'favicon.png', size: 512, dir: 'public' },
  { name: 'icon-72x72.png', size: 72, dir: 'public/icons' },
  { name: 'icon-96x96.png', size: 96, dir: 'public/icons' },
  { name: 'icon-128x128.png', size: 128, dir: 'public/icons' },
  { name: 'icon-144x144.png', size: 144, dir: 'public/icons' },
  { name: 'icon-152x152.png', size: 152, dir: 'public/icons' },
  { name: 'icon-192x192.png', size: 192, dir: 'public/icons' },
  { name: 'icon-384x384.png', size: 384, dir: 'public/icons' },
  { name: 'icon-512x512.png', size: 512, dir: 'public/icons' },
  { name: 'apple-touch-icon-180x180.png', size: 180, dir: 'public/icons' }
];

async function generate() {
  const svgBuffer = Buffer.from(svgLogo);
  
  for (const item of sizes) {
    const targetDir = path.join('c:\\mexicano', item.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, item.name);
    
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(targetPath);
      
    console.log(`Generated: ${targetPath} (${item.size}x${item.size})`);
  }
  console.log('All icons generated successfully!');
}

generate().catch(err => console.error('Error generating icons:', err));
