// Contrôle des données du QCM : node outils/verifier-donnees.mjs
// Vérifie la structure de data.json et que la longueur des choix ne trahit pas la bonne réponse.
// (Les choix ont été reformulés le 07/10/2026 : data.json n'est plus une copie du prompt d'origine.)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const brut = readFileSync(join(racine, "data.json"), "utf8");
const erreurs = [];
const ok = (cond, msg) => { if (!cond) erreurs.push(msg); };

let data;
try { data = JSON.parse(brut); } catch (e) { console.error("JSON invalide :", e.message); process.exit(1); }

const idsChap = data.chapitres.map((c) => c.id);
ok(idsChap.length === 5, `5 chapitres attendus, ${idsChap.length} trouvés`);
for (const c of data.chapitres) {
  ok(/^#[0-9A-Fa-f]{6}$/.test(c.couleur), `couleur invalide pour le chapitre ${c.id}`);
  ok(Array.isArray(data.essentiel[c.id]), `chapitre ${c.id} absent de "essentiel"`);
  ok(data.essentiel[c.id]?.length === 8, `chapitre ${c.id} : 8 points essentiels attendus`);
}
for (const id of Object.keys(data.essentiel)) ok(idsChap.includes(id), `"essentiel" cite un chapitre inconnu : ${id}`);

const q = data.questions;
ok(q.length >= 100, `au moins 100 questions attendues, ${q.length} trouvées`);
const sw = readFileSync(join(racine, "sw.js"), "utf8");
const vus = new Set();
const parChap = {};
const types = new Set(["connaissance", "compréhension", "raisonnement"]);
for (const x of q) {
  ok(!vus.has(x.id), `id en double : ${x.id}`);
  vus.add(x.id);
  ok(idsChap.includes(x.chapitre), `${x.id} : chapitre inconnu ${x.chapitre}`);
  ok(x.id.startsWith(x.chapitre + "-"), `${x.id} : l'id ne correspond pas au chapitre ${x.chapitre}`);
  parChap[x.chapitre] = (parChap[x.chapitre] || 0) + 1;
  ok(types.has(x.type), `${x.id} : type inconnu "${x.type}"`);
  ok(typeof x.question === "string" && x.question.trim().length > 0, `${x.id} : question vide`);
  ok(Array.isArray(x.choix) && x.choix.length === 4, `${x.id} : 4 choix attendus`);
  const normalises = x.choix.map((c) => String(c).trim().toLowerCase());
  ok(new Set(normalises).size === 4, `${x.id} : choix non distincts`);
  ok(normalises.every((c) => c.length > 0), `${x.id} : choix vide`);
  ok(Number.isInteger(x.bonne) && x.bonne >= 0 && x.bonne <= 3, `${x.id} : "bonne" hors de 0..3`);
  ok(typeof x.explication === "string" && x.explication.length > 0, `${x.id} : explication vide`);
  ok(typeof x.cours === "string" && x.cours.startsWith("Cours "), `${x.id} : référence de cours absente`);
  ok(/^(I|II|III|IV|V)-\d{2}$/.test(x.id), `${x.id} : id mal formé`);
  if (x.figure) {
    ok(typeof x.figure.src === "string" && existsSync(join(racine, x.figure.src)), `${x.id} : figure introuvable ${x.figure?.src}`);
    ok(typeof x.figure.alt === "string" && x.figure.alt.length > 10, `${x.id} : texte alternatif de la figure manquant`);
    ok(sw.includes(`"./${x.figure.src}"`), `${x.id} : ${x.figure.src} absente du cache hors ligne (sw.js)`);
  }
}
for (const id of idsChap) ok(parChap[id] >= 20, `chapitre ${id} : au moins 20 questions attendues, ${parChap[id] || 0} trouvées`);
const figures = q.filter((x) => x.figure).length;
ok(Array.isArray(data.formulaire) && data.formulaire.length > 0, "formulaire vide");
for (const f of data.formulaire) ok(f.theme && f.formule && typeof f.remarque === "string", `formule incomplète : ${f.theme}`);

// La bonne réponse ne doit pas se repérer à sa longueur (le hasard donne environ 25 % par rang).
let plusLongue = 0;
let visible = 0;
let rapport = 0;
for (const x of q) {
  const lb = x.choix[x.bonne].length;
  const autres = x.choix.filter((_, i) => i !== x.bonne).map((c) => c.length);
  if (autres.every((l) => lb > l)) plusLongue++;
  // « visiblement » plus longue : au moins 15 % et 5 caractères de plus que le plus long des leurres
  const max = Math.max(...autres);
  if (lb >= 1.15 * max && lb - max >= 5) visible++;
  rapport += lb / (autres.reduce((a, b) => a + b, 0) / 3);
}
rapport /= q.length;
ok(plusLongue <= 0.3 * q.length, `bonne réponse strictement la plus longue dans ${plusLongue} questions (maximum ${0.3 * q.length})`);
ok(visible <= 0.05 * q.length, `bonne réponse visiblement plus longue que les autres dans ${visible} questions (maximum ${0.05 * q.length})`);
ok(rapport >= 0.9 && rapport <= 1.1, `longueur moyenne bonne réponse / leurres = ${rapport.toFixed(2)} (attendu entre 0,90 et 1,10)`);

// Répartition des bonnes réponses (simple information)
const repart = [0, 0, 0, 0];
q.forEach((x) => repart[x.bonne]++);
const typesCompte = {};
q.forEach((x) => (typesCompte[x.type] = (typesCompte[x.type] || 0) + 1));

if (erreurs.length) {
  console.error(`ÉCHEC : ${erreurs.length} problème(s)`);
  erreurs.forEach((e) => console.error(" - " + e));
  process.exit(1);
}
console.log(`OK : ${q.length} questions, ${idsChap.length} chapitres (${idsChap.map((i) => `${i}=${parChap[i]}`).join(", ")})`);
console.log(`ids uniques, 4 choix distincts partout, "bonne" dans 0..3, essentiel 8 x ${idsChap.length}, ${data.formulaire.length} formules`);
console.log(`Bonnes réponses en A/B/C/D : ${repart.join(" / ")} ; types : ${JSON.stringify(typesCompte)}`);
console.log(`Longueur des choix : bonne réponse la plus longue dans ${plusLongue} questions (visiblement : ${visible}), rapport moyen ${rapport.toFixed(2)}`);
console.log(`${figures} questions avec un schéma, toutes présentes dans le cache hors ligne`);
