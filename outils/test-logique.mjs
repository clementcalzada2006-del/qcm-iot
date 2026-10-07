// Tests des règles (sans navigateur) : node outils/test-logique.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "../logique.js";

const data = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "data.json"), "utf8"));
let echecs = 0;
let total = 0;
function verif(cond, msg) {
  total++;
  if (!cond) {
    echecs++;
    console.error("  ÉCHEC :", msg);
  }
}
const J = "2026-10-06";
const N3 = data.questions.filter((q) => q.chapitre === "III").length;
const bon = (id) => ({ juste: true, sur: true });

// 1. Série complète d'un chapitre neuf, une erreur sur la première question
{
  const etat = L.etatVide();
  const s0 = L.serieChapitre(data, etat, "III");
  verif(s0.genre === "complet" && s0.ids.length === N3, "chapitre neuf : toutes ses questions");
  const serie = L.nouvelleSerie({ mode: "QCM", titre: "III", chap: "III", ids: s0.ids }, etat);
  const ratee = serie.file[0];
  L.repondre(serie, etat, ratee, { juste: false, sur: true }, J);
  verif(L.etatDe(etat, ratee) === "revoir", "une question ratée devient à revoir");
  verif(serie.file[serie.file.length - 1] === ratee, "la question ratée est remise à la fin de la série");
  L.avancer(serie);
  let tours = 0;
  while (!serie.finie && tours++ < 100) {
    L.repondre(serie, etat, L.questionCourante(serie), bon(), J);
    L.avancer(serie);
  }
  verif(serie.finie && serie.reussies.length === N3, "la série se termine quand toutes sont réussies");
  verif(serie.file.length === N3 + 1, "la question ratée est revenue une fois");
  verif(L.etatDe(etat, ratee) === "revoir", "réussie plus tard dans la boucle : reste à revoir");
  verif(L.compter(etat, s0.ids).maitrisee === N3 - 1, "toutes les autres sont maîtrisées");
  verif(L.scoreSerie(serie).justes === N3 - 1, "score du premier coup = N-1 / N");

  // 2. Lancement suivant : uniquement la question ratée
  const s1 = L.serieChapitre(data, etat, "III");
  verif(s1.genre === "rattrapage" && s1.ids.length === 1 && s1.ids[0] === ratee && s1.ratees === 1, "rattrapage : seulement la question ratée");
  const serie2 = L.nouvelleSerie({ mode: "Rattrapage", titre: "III", chap: "III", ids: s1.ids }, etat);
  L.repondre(serie2, etat, ratee, { juste: true, sur: false }, J);
  verif(L.etatDe(etat, ratee) === "revoir", "bonne réponse « Pas sûr » : reste à revoir");
  L.avancer(serie2);
  verif(serie2.finie, "une bonne réponse « Pas sûr » n'est pas remise dans la boucle");

  const serie3 = L.nouvelleSerie({ mode: "Rattrapage", titre: "III", chap: "III", ids: [ratee] }, etat);
  L.repondre(serie3, etat, ratee, bon(), J);
  verif(L.etatDe(etat, ratee) === "maitrisee", "réussie du premier coup avec « Sûr » : maîtrisée");
  const s4 = L.serieChapitre(data, etat, "III");
  verif(s4.genre === "maitrise", "toutes maîtrisées : chapitre maîtrisé");

  // 3. Refaire les 20 : rien ne change sans erreur, une erreur remet à revoir
  const serie5 = L.nouvelleSerie({ mode: "Refaire", titre: "III", chap: "III", ids: s4.ids }, etat);
  for (const id of s4.ids.slice(0, N3 - 1)) L.repondre(serie5, etat, id, bon(), J);
  verif(L.compter(etat, s4.ids).maitrisee === N3, "refaire sans erreur : toujours toutes maîtrisées");
  L.repondre(serie5, etat, s4.ids[N3 - 1], { juste: false, sur: true }, J);
  verif(L.etatDe(etat, s4.ids[N3 - 1]) === "revoir", "refaire avec une erreur : la question repasse à revoir");
}

// 4. Exigence de maîtrise = 2 séries différentes
{
  const etat = L.etatVide();
  etat.reglages.maitrise = 2;
  const id = "I-01";
  const a = L.nouvelleSerie({ mode: "QCM", titre: "I", ids: [id] }, etat);
  L.repondre(a, etat, id, bon(), J);
  verif(L.etatDe(etat, id) === "revoir", "exigence 2 : une seule réussite ne suffit pas");
  const b = L.nouvelleSerie({ mode: "QCM", titre: "I", ids: [id] }, etat);
  L.repondre(b, etat, id, bon(), J);
  verif(L.etatDe(etat, id) === "maitrisee", "exigence 2 : deux séries réussies = maîtrisée");
  etat.reglages.maitrise = 1;
  verif(L.etatDe(etat, id) === "maitrisee", "repasser à l'exigence 1 garde la maîtrise");
}

