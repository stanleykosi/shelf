import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { brandColors as colors, logoWidth, shelfSymbolPath, shelfWordmark, wordmarkScale } from "../src/brand/identity";

const root = process.cwd();
const output = join(root, "public/brand");
const artifacts = join(root, "artifacts/branding");
await mkdir(output, { recursive: true });
await mkdir(artifacts, { recursive: true });

function svgDocument(width: number, height: number, content: string, title: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${title}</title>${content}</svg>`;
}

function symbol(color: string, background?: string) {
  return svgDocument(64, 64, `${background ? `<path fill="${background}" d="M0 0H64V64H0Z"/>` : ""}<path fill="${color}" d="${shelfSymbolPath}"/>`, "Shelf");
}

function logo(color: string, markColor = color) {
  return svgDocument(logoWidth, 64, `<path fill="${markColor}" d="${shelfSymbolPath}"/><path fill="${color}" d="${shelfWordmark.path}" transform="translate(78 10) scale(${wordmarkScale})"/>`, "Shelf");
}

const vectors = {
  "shelf-symbol-dark.svg": symbol(colors.ink),
  "shelf-symbol-light.svg": symbol(colors.paper),
  "shelf-symbol-mint.svg": symbol(colors.mint),
  "shelf-logo-dark.svg": logo(colors.ink),
  "shelf-logo-light.svg": logo(colors.paper, colors.mint),
  "shelf-logo-white.svg": logo("#ffffff"),
  "shelf-logo-black.svg": logo("#000000"),
  "shelf-app-icon.svg": symbol(colors.ink, colors.mint),
  "shelf-avatar.svg": svgDocument(64, 64, `<path fill="${colors.mint}" d="M0 0H64V64H0Z"/><path fill="${colors.ink}" d="${shelfSymbolPath}" transform="translate(6.4 6.4) scale(.8)"/>`, "Shelf"),
};
for (const [name, svg] of Object.entries(vectors)) await writeFile(join(output, name), svg + "\n");

await copyFile(join(root, "src/app/fonts/Raleway-variable.ttf"), join(output, "raleway.ttf"));
await copyFile(join(root, "src/app/fonts/OFL.txt"), join(output, "FONT-LICENSE.txt"));
const fontData = await readFile(join(output, "raleway.ttf"));
const fontCss = `@font-face{font-family:Raleway;src:url(data:font/ttf;base64,${fontData.toString("base64")}) format('truetype');font-weight:100 900;font-display:block}`;
const baseCss = `*{box-sizing:border-box}html,body{margin:0}body{font-family:Raleway,Arial,sans-serif;color:${colors.ink}}svg{display:block}h1,h2,p{margin:0}`;

function thumbnail(width: number, height: number, square = false) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Shelf — brand thumbnail</title><style>
  ${fontCss}${baseCss}
  .card{width:${width}px;height:${height}px;overflow:hidden;position:relative;background:${square ? colors.paper : colors.ink};color:${square ? colors.ink : colors.paper};padding:${square ? 76 : 64}px;display:flex;flex-direction:column}
  .logo{width:${square ? 210 : 176}px}.logo svg{width:100%;height:auto}
  .eyebrow{font-size:${square ? 16 : 13}px;letter-spacing:.15em;text-transform:uppercase;font-weight:600;margin-top:${square ? 68 : 66}px;color:${square ? colors.forest : colors.sage}}
  h1{font-size:${square ? 77 : 66}px;font-weight:500;line-height:1.08;letter-spacing:-.052em;margin-top:25px;position:relative;z-index:1}
  h1 span{color:${square ? colors.forest : colors.mint}}
  .art{position:absolute;${square ? "right:74px;bottom:154px;width:280px" : "right:28px;top:151px;width:380px"};color:${square ? colors.forest : colors.mint}}.art svg{width:100%;height:auto}
  .footer{margin-top:auto;border-top:1px solid ${square ? "#ccd4c9" : "#35473c"};padding-top:22px;display:flex;justify-content:space-between;font-size:${square ? 18 : 15}px;color:${square ? colors.forest : colors.sage}}
  .index{font-variant-numeric:tabular-nums}
  </style><div class="card"><div class="logo">${logo(square ? colors.ink : colors.paper, square ? colors.ink : colors.mint)}</div><p class="eyebrow">Familiar products. A wider perspective.</p><h1>The things you know.<br><span>The companies<br>behind them.</span></h1><div class="art">${symbol(square ? colors.forest : colors.mint)}</div><div class="footer"><span>Discover. Understand. Collect.</span><span class="index">Your research. Your decisions.</span></div></div></html>`;
}

