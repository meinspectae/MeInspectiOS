import sharp from 'sharp';
import fs from 'fs';

const SRC = 'chat/wv72g7uo7w.jpg';
const white = { r: 255, g: 255, b: 255, alpha: 1 };

// Preserve the complete uploaded logo lockup for every branded surface.
const source = await sharp(SRC).flatten({ background: white }).png().toBuffer();

async function composeCompleteLogo(size, scale = 0.92) {
  const target = Math.round(size * scale);
  const resized = await sharp(source)
    .resize(target, target, { fit: 'contain', background: white })
    .png()
    .toBuffer();
  const offset = Math.round((size - target) / 2);

  return sharp({ create: { width: size, height: size, channels: 4, background: white } })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toBuffer();
}

// Universal and native launcher source: complete logo on an opaque white square.
fs.writeFileSync('assets/icon.png', await composeCompleteLogo(1024));
console.log('Wrote assets/icon.png with the complete logo');

// Android adaptive foreground. Keep the complete lockup inside Android's safe zone.
const foregroundLogo = await sharp(source)
  .resize(636, 636, { fit: 'contain', background: white })
  .png()
  .toBuffer();
const foreground = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: foregroundLogo, left: 194, top: 194 }])
  .png()
  .toBuffer();
fs.writeFileSync('assets/icon-foreground.png', foreground);
console.log('Wrote assets/icon-foreground.png with the complete logo');

const background = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: white } })
  .png()
  .toBuffer();
fs.writeFileSync('assets/icon-background.png', background);
console.log('Wrote assets/icon-background.png');

// In-app, favicon, and PWA logo.
fs.writeFileSync('public/meinspect-logo.png', await composeCompleteLogo(512, 1));
console.log('Wrote public/meinspect-logo.png with the complete logo');
