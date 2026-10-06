// Tests dans un vrai navigateur (Edge ou Chrome headless, via playwright-core) :
//   1. rattrapage persistant, 2. affichage à 375 px, 3. hors ligne, 4. clavier, export/import, examen.
// Lancer : node outils/test-navigateur.mjs   (captures d'écran dans outils/captures/)
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { demarrerServeur } from "./serveur.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const captures = join(racine, "outils", "captures");
mkdirSync(captures, { recursive: true });
const DATA = JSON.parse(readFileSync(join(racine, "data.json"), "utf8"));
const BONNE = Object.fromEntries(DATA.questions.map((q) => [q.id, q.bonne]));

let echecs = 0;
let total = 0;
function verif(cond, msg, detail = "") {
  total++;
  if (cond) console.log("  ok   " + msg);
  else {
    echecs++;
    console.error("  ÉCHEC " + msg + (detail ? ` → ${detail}` : ""));
  }
}

const serveur = await demarrerServeur(0);
const BASE = `http://127.0.0.1:${serveur.address().port}/`;
const nav = await chromium.launch({ channel: "msedge" }).catch(() => chromium.launch({ channel: "chrome" }));
const erreursJs = [];
let dialogues = 0;

async function nouveauContexte(opts = {}) {
  const ctx = await nav.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreursJs.push(e.message));
  page.on("console", (m) => m.type() === "error" && erreursJs.push(m.text()));
  page.on("dialog", (d) => {
    dialogues++;
    d.dismiss();
  });
  return { ctx, page };
}

const etatQuestion = (page, id) =>
  page.evaluate((id) => {
    const e = JSON.parse(localStorage.getItem("qcm-iot-v1"));
    const f = e.questions[id];
    if (!f || !f.vu) return "nouvelle";
    return f.succes >= e.reglages.maitrise ? "maitrisee" : "revoir";
  }, id);
const qid = (page) => page.locator("section[data-qid]").getAttribute("data-qid");

async function repondre(page, juste, sur = true) {
  const id = await qid(page);
  const b = BONNE[id];
  const choix = page.locator(".choix-btn");
  const n = await choix.count();
  for (let i = 0; i < n; i++) {
    const orig = Number(await choix.nth(i).getAttribute("data-orig"));
    if ((orig === b) === juste) {
      await choix.nth(i).click();
      break;
    }
  }
  await page.locator(`[data-act="valider"][data-sur="${sur ? 1 : 0}"]`).click();
  await page.locator("#verdict").waitFor();
  return id;
}
async function suivante(page) {
  await page.locator('[data-act="suivante"]').click();
}

// Contrôle d'affichage : pas de débordement horizontal, cibles tactiles de 48 px, textes de 16 px.
async function controleAffichage(page, nom) {
  const r = await page.evaluate(() => {
    const larg = document.documentElement.clientWidth;
    const pb = [];
    if (document.documentElement.scrollWidth > larg) pb.push(`défilement horizontal (${document.documentElement.scrollWidth} > ${larg})`);
    const visible = (el) => {
      const s = getComputedStyle(el);
      const rc = el.getBoundingClientRect();
      return s.visibility !== "hidden" && s.display !== "none" && rc.width > 0 && rc.height > 0 && !el.closest(".visuellement-cache, [hidden]");
    };
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el) || el.closest(".onglets")) continue;
      const rc = el.getBoundingClientRect();
      if (rc.right > larg + 0.5 || rc.left < -0.5) pb.push(`dépasse : <${el.tagName.toLowerCase()} class="${el.className.baseVal ?? el.className}"> (${Math.round(rc.left)}→${Math.round(rc.right)})`);
    }
    for (const el of document.querySelectorAll("button, a[href], summary, label[role=button], input:not(.visuellement-cache)")) {
      if (!visible(el)) continue;
      const rc = el.getBoundingClientRect();
      if (rc.height < 47.5 || rc.width < 47.5) pb.push(`cible trop petite : "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(rc.width)}×${Math.round(rc.height)}`);
    }
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const petits = new Set();
    while (marcheur.nextNode()) {
      const t = marcheur.currentNode;
      const el = t.parentElement;
      if (!t.textContent.trim() || !el || !visible(el) || el.closest("sub, sup, script, style")) continue;
      let taille = parseFloat(getComputedStyle(el).fontSize);
      const svg = el.closest("svg");
      if (svg) {
        const vb = svg.viewBox.baseVal;
        if (vb && vb.width) taille *= svg.getBoundingClientRect().width / vb.width;
      }
      if (taille < 15.9) petits.add(`"${t.textContent.trim().slice(0, 25)}" ${taille.toFixed(1)} px`);
    }
    pb.push(...[...petits].map((p) => "texte trop petit : " + p));
    return pb;
  });
  verif(r.length === 0, `375 px : ${nom}`, r.slice(0, 6).join(" ; "));
  await page.screenshot({ path: join(captures, `${nom.replace(/[^a-z0-9]+/gi, "-")}.png`), fullPage: false });
}

