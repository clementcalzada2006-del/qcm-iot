// Mesure les indices involontaires dans les choix du QCM : node outils/biais-longueur.mjs [--detail]
// 1. la bonne réponse est-elle la plus longue ? 2. les leurres contiennent-ils des mots absolus ?
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(racine, "data.json"), "utf8"));
const detail = process.argv.includes("--detail");
const ABSOLUS = /\b(uniquement|seulement|toujours|jamais|forcément|aucun|aucune|tous|toutes|rien|personne|n'importe|exclusivement|obligatoirement)\b/i;

let plusLongue = 0;
let plusCourte = 0;
let rangs = [0, 0, 0, 0];
let rapports = [];
let absolusBonne = 0;
let absolusLeurres = 0;
const lignes = [];
for (const q of data.questions) {
  const L = q.choix.map((c) => c.length);
  const lb = L[q.bonne];
  const autres = L.filter((_, i) => i !== q.bonne);
  const rang = L.filter((x) => x > lb).length; // 0 = la plus longue
  rangs[rang]++;
  if (autres.every((x) => lb > x)) plusLongue++;
  if (autres.every((x) => lb < x)) plusCourte++;
  const moy = autres.reduce((a, b) => a + b, 0) / 3;
  rapports.push(lb / moy);
  if (ABSOLUS.test(q.choix[q.bonne])) absolusBonne++;
  absolusLeurres += q.choix.filter((c, i) => i !== q.bonne && ABSOLUS.test(c)).length;
  lignes.push({ id: q.id, rang: rang + 1, rapport: lb / moy, L, bonne: q.bonne });
}
const n = data.questions.length;
const moyRapport = rapports.reduce((a, b) => a + b, 0) / n;
console.log(`Bonne réponse strictement la plus longue : ${plusLongue}/${n} (${Math.round((100 * plusLongue) / n)} %, le hasard donnerait environ 25 %)`);
console.log(`Bonne réponse strictement la plus courte : ${plusCourte}/${n}`);
console.log(`Rang de la bonne réponse par longueur (1 = plus longue) : ${rangs.map((r, i) => `${i + 1}e: ${r}`).join(", ")}`);
console.log(`Longueur de la bonne réponse / moyenne des leurres : ${moyRapport.toFixed(2)} en moyenne`);
console.log(`Mots absolus (uniquement, toujours, jamais…) : ${absolusBonne} bonnes réponses, ${absolusLeurres} leurres`);
if (detail) {
  lignes
    .sort((a, b) => b.rapport - a.rapport)
    .forEach((l) => console.log(`${l.id.padEnd(7)} rang ${l.rang}  rapport ${l.rapport.toFixed(2)}  longueurs ${l.L.map((x, i) => (i === l.bonne ? `[${x}]` : x)).join(" ")}`));
}
