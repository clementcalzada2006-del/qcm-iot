// Contrôle des données du QCM : node outils/verifier-donnees.mjs [chemin du prompt .md]
// Vérifie la structure de data.json et, si le prompt d'origine est fourni,
// que data.json est une copie à l'identique de son bloc JSON.
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
ok(q.length === 100, `100 questions attendues, ${q.length} trouvées`);
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
}
for (const id of idsChap) ok(parChap[id] === 20, `chapitre ${id} : 20 questions attendues, ${parChap[id] || 0} trouvées`);
ok(Array.isArray(data.formulaire) && data.formulaire.length > 0, "formulaire vide");
for (const f of data.formulaire) ok(f.theme && f.formule && typeof f.remarque === "string", `formule incomplète : ${f.theme}`);

// Copie à l'identique du bloc JSON du prompt
const prompt = process.argv[2];
if (prompt && existsSync(prompt)) {
  const md = readFileSync(prompt, "utf8");
  const debut = md.indexOf("```json\n", md.indexOf("## Données")) + 8;
  const fin = md.indexOf("\n```", debut);
  ok(md.slice(debut, fin + 1) === brut, "data.json diffère du bloc JSON du prompt");
  console.log("Comparaison avec le prompt : faite");
}

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