// =================== 1. RATTRAPAGE ===================
console.log("\n1. Rattrapage persistant");
{
  const { ctx, page } = await nouveauContexte();
  await page.goto(BASE);
  await page.locator(".chapitre").first().waitFor();
  verif((await page.locator(".chapitre").count()) === 5, "accueil : 5 chapitres");
  await controleAffichage(page, "accueil");

  await page.locator('[data-act="lancer"][data-chap="I"]').click();
  await page.locator("section[data-qid]").waitFor();
  verif((await page.locator(".bandeau .titre-chap").textContent()).includes("Chapitre I · Introduction à l'IoT"), "bandeau du chapitre");
  verif((await page.locator(".bandeau .compteur").textContent()).trim() === "1 / 20", "progression « 1 / 20 »");
  await controleAffichage(page, "question");

  const ordres = [];
  ordres.push(await page.locator(".choix-btn").evaluateAll((bs) => bs.map((b) => b.dataset.orig).join("")));
  const ratee = await repondre(page, false, true);
  verif((await etatQuestion(page, ratee)) === "revoir", `question ratée (${ratee}) → « à revoir »`);
  verif((await page.locator(".choix-btn.juste").count()) === 1 && (await page.locator(".choix-btn.faux").count()) === 1, "correction : bonne réponse en vert, mon choix en rouge");
  verif((await page.locator(".ref-cours").textContent()).startsWith("À revoir : Cours I"), "référence « À revoir : Cours I … »");
  verif((await page.locator(".encore").textContent()).includes("Encore 20 questions à réussir"), "« Encore 20 questions à réussir »");
  await controleAffichage(page, "correction");
  await page.locator('[data-act="essentiel-feuille"]').click();
  verif((await page.locator(".feuille .points li").count()) === 8, "« Voir l'essentiel du chapitre » : 8 points");
  await controleAffichage(page, "essentiel-feuille");
  await page.locator('[data-act="feuille-action"]').click();
  await suivante(page);

  let vus = [ratee];
  for (let i = 0; i < 40; i++) {
    if (await page.locator(".bilan-tete").count()) break;
    ordres.push(await page.locator(".choix-btn").evaluateAll((bs) => bs.map((b) => b.dataset.orig).join("")));
    vus.push(await repondre(page, true, true));
    await suivante(page);
  }
  verif(vus.length === 21 && vus[20] === ratee, "la question ratée revient à la fin de la série", vus.join(","));
  verif(new Set(ordres).size > 1, "ordre des choix mélangé à chaque affichage");
  verif((await page.locator(".gros-score").textContent()).trim() === "19 / 20", "bilan : 19 / 20 du premier coup");
  verif((await etatQuestion(page, ratee)) === "revoir", "réussie dans la boucle : reste « à revoir »");
  await controleAffichage(page, "bilan");

  await page.reload();
  await page.locator(".chapitre").first().waitFor();
  const compteur = (await page.locator('.chapitre[data-chap="I"] .compteurs').textContent()).trim();
  verif(compteur === "19 maîtrisées · 1 à revoir · 0 nouvelle", "après rechargement : compteur du chapitre", compteur);
  verif((await page.locator('[data-act="erreurs"] .nombre').textContent()).trim() === "1", "accueil : 1 question à revoir");

  await page.locator('[data-act="lancer"][data-chap="I"]').click();
  await page.locator("section[data-qid]").waitFor();
  const msg = (await page.locator(".message-serie").textContent()).trim();
  verif(msg === "Rattrapage : 1 question ratée la dernière fois", "message de rattrapage", msg);
  verif((await qid(page)) === ratee, "« Lancer le QCM » ne propose que la question ratée");
  verif((await page.locator(".bandeau .compteur").textContent()).trim() === "1 / 1", "série de 1 question");
  await repondre(page, true, true);
  verif((await etatQuestion(page, ratee)) === "maitrisee", "bonne réponse « Sûr » du premier coup → « maîtrisée »");
  await suivante(page);
  await page.locator(".bilan-tete").waitFor();
  await page.goto(BASE + "#/");
  await page.locator(".chapitre").first().waitFor();
  verif((await page.locator('.chapitre[data-chap="I"] .compteurs').textContent()).trim() === "20 maîtrisées · 0 à revoir · 0 nouvelle", "chapitre I : 20 maîtrisées");
  await page.locator('[data-act="lancer"][data-chap="I"]').click();
  await page.locator(".bilan-tete h1").waitFor();
  verif((await page.locator(".bilan-tete h1").textContent()) === "Chapitre maîtrisé", "« Chapitre maîtrisé » quand les 20 sont maîtrisées");
  verif((await page.locator('[data-act="refaire"]').count()) === 1, "bouton « Refaire les 20 questions »");
  await controleAffichage(page, "chapitre-maitrise");

  // « Pas sûr » et « Je ne sais pas » sur le chapitre II
  await page.goto(BASE + "#/");
  await page.locator('[data-act="lancer"][data-chap="II"]').click();
  await page.locator("section[data-qid]").waitFor();
  const douteuse = await repondre(page, true, false);
  verif((await etatQuestion(page, douteuse)) === "revoir", "bonne réponse « Pas sûr » → « à revoir »");
  await suivante(page);
  const nspId = await qid(page);
  await page.locator('[data-act="nsp"]').click();
  await page.locator("#verdict").waitFor();
  verif((await etatQuestion(page, nspId)) === "revoir", "« Je ne sais pas » → « à revoir »");
  await ctx.close();
}

