import sharp from 'sharp';
import fs from 'fs';

const SRC = 'chat/wv72g7uo7w.jpg';

// The uploaded logo is a full lockup: a house+eye+check symbol on top and the
// "MeInspect / Property Condition Reports" wordmark below. A wordmark is
// illegible at app-icon sizes, so for the launcher/app icon we extract just the
// brand symbol (the recognizable mark) and center it on a clean background.

// 1) Crop the top region that contains only the symbol (exclude the text),
//    then trim the surrounding white to get a tight bounding box.
const topBuf = await sharp(SRC)
  .extract({ left: 0, top: 60, width: 1024, height: 560 }) // top area = symbol
  .png()
  .toBuffer();
const symbolBuf = await sharp(topBuf)
  .trim({ threshold: 20 })
  .png()
  .toBuffer();

const symMeta = await sharp(symbolBuf).metadata();
console.log('Trimmed symbol size:', symMeta.width, symMeta.height);

// Helper: place the symbol centered on a square canvas at a given scale.
async function composeSquare(size, scale, background) {
  const target = Math.round(size * scale);
  const resized = await sharp(symbolBuf)
    .resize({ width: target, height: target, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const rm = await sharp(resized).metadata();
  const left = Math.round((size - rm.width) / 2);
  const top = Math.round((size - rm.height) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

// 2) iOS / universal icon (no transparency, white background) — symbol at 76%.
const white = { r: 255, g: 255, b: 255, alpha: 1 };
const icon = await composeSquare(1024, 0.76, white);
fs.writeFileSync('assets/icon.png', icon);
console.log('Wrote assets/icon.png');

// 3) Android adaptive foreground — symbol sits in the safe zone (~62%) on a
//    transparent canvas; the launcher applies its own mask.
const fg = await composeSquare(1024, 0.62, { r: 0, g: 0, b: 0, alpha: 0 });
fs.writeFileSync('assets/icon-foreground.png', fg);
console.log('Wrote assets/icon-foreground.png');

// 4) Android adaptive background — solid white to match the brand.
const bg = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: white },
}).png().toBuffer();
fs.writeFileSync('assets/icon-background.png', bg);
console.log('Wrote assets/icon-background.png');

// 5) Also refresh the in-app logo used across the UI / PWA (full lockup, kept).
const logo = await sharp(SRC).resize(512, 512, { fit: 'contain', background: white }).png().toBuffer();
fs.writeFileSync('public/meinspect-logo.png', logo);
console.log('Wrote public/meinspect-logo.png');
