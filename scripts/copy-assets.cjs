const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const iconsDir = path.join(distDir, "icons");
const sourceIconsDir = path.join(rootDir, "public", "icons");
const manifestPath = path.join(rootDir, "manifest.json");

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

if (fs.existsSync(sourceIconsDir)) {
  for (const file of fs.readdirSync(sourceIconsDir)) {
    if (file.endsWith(".png") || file === "icon.svg") {
      const src = path.join(sourceIconsDir, file);
      const dest = path.join(iconsDir, file);
      fs.copyFileSync(src, dest);
      console.log("Copied:", file);
    }
  }
}

for (const file of ["icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png"]) {
  if (!fs.existsSync(path.join(iconsDir, file))) {
    throw new Error(`Missing required extension icon: ${file}`);
  }
}

const bgSrc = path.join(rootDir, "src", "background.js");
const bgDest = path.join(distDir, "background.js");
if (fs.existsSync(bgSrc)) {
  fs.copyFileSync(bgSrc, bgDest);
  console.log("Copied: background.js");
}

const indexHtml = path.join(distDir, "index.html");
const sidepanelHtml = path.join(distDir, "sidepanel.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, sidepanelHtml);
  console.log("Copied: index.html -> sidepanel.html");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
fs.writeFileSync(path.join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log("Build post-processing complete");