// =================== 2. AUTRES ÉCRANS À 375 PX ===================
console.log("\n2. Affichage des autres écrans à 375 px");
{
  const { ctx, page } = await nouveauContexte();
  // progression de démonstration pour remplir les statistiques
  await page.goto(BASE);
  await page.evaluate(() => {
    const ids = ["I", "II", "III", "IV", "V"];
    const e = { version: 1, questions: {}, historique: [], jours: {}, reglages: { theme: "auto", taille: "normale", melange: true, confiance: true, maitrise: 1, objectif: 20 }, compteurSeries: 12 };
    ids.forEach((c, ci) => {
      for (let i = 1; i <= 20; i++) {
        const id = `${c}-${String(i).padStart(2, "0")}`;
        if (i <= 14 - ci * 2) e.questions[id] = { vu: true, succes: 1, sess: 1, echec: false, boite: 3, due: "2026-10-05", essais: 2, reussis: 2, erreurs: 0, der: 1 };
        else if (i <= 17) e.questions[id] = { vu: true, succes: 0, sess: null, echec: true, boite: 1, due: "2026-10-06", essais: 2, reussis: 1, erreurs: i % 5, der: 2 };
      }
    });
    for (let k = 0; k < 10; k++) e.historique.push({ t: Date.now() - (10 - k) * 3600e3, mode: k % 2 ? "QCM" : "Rattrapage", titre: `Chapitre ${ids[k % 5]}`, chap: ids[k % 5], justes: 8 + k, total: 20 });
    const d = new Date();
    for (let k = 0; k < 4; k++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - k);
      e.jours[`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`] = 7 + k;
    }
    localStorage.setItem("qcm-iot-v1", JSON.stringify(e));
  });
  await page.reload();
  await page.locator(".chapitre").first().waitFor();
  await controleAffichage(page, "accueil-avec-progression");
  for (const [h, nom, attente] of [
    ["#/essentiel/III", "essentiel-III", ".points"],
    ["#/formulaire", "formulaire", ".formule"],
    ["#/stats", "statistiques", ".graphique"],
    ["#/reglages", "reglages", ".segmente"],
    ["#/cible", "entrainement-cible", ".puces"],
    ["#/flash", "flashcards-reglages", ".puces"],
    ["#/examen", "examen-intro", '[data-act="examen-commencer"]'],
  ]) {
    await page.goto(BASE + h);
    await page.locator(attente).first().waitFor();
    await controleAffichage(page, nom);
  }
  verif((await page.evaluate(() => document.title)) === "QCM IoT", "titre de la page");

  // statistiques : top 10 et graphique
  await page.goto(BASE + "#/stats");
  verif((await page.locator(".graphique rect").count()) === 10, "historique : 10 barres en SVG");
  verif((await page.locator(".liste-questions li").count()) === 10, "top 10 des questions les plus ratées");

  // réinitialisation avec confirmation dans l'interface
  await page.goto(BASE + "#/reglages");
  await page.locator('[data-act="reset-tout"]').click();
  await page.locator(".feuille").waitFor();
  await controleAffichage(page, "confirmation-reinitialiser");
  await page.locator('.feuille [data-act="feuille-action"]', { hasText: "Annuler" }).click();
  verif(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("qcm-iot-v1")).questions).length > 0), "« Annuler » ne réinitialise rien");

  // export puis import
  const [telechargement] = await Promise.all([page.waitForEvent("download"), page.locator('[data-act="exporter"]').click()]);
  verif(/^qcm-iot-progression-\d{4}-\d{2}-\d{2}\.json$/.test(telechargement.suggestedFilename()), "export : fichier .json téléchargé", telechargement.suggestedFilename());
  const chemin = join(captures, "export-test.json");
  await telechargement.saveAs(chemin);
  await page.locator('[data-act="reset-tout"]').click();
  await page.locator('.feuille [data-act="feuille-action"]', { hasText: "Tout effacer" }).click();
  verif(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("qcm-iot-v1")).questions).length === 0), "« Tout réinitialiser » confirmé : progression vide");
  await page.locator("#fichier-import").setInputFiles(chemin);
  await page.locator('.feuille [data-act="feuille-action"]', { hasText: "Remplacer" }).click();
  verif(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("qcm-iot-v1")).questions).length === 85), "import : progression restaurée (85 questions suivies)");

  // révision espacée et erreurs depuis l'accueil
  await page.goto(BASE + "#/");
  const duJour = (await page.locator('[data-act="du-jour"] .gb-sous').textContent()).trim();
  verif(/^\d+ questions à réviser aujourd'hui$/.test(duJour), "accueil : « N questions à réviser aujourd'hui »", duJour);

  // examen : une question, contrôle d'affichage, puis terminer
  await page.goto(BASE + "#/examen");
  await page.locator('[data-act="examen-commencer"]').click();
  await page.locator("#chrono").waitFor();
  verif(/^2[45]:\d\d$/.test((await page.locator("#chrono").textContent()).trim()), "examen : chronomètre de 25 minutes");
  await controleAffichage(page, "examen-question");
  const exId = await qid(page);
  await page.locator(".choix-btn").first().click();
  await page.locator('[data-act="valider"][data-sur="1"]').click();
  verif((await page.locator("#verdict").count()) === 0 && (await qid(page)) !== exId, "examen : aucune correction, question suivante directement");
  await page.locator('[data-act="quitter-examen"]').click();
  await page.locator('.feuille [data-act="feuille-action"]', { hasText: "Terminer maintenant" }).click();
  await page.locator(".gros-score").waitFor();
  verif(/^\d+ \/ 20$/.test((await page.locator(".gros-score").textContent()).trim()), "examen : note sur 20");
  verif((await page.locator("details.corr").count()) === 20, "examen : correction question par question");
  await page.locator("details.corr summary").first().click();
  await controleAffichage(page, "examen-resultat");

  // flashcards
  await page.goto(BASE + "#/flash");
  await page.locator('[data-act="flash-commencer"]').click();
  await page.locator('[data-act="flash-reveler"]').click();
  await controleAffichage(page, "flashcard-reponse");
  const fid = await qid(page);
  await page.locator('[data-act="flash-eval"][data-v="0"]').click();
  verif((await etatQuestion(page, fid)) === "revoir", "flashcard « Je ne savais pas » → « à revoir »");

  // grand texte et thème sombre
  await page.goto(BASE + "#/reglages");
  await page.locator('[data-k="taille"][data-v="grande"]').click();
  await page.locator('[data-k="theme"][data-v="sombre"]').click();
  await page.goto(BASE + "#/");
  await page.locator(".chapitre").first().waitFor();
  verif((await page.evaluate(() => document.documentElement.dataset.theme)) === "dark", "thème sombre manuel");
  await controleAffichage(page, "accueil-sombre-grand-texte");
  await page.locator('[data-act="lancer"][data-chap="IV"]').click();
  await page.locator("section[data-qid]").waitFor();
  await repondre(page, false, true);
  await controleAffichage(page, "correction-sombre-grand-texte");
  await ctx.close();
}

