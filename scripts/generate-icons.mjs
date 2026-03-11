import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/favicon.svg');
const svg = fs.readFileSync(svgPath);

async function generate() {
  // Generate PNGs
  await sharp(svg).resize(256, 256).png().toFile('public/icon-256.png');
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');

  // Generate ICO from 256px PNG
  const pngBuf = fs.readFileSync('public/icon-256.png');
  const icoBuf = await pngToIco(pngBuf);
  fs.writeFileSync('public/icon.ico', icoBuf);

  console.log('Icons generated successfully!');
}

generate().catch(console.error);
