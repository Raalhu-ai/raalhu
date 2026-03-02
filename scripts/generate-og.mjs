import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const staticDir = resolve(root, 'frontend/static');

// Load font files for resvg
const sanguFontPath = resolve(staticDir, 'fonts/SanguSuruhee-Regular.ttf');
const mvTypeFontPath = resolve(staticDir, 'fonts/mvtyper.ttf');

// ═══════════════════════════════════════════════════
// OG IMAGE (1200x630)
// ═══════════════════════════════════════════════════
async function generateOG() {
  const WIDTH = 1200;
  const HEIGHT = 630;

  // Full SVG with wave logo + text (rendered by resvg with fonts)
  const overlaySvg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <!-- Gradient overlay -->
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#242526" stop-opacity="0.8"/>
        <stop offset="40%" stop-color="#242526" stop-opacity="0.5"/>
        <stop offset="70%" stop-color="#242526" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#242526" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grad)"/>

    <!-- Wave logo centered -->
    <g transform="translate(${(WIDTH - 160) / 2}, 155)">
      <defs>
        <clipPath id="wc">
          <rect x="0" y="0" width="160" height="100" />
        </clipPath>
      </defs>
      <g clip-path="url(#wc)">
        <path
          d="M-73,29 Q-55,14.5 -36,29 Q-18,43.6 0,29 Q18,14.5 36,29 Q55,43.6 73,29 Q91,14.5 109,29 Q127,43.6 145,29 Q164,14.5 182,29"
          fill="none" stroke="#7d9fe3" stroke-width="9" stroke-linecap="round" opacity="0.7"
        />
        <path
          d="M-73,51 Q-55,36.4 -36,51 Q-18,65.5 0,51 Q18,36.4 36,51 Q55,65.5 73,51 Q91,36.4 109,51 Q127,65.5 145,51 Q164,36.4 182,51"
          fill="none" stroke="#7d9fe3" stroke-width="9" stroke-linecap="round" opacity="0.45"
        />
        <path
          d="M-73,73 Q-55,58.2 -36,73 Q-18,87.3 0,73 Q18,58.2 36,73 Q55,87.3 73,73 Q91,58.2 109,73 Q127,87.3 145,73 Q164,58.2 182,73"
          fill="none" stroke="#7d9fe3" stroke-width="9" stroke-linecap="round" opacity="0.25"
        />
      </g>
    </g>

    <!-- "ރާޅު" heading in Sangu Suruhee -->
    <text
      x="${WIDTH / 2}" y="340"
      text-anchor="middle"
      font-family="Sangu Suruhee"
      font-size="140"
      fill="#7d9fe3"
      direction="rtl"
    >ރާޅު</text>

    <!-- Tagline in MV Typewriter -->
    <text
      x="${WIDTH / 2}" y="410"
      text-anchor="middle"
      font-family="MV Typewriter"
      font-size="30"
      fill="rgba(232, 234, 237, 0.7)"
      direction="rtl"
    >ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި</text>
  </svg>`;

  // Render SVG to PNG with resvg (supports custom fonts)
  const resvg = new Resvg(overlaySvg, {
    font: {
      fontFiles: [sanguFontPath, mvTypeFontPath],
      loadSystemFonts: false,
    },
  });
  const overlayPng = resvg.render().asPng();

  // Composite overlay on hero background
  const heroPath = resolve(staticDir, 'hero.jpg');
  const image = await sharp(heroPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .composite([
      { input: Buffer.from(overlayPng), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(image).toFile(resolve(root, 'asset/og-image.png'));
  await sharp(image).toFile(resolve(staticDir, 'og-image.png'));
  console.log('OG image (1200x630) generated');
}

// ═══════════════════════════════════════════════════
// FAVICON — wave logo on dark bg
// ═══════════════════════════════════════════════════
function makeWaveSvg(size) {
  const pad = Math.round(size * 0.15);
  const inner = size - pad * 2;
  const sw = Math.max(1.5, size / 32 * 2);

  return `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#242526"/>
    <g transform="translate(${pad}, ${pad + inner * 0.15})">
      <defs>
        <clipPath id="fc-${size}">
          <rect x="0" y="0" width="${inner}" height="${inner * 0.7}" />
        </clipPath>
      </defs>
      <g clip-path="url(#fc-${size})">
        <path
          d="M${-inner * 0.45},${inner * 0.18}
           Q${-inner * 0.27},${inner * 0.04} ${-inner * 0.09},${inner * 0.18}
           Q${inner * 0.09},${inner * 0.32} ${inner * 0.27},${inner * 0.18}
           Q${inner * 0.45},${inner * 0.04} ${inner * 0.64},${inner * 0.18}
           Q${inner * 0.82},${inner * 0.32} ${inner},${inner * 0.18}
           Q${inner * 1.18},${inner * 0.04} ${inner * 1.36},${inner * 0.18}"
          fill="none" stroke="#7d9fe3" stroke-width="${sw}" stroke-linecap="round" opacity="0.85"
        />
        <path
          d="M${-inner * 0.45},${inner * 0.38}
           Q${-inner * 0.27},${inner * 0.24} ${-inner * 0.09},${inner * 0.38}
           Q${inner * 0.09},${inner * 0.52} ${inner * 0.27},${inner * 0.38}
           Q${inner * 0.45},${inner * 0.24} ${inner * 0.64},${inner * 0.38}
           Q${inner * 0.82},${inner * 0.52} ${inner},${inner * 0.38}
           Q${inner * 1.18},${inner * 0.24} ${inner * 1.36},${inner * 0.38}"
          fill="none" stroke="#7d9fe3" stroke-width="${sw}" stroke-linecap="round" opacity="0.55"
        />
        <path
          d="M${-inner * 0.45},${inner * 0.58}
           Q${-inner * 0.27},${inner * 0.44} ${-inner * 0.09},${inner * 0.58}
           Q${inner * 0.09},${inner * 0.72} ${inner * 0.27},${inner * 0.58}
           Q${inner * 0.45},${inner * 0.44} ${inner * 0.64},${inner * 0.58}
           Q${inner * 0.82},${inner * 0.72} ${inner},${inner * 0.58}
           Q${inner * 1.18},${inner * 0.44} ${inner * 1.36},${inner * 0.58}"
          fill="none" stroke="#7d9fe3" stroke-width="${sw}" stroke-linecap="round" opacity="0.3"
        />
      </g>
    </g>
  </svg>`;
}

async function generateFavicons() {
  const sizes = [
    { name: 'favicon.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    const svg = makeWaveSvg(size);
    await sharp(Buffer.from(svg)).png().toFile(resolve(staticDir, name));
    console.log(`${name} (${size}x${size}) generated`);
  }

  // SVG favicon
  writeFileSync(resolve(staticDir, 'favicon.svg'), makeWaveSvg(44));
  console.log('favicon.svg generated');
}

// ═══════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════
console.log('Generating assets...\n');
await generateOG();
await generateFavicons();
console.log('\nDone!');