// =================== 3. HORS LIGNE ===================
console.log("\n3. Hors ligne");
{
  const { ctx, page } = await nouveauContexte();
  await page.goto(BASE);
  await page.locator(".chapitre").first().waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((ok) => navigator.serviceWorker.addEventListener("controllerchange", ok, { once: true }));
  });
  const enCache = await page.evaluate(async () => {
    const cles = await caches.keys();
    const c = await caches.open(cles.find((k) => k.startsWith("qcm-iot-")));
    return (await c.keys()).length;
  });
  verif(enCache >= 12, `service worker actif, ${enCache} fichiers en cache`);
  await ctx.setOffline(true);
  await page.reload();
  await page.locator(".chapitre").first().waitFor({ timeout: 10000 });
  verif((await page.locator(".chapitre").count()) === 5, "sans réseau : l'application s'ouvre (rechargement)");
  const page2 = await ctx.newPage();
  await page2.goto(BASE + "#/formulaire");
  await page2.locator(".formule").first().waitFor({ timeout: 10000 });
  verif((await page2.locator(".formule").count()) === DATA.formulaire.length, "sans réseau : nouvel onglet, formulaire complet");
  await page2.goto(BASE + "#/");
  await page2.locator('[data-act="lancer"][data-chap="V"]').click();
  await page2.locator("section[data-qid]").waitFor();
  verif(true, "sans réseau : un QCM se lance");
  await ctx.close();
}

