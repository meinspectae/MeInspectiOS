import sharp from 'sharp';
import fs from 'fs';

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const ICON = 'assets/icon.png';            // symbol on white, 1024, has alpha
const FG = 'assets/icon-foreground.png';   // symbol on transparent, 62% safe zone

// ---------- iOS: single 1024 icon, NO alpha channel ----------
const iosIcon = await sharp(ICON)
  .flatten({ background: WHITE })
  .resize(1024, 1024)
  .removeAlpha()
  .png()
  .toBuffer();
fs.writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', iosIcon);
console.log('iOS AppIcon-512@2x.png written (1024x1024, no alpha)');

// ---------- Android ----------
const legacy = { 'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192 };
const fgSizes = { 'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432 };

// Base square launcher = symbol flattened on white
async function squareIcon(size) {
  return sharp(ICON).flatten({ background: WHITE }).resize(size, size).png().toBuffer();
}

// Round launcher = square icon masked by a circle (corners transparent)
async function roundIcon(size) {
  const base = await squareIcon(size);
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return sharp(base)
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

// Adaptive foreground = symbol on transparent (mask applied by launcher)
async function foreground(size) {
  return sharp(FG).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

for (const [density, size] of Object.entries(legacy)) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  fs.writeFileSync(`${dir}/ic_launcher.png`, await squareIcon(size));
  fs.writeFileSync(`${dir}/ic_launcher_round.png`, await roundIcon(size));
  fs.writeFileSync(`${dir}/ic_launcher_foreground.png`, await foreground(fgSizes[density]));
  console.log(`Android ${density}: launcher ${size}, foreground ${fgSizes[density]}`);
}

console.log('All native icons generated.');