const preview = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shelf — identity study</title>
<style>
@font-face {
  font-family:Raleway;
  src:url('./raleway.ttf') format('truetype');
  font-weight:100 900;
  font-display:swap
}
${baseCss} body {
  background:${colors.paper}
}
a {
  color:inherit;
  text-underline-offset:4px
}
a:focus-visible {
  outline:3px solid #287e50;
  outline-offset:5px
}
header,main,footer {
  max-width:1400px;
  margin:auto;
  padding:40px 60px
}
header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-bottom:1px solid #d5dcd2
}
header img {
  width:114px
}
header span,.label {
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.12em
}
.intro {
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:40px;
  margin:10px 0 38px
}
.intro h1 {
  font-size:54px;
  line-height:1.06;
  letter-spacing:-2.5px;
  font-weight:500
}
.intro p {
  max-width:405px;
  font-size:15px;
  line-height:1.7;
  color:#496150
}
.grid {
  display:grid;
  grid-template-columns:1.65fr 1fr;
  gap:16px
}
.panel {
  min-height:285px;
  padding:30px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  overflow:hidden
}
.dark {
  background:${colors.ink};
  color:${colors.paper}
}
.mint {
  background:${colors.mint}
}
.forest {
  background:${colors.forest};
  color:${colors.paper}
}
.paper {
  background:#e7ebdf
}
.lockup {
  width:70%;
  align-self:center;
  margin:35px 0
}
.symbol {
  width:140px;
  align-self:center
}
.caption {
  display:flex;
  justify-content:space-between;
  gap:15px;
  font-size:11px;
  color:inherit
}
.caption a {
  text-decoration-thickness:1px
}
.samples {
  display:flex;
  align-items:flex-end;
  justify-content:center;
  gap:30px;
  margin:auto
}
.sample {
  text-align:center;
  font-size:10px
}
.sample img {
  display:block;
  margin:0 auto 14px
}
.palette {
  display:flex;
  gap:3px;
  height:85px;
  margin:30px 0
}
.swatch {
  flex:1;
  display:flex;
  align-items:end;
  padding:12px;
  font:10px Arial,sans-serif
}
.share {
  padding:0;
  min-height:0;
  background:${colors.ink}
}
.share img {
  width:100%;
  height:auto;
  display:block
}
.thumbnails {
  display:grid;
  grid-template-columns:1.65fr 1fr;
  gap:16px;
  margin-top:16px
}
.thumbnails .panel {
  min-height:0
}
.type-title {
  font-size:38px;
  line-height:1.14;
  font-weight:500;
  letter-spacing:-1.5px;
  margin:30px 0
}
.type-copy {
  font-size:13px;
  line-height:1.65;
  max-width:330px
}
footer {
  padding-top:15px;
  font-size:12px;
  color:#496150;
  line-height:1.8
}
.assets {
  display:flex;
  gap:20px;
  flex-wrap:wrap;
  margin-top:18px
}
.note {
  margin-top:14px
}
 @media(max-width:1100px)  {
   header,main,footer  {
   padding:24px
}
 .intro  {
   display:block
}
 .intro h1  {
   font-size:40px;
   margin-bottom:20px
}
 .grid,.thumbnails  {
   grid-template-columns:1fr
}
 .panel  {
   min-height:250px
}
 .lockup  {
   width:80%
}
 .intro p  {
   font-size:14px
}
 .palette  {
   height:auto;
   display:grid;
   grid-template-columns:repeat(3,minmax(0,1fr))
}
 .swatch  {
   min-height:54px;
   padding:8px;
   font-size:9px
}
 .samples  {
   gap:16px;
   flex-wrap:wrap
}

}