// =================== 4. CLAVIER (ordinateur) ===================
console.log("\n4. Raccourcis clavier");
{
  const { ctx, page } = await nouveauContexte({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await page.locator('[data-act="lancer"][data-chap="III"]').click();
  await page.locator("section[data-qid]").waitFor();
  const id = await qid(page);
  const pos = await page.locator(".choix-btn").evaluateAll((bs, b) => bs.findIndex((x) => Number(x.dataset.orig) === b), BONNE[id]);
  await page.keyboard.press("ABCD"[pos]);
  verif((await page.locator(".choix-btn.choisi").count()) === 1, `touche ${"ABCD"[pos]} : choix sélectionné`);
  await page.keyboard.press("Enter");
  await page.locator("#verdict").waitFor();
  verif((await etatQuestion(page, id)) === "maitrisee", "Entrée = « Sûr » : bonne réponse validée");
  await page.keyboard.press("Enter");
  await page.waitForFunction((ancien) => document.querySelector("section[data-qid]")?.dataset.qid !== ancien, id);
  verif(true, "Entrée : question suivante");
  await page.keyboard.press("2");
  await page.keyboard.press("p");
  await page.locator("#verdict").waitFor();
  verif(true, "touches 2 puis P : réponse validée avec « Pas sûr »");
  await page.screenshot({ path: join(captures, "ordinateur-question.png") });
  await ctx.close();
}

verif(erreursJs.length === 0, "aucune erreur JavaScript", erreursJs.slice(0, 5).join(" | "));
verif(dialogues === 0, "aucune boîte de dialogue du navigateur (confirm/alert)");

await nav.close();
serveur.close();
console.log(echecs ? `\nÉCHEC : ${echecs} sur ${total} vérifications` : `\nOK : ${total} vérifications dans le navigateur`);
process.exit(echecs ? 1 : 0);