// 5. Boîtes de Leitner
{
  const etat = L.etatVide();
  const id = "V-16";
  const s = () => L.nouvelleSerie({ mode: "x", titre: "x", ids: [id] }, etat);
  L.repondre(s(), etat, id, bon(), J);
  verif(etat.questions[id].boite === 2 && etat.questions[id].due === "2026-10-07", "réussie : boîte 2, revue dans 1 jour");
  L.repondre(s(), etat, id, bon(), "2026-10-07");
  verif(etat.questions[id].boite === 3 && etat.questions[id].due === "2026-10-10", "boîte 3 : 3 jours");
  L.repondre(s(), etat, id, bon(), "2026-10-10");
  verif(etat.questions[id].boite === 4 && etat.questions[id].due === "2026-10-17", "boîte 4 : 7 jours");
  L.repondre(s(), etat, id, bon(), "2026-10-17");
  verif(etat.questions[id].boite === 5 && etat.questions[id].due === "2026-10-31", "boîte 5 : 14 jours");
  L.repondre(s(), etat, id, bon(), "2026-10-31");
  verif(etat.questions[id].boite === 5, "la boîte ne dépasse pas 5");
  verif(L.idsDuJour(data, etat, "2026-11-01").length === 0, "rien à réviser avant l'échéance");
  verif(L.idsDuJour(data, etat, "2026-11-14").includes(id), "à réviser le jour de l'échéance");
  L.repondre(s(), etat, id, { juste: false, sur: true }, "2026-11-14");
  verif(etat.questions[id].boite === 1 && etat.questions[id].due === "2026-11-14", "erreur : retour en boîte 1, le jour même");
  verif(L.idsDuJour(data, etat, "2026-11-14").includes(id), "boîte 1 : à revoir le jour même");
}

// 6. Flashcards et examen
{
  const etat = L.etatVide();
  L.evaluationFlash(etat, "II-03", false, J, true);
  verif(L.etatDe(etat, "II-03") === "revoir", "flashcard « Je ne savais pas » : à revoir");
  L.evaluationFlash(etat, "II-04", true, J, true);
  verif(L.etatDe(etat, "II-04") === "nouvelle", "flashcard « Je savais » ne prouve pas la maîtrise");
  const ex = L.serieExamen(data);
  const parChap = {};
  ex.forEach((id) => (parChap[id.split("-")[0]] = (parChap[id.split("-")[0]] || 0) + 1));
  verif(ex.length === 20 && Object.values(parChap).every((n) => n === 4), "examen : 20 questions, 4 par chapitre");
  verif(ex.every((id, i) => i === 0 || id.split("-")[0] !== ex[i - 1].split("-")[0]), "examen : jamais deux questions du même chapitre à la suite");
}

// 7. Divers
{
  const etat = L.etatVide();
  etat.jours = { "2026-10-04": 3, "2026-10-05": 12 };
  verif(L.joursDAffilee(etat, J) === 2, "série de jours : aujourd'hui pas encore commencé, la série continue");
  etat.jours[J] = 1;
  verif(L.joursDAffilee(etat, J) === 3, "série de jours avec aujourd'hui");
  verif(L.ajouterJours("2026-12-31", 1) === "2027-01-01", "passage d'année");
  const n = L.normaliser(JSON.parse(JSON.stringify({ questions: { "I-01": { vu: true, succes: 1 } } })));
  verif(L.etatDe(n, "I-01") === "maitrisee" && n.reglages.objectif === 20, "import : état complété avec les réglages par défaut");
  verif(!L.estUneSauvegarde({ foo: 1 }) && L.estUneSauvegarde({ questions: {} }), "reconnaissance d'un fichier de sauvegarde");
  const ids = L.idsCibles(data, ["III"], ["raisonnement"]);
  verif(ids.length > 0 && ids.every((id) => id.startsWith("III-")), "entraînement ciblé : raisonnement du chapitre III");
}

console.log(echecs ? `ÉCHEC : ${echecs} sur ${total} vérifications` : `OK : ${total} vérifications de logique`);
process.exit(echecs ? 1 : 0);