</style>
</head>
<body>
<header>
<img src="shelf-logo-dark.svg" alt="Shelf">
<span>Identity study · 01</span>
</header>
<main>
<section class="intro">
<h1>A place for<br>your discoveries.</h1>
<p>An S built from open shelves. A simple home for familiar products, the companies behind them, and the things you want to understand.</p>
</section>
<div class="grid">
<section class="panel dark">
<span class="label">01 / Primary signature</span>
<img class="lockup" src="shelf-logo-light.svg" alt="Shelf logo in mint and paper">
<div class="caption">
<span>Space to see the connection.</span>
<a href="shelf-logo-light.svg" download>Download SVG</a>
</div>
</section>
<section class="panel mint">
<span class="label">02 / The shelf monogram</span>
<img class="symbol" src="shelf-symbol-dark.svg" alt="An S made of three shelves">
<div class="caption">
<span>One shape. Every scale.</span>
<a href="shelf-symbol-dark.svg" download>Download SVG</a>
</div>
</section>
<section class="panel paper">
<span class="label">03 / Palette & typography</span>
<p class="type-title">Familiar products.<br>A wider perspective.</p>
<div class="palette">${Object.entries(colors).map(([name, color]) => `<div class="swatch" style="background:${color};color:${name === "ink" || name === "forest" ? colors.paper : colors.ink}">${color.toUpperCase()}</div>`).join("")}</div>
<div class="caption">
<span>Raleway / Regular · Medium · Semibold</span>
<a href="shelf-logo-dark.svg" download>Dark logo</a>
</div>
</section>
<section class="panel forest">
<span class="label">04 / Built for small spaces</span>
<div class="samples">${[16,32,48,96].map(size => `<div class="sample">
<img src="shelf-app-icon.svg" alt="Shelf at ${size} pixels" width="${size}" height="${size}">${size}px</div>`).join("")}</div>
<div class="caption">
<a href="favicon.ico" download>Favicon</a>
<a href="apple-touch-icon.png" download>Apple icon</a>
<a href="avatar-512.png" download>Avatar</a>
</div>
</section>
</div>
<div class="thumbnails">
<section class="share">
<a href="share-1200x630.png" download aria-label="Download Shelf link preview">
<img src="share-1200x630.png" alt="Shelf. The things you know. The companies behind them.">
</a>
</section>
<section class="panel mint">
<span class="label">05 / The story we tell</span>
<p class="type-title">Start with<br>what you know.</p>
<p class="type-copy">Curious, clear and considered. Familiar products invite discovery. The person stays in control of the next step.</p>
<div class="caption">
<span>Recognition → understanding → choice</span>
</div>
</section>
</div>
</main>
<footer>
<strong>First direction for review.</strong> Vector logos have outlined lettering. Every icon and image uses the same source geometry.<div class="assets">
<a href="share-1200x630.png" download>Link preview · 1200 × 630</a>
<a href="thumbnail-1920x1080.png" download>Video thumbnail · 1920 × 1080</a>
<a href="social-1080x1080.png" download>Square post · 1080 × 1080</a>
<a href="shelf-logo-dark.png" download>Transparent logo PNG</a>
<a href="shelf-logo-white.svg" download>White logo</a>
<a href="shelf-logo-black.svg" download>Black logo</a>
</div>
<p class="note">Mint highlights the identity. Paper makes room for the content. Dark green anchors the whole system.</p>
</footer>
</body>
</html>`;
await writeFile(join(output, "index.html"), preview);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
try {
  async function rasterize(svg: string, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await page.setContent(`<style>${baseCss}svg{width:100%;height:100%}</style>${svg}`);
    return page.screenshot({ omitBackground: true });
  }

  for (const name of ["shelf-logo-dark", "shelf-logo-light"]) {
    await writeFile(join(output, `${name}.png`), await rasterize(vectors[`${name}.svg` as keyof typeof vectors], logoWidth * 4, 256));
  }
  const icon = vectors["shelf-app-icon.svg"];
  for (const [name, size] of [["favicon-16.png", 16], ["favicon-32.png", 32], ["favicon-48.png", 48], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["avatar-512.png", 512]] as const) {
    const artwork = name === "avatar-512.png" ? vectors["shelf-avatar.svg"] : icon;
    await writeFile(join(output, name), await rasterize(artwork, size, size));
  }

  // ICO permits PNG frames. Keep 16, 32 and 48 px frames for browser/desktop use.
  const frames = await Promise.all([16, 32, 48].map(size => readFile(join(output, `favicon-${size}.png`))));
  const directory = Buffer.alloc(6 + frames.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(frames.length, 4);
  let offset = directory.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    directory[entry] = [16, 32, 48][index];
    directory[entry + 1] = [16, 32, 48][index];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await writeFile(join(output, "favicon.ico"), Buffer.concat([directory, ...frames]));

  for (const [name, width, height, square] of [["share-1200x630", 1200, 630, false], ["social-1080x1080", 1080, 1080, true]] as const) {
    const html = thumbnail(width, height, square);
    await writeFile(join(output, `${name}.html`), html.replace(fontCss, "@font-face{font-family:Raleway;src:url('./raleway.ttf');font-weight:100 900;font-display:block}"));
    await page.setViewportSize({ width, height });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(output, `${name}.png`) });
  }
  // Recompose the landscape artwork to 16:9 instead of stretching a PNG.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.setContent(thumbnail(1200, 675).replace("</style>", ".card{transform:scale(1.6);transform-origin:top left}</style>"));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(output, "thumbnail-1920x1080.png") });

  // Inline the preview assets for a portable, reproducible review screenshot.
  let board = preview.replace(/@font-face\s*\{[^}]+\}/, fontCss);
  const sources = [...new Set([...board.matchAll(/src="([^"]+)"/g)].map(match => match[1]))];
  for (const source of sources) {
    const data = await readFile(join(output, source));
    const type = source.endsWith(".svg") ? "image/svg+xml" : "image/png";
    board = board.replaceAll(`src="${source}"`, `src="data:${type};base64,${data.toString("base64")}"`);
  }
  await page.setViewportSize({ width: 1400, height: 1100 });
  await page.setContent(board);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(artifacts, "brand-board.png"), fullPage: true });

  // Next.js owns these routes through its file-based metadata conventions.
  await copyFile(join(output, "favicon.ico"), join(root, "src/app/favicon.ico"));
  await copyFile(join(output, "shelf-app-icon.svg"), join(root, "src/app/icon.svg"));
  await copyFile(join(output, "apple-touch-icon.png"), join(root, "src/app/apple-icon.png"));
  await copyFile(join(output, "share-1200x630.png"), join(root, "src/app/opengraph-image.png"));
  await writeFile(join(root, "src/app/opengraph-image.alt.txt"), "Shelf — The things you know. The companies behind them.\n");
  console.log("Generated Shelf logos, icons, thumbnails, metadata images and the review board.");
} finally {
  await browser.close();
}
