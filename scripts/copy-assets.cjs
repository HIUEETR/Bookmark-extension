const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const iconsDir = path.join(distDir, 'icons');
const smartBookmarkDist = path.join(__dirname, '..', '..', 'Smart-Bookmark', 'dist');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy icons from Smart-Bookmark if available
const srcIcons = path.join(smartBookmarkDist, 'icons');
if (fs.existsSync(srcIcons)) {
  fs.readdirSync(srcIcons).forEach(file => {
    if (file.endsWith('.png') || file === 'icon.svg') {
      fs.copyFileSync(path.join(srcIcons, file), path.join(iconsDir, file));
      console.log('Copied:', file);
    }
  });
} else {
  // Create minimal valid PNG files as fallbacks
  const pngFiles = ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png'];
  pngFiles.forEach(name => {
    const size = parseInt(name.match(/(\d+)/)[1]);
    // Create minimal valid PNG header + IHDR + IDAT + IEND
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, size & 0xFF, (size >> 8) & 0xFF, 0x00, 0x00, 0x00, size & 0xFF, (size >> 8) & 0xFF, // width/height
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82 // CRC
    ]);
    fs.writeFileSync(path.join(iconsDir, name), png);
  });
}

// Write manifest without icon requirements (let Edge use default)
const manifest = {
  name: "My Bookmark",
  short_name: "MyBookmark",
  version: "1.0.0",
  description: "Multi-column bookmark manager",
  manifest_version: 3,
  chrome_url_overrides: {
    newtab: "sidepanel.html"
  },
  permissions: [
    "bookmarks",
    "storage"
  ]
};

// Copy index.html as sidepanel.html for the Chrome extension newtab override
const indexHtml = path.join(distDir, 'index.html');
const sidepanelHtml = path.join(distDir, 'sidepanel.html');
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, sidepanelHtml);
  console.log('Copied: index.html -> sidepanel.html');
}

fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('Build post-processing complete');