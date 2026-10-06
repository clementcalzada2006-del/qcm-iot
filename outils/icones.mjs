// Génère les icônes PNG à partir de icons/icon.svg, avec Edge (ou Chrome) en mode headless.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(racine, "icons", "icon.svg"), "utf8");
const interieur = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<rect width="512" height="512" rx="104" fill="#1F3864"\/>/, "");

// Icône pleine (sans coins arrondis) avec le dessin réduit au centre : maskable Android et iPhone.
const plein = (echelle) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1F3864"/>
  <g transform="translate(256 256) scale(${echelle}) translate(-256 -256)">${interieur}</g></svg>`;

const sorties = [
  { nom: "icon-192.png", taille: 192, contenu: svg, transparent: true },
  { nom: "icon-512.png", taille: 512, contenu: svg, transparent: true },
  { nom: "icon-maskable-512.png", taille: 512, contenu: plein(0.76), transparent: false },
  { nom: "apple-touch-icon.png", taille: 180, contenu: plein(0.9), transparent: false },
];

const navigateur = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch({ channel: "chrome" }));
for (const s of sorties) {
  const page = await navigateur.newPage({ viewport: { width: s.taille, height: s.taille } });
  const corps = s.contenu.replace("<svg ", `<svg width="${s.taille}" height="${s.taille}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${corps}</body></html>`);
  await page.screenshot({ path: join(racine, "icons", s.nom), omitBackground: s.transparent });
  await page.close();
  console.log("créée :", s.nom);
}
await navigateur.close();
