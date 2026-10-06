// QCM IoT : interface. Les règles (états, rattrapage, Leitner) sont dans logique.js.
import * as L from "./logique.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const DUREE_EXAMEN = 25 * 60 * 1000;

// ---------- Icônes ----------
const ic = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const ICONES = {
  fermer: ic('<path d="M18 6 6 18M6 6l12 12"/>'),
  retour: ic('<path d="M15 18l-6-6 6-6"/>'),
  reglages: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  ok: ic('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
  ko: ic('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>'),
  doute: ic('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>'),
  flamme: ic('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.3 1.7 1.6 2.7 2.5 2.7z"/>'),
  calendrier: ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>'),
  erreurs: ic('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  cartes: ic('<rect x="2" y="7" width="15" height="14" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v12"/>'),
  chrono: ic('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
  cible: ic('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  livre: ic('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
  formule: ic('<path d="M18 4H6l6 8-6 8h12"/>'),
  stats: ic('<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>'),
  sauvegarde: ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  reprendre: ic('<path d="M8 5v14l11-7z"/>'),
};

const TYPES = {
  connaissance: { nom: "Connaissance", classe: "badge-connaissance", icone: ic('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>') },
  "compréhension": { nom: "Compréhension", classe: "badge-comprehension", icone: ic('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>') },
  raisonnement: { nom: "Raisonnement", classe: "badge-raisonnement", icone: ic('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h8"/>') },
};

// ---------- État global ----------
let DATA = null;
const Q = {};
const CHAP = {};
let etat = L.etatVide();
let stockageOk = true;
let serie = null; // série QCM en cours (boucle de rattrapage)
let examen = null; // examen blanc
let flash = null; // rappel actif
const vues = { serie: null, examen: null }; // affichage de la question courante
let routeActuelle = "";
let minuteur = null;
let reglFlash = { chap: "tous", revoir: false };
let cible = null;
let chapReset = "I";
let actionsFeuille = [];
let retourFocus = null;
let toastAction = null;
let toastMinuteur = null;

// ---------- Utilitaires ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Affichage typographique des exposants (2^SF) et indices (R_km) ; le texte lui-même n'est pas modifié.
function fmt(s) {
  return esc(s)
    .replace(/(\d|\))\^(\(([^()]*)\)|[A-Za-z0-9]+(?:,\d+)?)/g, (m, base, exp, dedans) => `${base}<sup>${dedans ?? exp}</sup>`)
    .replace(/(^|[^A-Za-z$&;])([A-Za-zλα])_([A-Za-z0-9éèêàùûôîç]+)/g, (m, avant, lettre, ind) => `${avant}${lettre}<sub>${ind}</sub>`);
}
const pl = (n, un, plusieurs) => (n > 1 ? plusieurs : un);
const nb = (n, un, plusieurs) => `${n} ${pl(n, un, plusieurs)}`;
const taux = (r, e) => (e ? `${Math.round((100 * r) / e)} %` : "pas encore de réponse");
const aujourdhui = () => L.jourISO();

function melangeCouleur(hex, autre, t) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(autre.slice(1), 16);
  const canal = (x, s) => (x >> s) & 255;
  return "#" + [16, 8, 0].map((s) => Math.round(canal(a, s) * (1 - t) + canal(b, s) * t).toString(16).padStart(2, "0")).join("");
}
function styleChap(id) {
  const c = CHAP[id]?.couleur || "#4a5160";
  return `--c:${c};--c2:${melangeCouleur(c, "#ffffff", 0.5)};--t1:${melangeCouleur(c, "#ffffff", 0.88)};--t2:${melangeCouleur(c, "#111317", 0.62)}`;
}
const badgeType = (t) => {
  const x = TYPES[t] || { nom: t, classe: "", icone: "" };
  return `<span class="badge ${x.classe}">${x.icone}${esc(x.nom)}</span>`;
};
const titreChap = (id) => `Chapitre ${id} · ${esc(CHAP[id].titre)}`;
const idsDuChapitre = (id) => DATA.questions.filter((q) => q.chapitre === id).map((q) => q.id);

function anneau(c, total, taille = 64) {
  const r = taille / 2 - 6;
  const C = 2 * Math.PI * r;
  const m = (C * c.maitrisee) / total;
  const rv = (C * c.revoir) / total;
  const centre = taille / 2;
  return `<svg class="anneau" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" role="img" aria-label="${c.maitrisee} sur ${total} maîtrisées">
    <g transform="rotate(-90 ${centre} ${centre})" fill="none" stroke-width="8">
      <circle class="fond-anneau" cx="${centre}" cy="${centre}" r="${r}"/>
      ${rv > 0 ? `<circle class="a-revoir" cx="${centre}" cy="${centre}" r="${r}" stroke-dasharray="${rv} ${C}" stroke-dashoffset="${-m}"/>` : ""}
      ${m > 0 ? `<circle class="maitrise" cx="${centre}" cy="${centre}" r="${r}" stroke-dasharray="${m} ${C}" stroke-linecap="${c.maitrisee === total ? "butt" : "round"}"/>` : ""}
    </g>
    <text x="${centre}" y="${centre + 5.5}" text-anchor="middle">${c.maitrisee}</text>
  </svg>`;
}

function vibrer() {
  try {
    if (navigator.vibrate) navigator.vibrate(120);
  } catch (e) {
    /* pas de vibreur */
  }
}

// ---------- Sauvegarde ----------
function charger() {
  try {
    const brut = localStorage.getItem(L.CLE);
    if (brut) etat = L.normaliser(JSON.parse(brut));
  } catch (e) {
    stockageOk = false;
  }
}
function sauver() {
  try {
    localStorage.setItem(L.CLE, JSON.stringify(etat));
    stockageOk = true;
  } catch (e) {
    if (stockageOk) toast("Sauvegarde impossible sur cet appareil : la progression sera perdue à la fermeture.");
    stockageOk = false;
  }
}

// ---------- Thème ----------
function themeSombre() {
  const t = etat.reglages.theme;
  if (t === "sombre") return true;
  if (t === "clair") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
function appliquerReglages() {
  const r = etat.reglages;
  const html = document.documentElement;
  if (r.theme === "clair") html.dataset.theme = "light";
  else if (r.theme === "sombre") html.dataset.theme = "dark";
  else delete html.dataset.theme;
  if (r.taille === "grande") html.dataset.taille = "grande";
  else delete html.dataset.taille;
  couleurBarre();
}
function couleurBarre(couleur) {
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = couleur || (themeSombre() ? "#111317" : "#f4f5f7");
}
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => couleurBarre());

// ---------- Navigation ----------
function aller(h) {
  if (location.hash === "#/" + h) route();
  else location.hash = "#/" + h;
}
function route() {
  if (!DATA) return;
  const [page = "", arg] = location.hash.replace(/^#\/?/, "").split("/");
  fermerFeuille(false);
  document.body.classList.remove("fond-chap");
  document.body.style.removeProperty("--fond-chap");
  couleurBarre();
  routeActuelle = page;
  switch (page) {
    case "serie":
      return serie ? pageSerie(true) : aller("");
    case "examen":
      return pageExamen(true);
    case "flash":
      return pageFlash(true);
    case "cible":
      return pageCible();
    case "maitrise":
      return CHAP[arg] ? pageMaitrise(arg) : aller("");
    case "essentiel":
      return pageEssentiel(CHAP[arg] ? arg : DATA.chapitres[0].id);
    case "formulaire":
      return pageFormulaire();
    case "stats":
      return pageStats();
    case "reglages":
      return pageReglages();
    default:
      routeActuelle = "";
      return pageAccueil();
  }
}
window.addEventListener("hashchange", route);

function afficher(html, { haut = true, anim = false } = {}) {
  app.innerHTML = `<div class="ecran${anim ? " entree" : ""}">${html}</div>`;
  if (haut) window.scrollTo(0, 0);
}
const entetePage = (titre, retour = "") =>
  `<header class="entete-page"><a class="btn-icone" href="#/${retour}" aria-label="Retour">${ICONES.retour}</a><h1>${titre}</h1></header>`;

// ---------- Accueil ----------
function pageAccueil() {
  const jour = aujourdhui();
  const fait = etat.jours[jour] || 0;
  const objectif = etat.reglages.objectif;
  const suite = L.joursDAffilee(etat, jour);
  const duJour = L.idsDuJour(DATA, etat, jour).length;
  const erreurs = L.idsRevoir(DATA, etat).length;

  let enCours = "";
  if (serie && !serie.finie)
    enCours += boutonGros("aller", ICONES.reprendre, `Reprendre : ${esc(serie.titre)}`, `Encore ${nb(L.restantes(serie), "question", "questions")} à réussir`, "", 'data-h="serie"', "en-cours");
  if (examen && !examen.fini)
    enCours += boutonGros("aller", ICONES.chrono, "Reprendre l'examen blanc", `${formatDuree(examen.fin - Date.now())} restantes`, "", 'data-h="examen"', "en-cours");
  if (flash && !flash.finie)
    enCours += boutonGros("aller", ICONES.cartes, `Reprendre : ${esc(flash.titre)}`, `Encore ${nb(flash.total - flash.sues.length, "carte", "cartes")} à savoir`, "", 'data-h="flash"', "en-cours");

  afficher(`
    <header class="entete">
      <div><h1>QCM IoT</h1><p class="sous">${esc(DATA.cours)}</p></div>
      <a class="btn-icone" href="#/reglages" aria-label="Réglages et sauvegarde">${ICONES.reglages}</a>
    </header>
    ${enCours}
    <section class="carte jour" aria-label="Objectif du jour" style="margin-top:12px">
      <div class="ligne"><span>Objectif du jour</span><strong>${fait} / ${objectif}</strong></div>
      <div class="jauge" role="progressbar" aria-label="Questions faites aujourd'hui" aria-valuemin="0" aria-valuemax="${objectif}" aria-valuenow="${Math.min(fait, objectif)}"><div style="width:${Math.min(100, (100 * fait) / objectif)}%"></div></div>
      <p class="serie-jours">${ICONES.flamme}<span>${suite ? `${nb(suite, "jour", "jours")} d'affilée` : "Aucune série de jours en cours"}${fait >= objectif ? " · objectif atteint" : ""}</span></p>
    </section>
    ${boutonGros("du-jour", ICONES.calendrier, "Révision espacée du jour", duJour ? `${nb(duJour, "question", "questions")} à réviser aujourd'hui` : "Rien à réviser aujourd'hui", duJour, duJour ? "" : "disabled")}
    ${boutonGros("erreurs", ICONES.erreurs, "Révision des erreurs", erreurs ? `${nb(erreurs, "question", "questions")} à revoir, chapitres mélangés` : "Aucune question à revoir", erreurs, erreurs ? "" : "disabled")}

    <h2 class="titre-section">Chapitres</h2>
    ${DATA.chapitres.map(carteChapitre).join("")}

    <h2 class="titre-section">Pour apprendre le cours</h2>
    <nav class="modes" aria-label="Autres modes">
      ${lienMode("flash", ICONES.cartes, "Rappel actif", "La question sans les choix")}
      ${lienMode("examen", ICONES.chrono, "Examen blanc", "20 questions en 25 minutes")}
      ${lienMode("cible", ICONES.cible, "Entraînement ciblé", "Par chapitre et par type")}
      ${lienMode("essentiel/I", ICONES.livre, "L'essentiel", "8 points clés par chapitre")}
      ${lienMode("formulaire", ICONES.formule, "Formulaire", "Toutes les formules")}
      ${lienMode("stats", ICONES.stats, "Statistiques", "Réussite, historique, erreurs")}
      ${lienMode("reglages", ICONES.sauvegarde, "Réglages et sauvegarde", "Exporter, importer, thème")}
    </nav>
    ${stockageOk ? "" : `<p class="alerte">Le stockage de ce navigateur est indisponible : la progression ne sera pas conservée après fermeture. Utilise « Exporter ma progression » dans les réglages.</p>`}
    <p class="pied">${DATA.questions.length} questions · progression enregistrée sur cet appareil</p>
  `);
}
function boutonGros(act, icone, titre, sous, nombre, attrs = "", classe = "") {
  return `<button class="gros-btn ${classe}" data-act="${act}" ${attrs}>${icone}<span class="gb-texte"><span class="gb-titre">${titre}</span><span class="gb-sous">${sous}</span></span>${nombre !== "" && nombre !== undefined ? `<span class="nombre">${nombre}</span>` : ""}</button>`;
}
const lienMode = (h, icone, titre, sous) => `<a class="mode" href="#/${h}">${icone}<span><b>${titre}</b><small>${sous}</small></span></a>`;

function carteChapitre(c) {
  const ids = idsDuChapitre(c.id);
  const n = L.compter(etat, ids);
  return `<article class="carte chapitre chap" style="${styleChap(c.id)}" data-chap="${c.id}">
    <div class="chap-tete">
      ${anneau(n, ids.length)}
      <div>
        <p class="chap-num">Chapitre ${c.id}</p>
        <h3>${esc(c.titre)}</h3>
        <p class="compteurs">${nb(n.maitrisee, "maîtrisée", "maîtrisées")} · ${n.revoir} à revoir · ${nb(n.nouvelle, "nouvelle", "nouvelles")}</p>
      </div>
    </div>
    <div class="chap-actions">
      <button class="btn btn-chap" data-act="lancer" data-chap="${c.id}">Lancer le QCM</button>
      <a class="btn btn-sec" href="#/essentiel/${c.id}">L'essentiel</a>
    </div>
  </article>`;
}

// ---------- Lancement des séries ----------
function lancerChapitre(chap) {
  const s = L.serieChapitre(DATA, etat, chap);
  if (s.genre === "maitrise") return aller(`maitrise/${chap}`);
  const n = s.ids.length;
  let message = "";
  if (s.genre === "rattrapage")
    message =
      s.ratees === n
        ? `Rattrapage : ${nb(n, "question ratée", "questions ratées")} la dernière fois`
        : `Rattrapage : ${nb(n, "question", "questions")} à revoir depuis la dernière fois (ratées ou pas sûres)`;
  demarrerSerie({ mode: s.genre === "rattrapage" ? "Rattrapage" : "QCM", titre: `Chapitre ${chap}`, chap, ids: s.ids, message });
}
function demarrerSerie(opts) {
  if (!opts.ids.length) return toast("Aucune question à proposer.");
  serie = L.nouvelleSerie(opts, etat);
  vues.serie = null;
  sauver();
  aller("serie");
}

// ---------- Écran de question (séries et examen) ----------
function nouvelleVue(id, pos) {
  return { id, pos, ordre: etat.reglages.melange ? L.melanger([0, 1, 2, 3]) : [0, 1, 2, 3], choisi: null, valide: false, res: null };
}

function htmlBandeau(q, { compteur, progression, encore = "", chrono = "", quitter = "quitter" }) {
  return `<div class="bandeau">
    <div class="bandeau-haut">
      <button class="btn-icone" data-act="${quitter}" aria-label="Quitter">${ICONES.fermer}</button>
      <span class="titre-chap">${titreChap(q.chapitre)}</span>
      ${chrono ? `<span class="chrono" id="chrono" aria-label="Temps restant">${chrono}</span>` : ""}
    </div>
    <div class="bandeau-bas">${badgeType(q.type)}<span class="compteur">${compteur}</span></div>
    <div class="progression" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progression)}"><div style="width:${progression}%"></div></div>
    ${encore ? `<p class="encore">${encore}</p>` : ""}
  </div>`;
}

function htmlChoix(q, v, corrige) {
  return `<div class="liste-choix" role="group" aria-label="Réponses proposées">${v.ordre
    .map((orig, k) => {
      let cls = "choix-btn";
      let marque = "";
      let sr = "";
      if (corrige) {
        if (orig === q.bonne) {
          cls += " juste";
          marque = ICONES.ok;
          sr = " (bonne réponse)";
        } else if (k === v.choisi) {
          cls += " faux";
          marque = ICONES.ko;
          sr = " (ton choix, faux)";
        } else cls += " terne";
      } else if (k === v.choisi) cls += " choisi";
      return `<button class="${cls}" data-act="choix" data-k="${k}" data-orig="${orig}" aria-pressed="${k === v.choisi}" ${corrige ? "disabled" : ""}>
        <span class="lettre" aria-hidden="true">${"ABCD"[k]}</span><span class="txt">${fmt(q.choix[orig])}<span class="visuellement-cache">${sr}</span></span>${marque ? `<span class="marque">${marque}</span>` : ""}
      </button>`;
    })
    .join("")}</div>`;
}

const aideClavier = (confiance) =>
  `<p class="aide-clavier">Clavier : <kbd>1</kbd>-<kbd>4</kbd> ou <kbd>A</kbd>-<kbd>D</kbd> pour choisir${confiance ? ", <kbd>Entrée</kbd> = Sûr, <kbd>P</kbd> = Pas sûr" : ""}, <kbd>0</kbd> = Je ne sais pas, puis <kbd>Entrée</kbd> pour continuer</p>`;

function barreConfiance(v, libelleSansConfiance = "") {
  const pret = v.choisi !== null && v.choisi >= 0;
  if (etat.reglages.confiance)
    return `<div class="barre-action">
      <button class="btn btn-sec" data-act="valider" data-sur="0" ${pret ? "" : "disabled"}>Pas sûr</button>
      <button class="btn btn-chap" data-act="valider" data-sur="1" ${pret ? "" : "disabled"}>Sûr</button>
    </div>`;
  if (libelleSansConfiance)
    return `<div class="barre-action"><button class="btn btn-chap" data-act="valider" data-sur="1" ${pret ? "" : "disabled"}>${libelleSansConfiance}</button></div>`;
  return "";
}

// ---------- Série QCM ----------
function pageSerie(anim) {
  if (serie.finie) return bilanSerie();
  const id = L.questionCourante(serie);
  let v = vues.serie;
  if (!v || v.id !== id || v.pos !== serie.pos) v = vues.serie = nouvelleVue(id, serie.pos);
  const q = Q[id];
  couleurBarre(CHAP[q.chapitre].couleur);
  const premier = L.premierPassage(serie);
  const reste = L.restantes(serie);
  const bandeau = htmlBandeau(q, {
    compteur: premier ? `${serie.pos + 1} / ${serie.total}` : "Reprise des erreurs",
    progression: (100 * serie.reussies.length) / serie.total,
    encore: reste ? `Encore ${nb(reste, "question", "questions")} à réussir` : "Toutes les questions sont réussies",
  });
  const message = serie.pos === 0 && serie.message ? `<p class="message-serie">${esc(serie.message)}</p>` : "";
  let bas;
  let correction = "";
  if (v.valide) {
    const r = v.res;
    let classe;
    let titre;
    let note = "";
    if (r.juste && r.sur) {
      classe = "ok";
      titre = "Bonne réponse";
      if (!r.premier) note = "Elle reste à revoir pour la prochaine fois, car elle a été ratée dans cette série.";
    } else if (r.juste) {
      classe = "doute";
      titre = "Bonne réponse";
      note = "Donnée avec « Pas sûr » : la question reste à revoir.";
    } else {
      classe = "ko";
      titre = r.nsp ? "Je ne sais pas" : "Mauvaise réponse";
      note = r.nsp ? "Compté comme une erreur : la question reviendra à la fin de la série." : "Elle reviendra à la fin de la série.";
    }
    correction = `<div class="correction">
      <p class="verdict ${classe}" id="verdict" tabindex="-1">${r.juste ? ICONES.ok : ICONES.ko}<span>${titre}${note ? `<span class="note">${note}</span>` : ""}</span></p>
      <p class="explication">${fmt(q.explication)}</p>
      <p class="ref-cours">À revoir : ${esc(q.cours)}</p>
      <button class="btn btn-chap-sec btn-plein" data-act="essentiel-feuille" data-chap="${q.chapitre}">Voir l'essentiel du chapitre</button>
    </div>`;
    const derniere = serie.pos + 1 >= serie.file.length;
    bas = `<div class="barre-action"><button class="btn btn-chap" data-act="suivante">${derniere ? "Voir le bilan" : "Question suivante"}</button></div>`;
  } else {
    bas = barreConfiance(v);
  }
  afficher(
    `<section class="chap" style="${styleChap(q.chapitre)}" data-qid="${q.id}">
      ${bandeau}
      ${message}
      <h2 class="enonce" id="enonce" tabindex="-1">${fmt(q.question)}</h2>
      ${htmlChoix(q, v, v.valide)}
      ${v.valide ? "" : `<button class="btn-lien nsp" data-act="nsp">Je ne sais pas</button>${aideClavier(etat.reglages.confiance)}`}
      ${correction}
      ${bas}
    </section>`,
    { haut: !!anim, anim: !!anim },
  );
}

function choisir(k, mode) {
  const v = vues[mode];
  if (!v || v.valide) return;
  v.choisi = k;
  if (mode === "serie" && !etat.reglages.confiance) return valider(mode, true);
  // mise à jour légère : pas de nouveau rendu
  app.querySelectorAll(".choix-btn").forEach((b) => {
    const sel = Number(b.dataset.k) === k;
    b.classList.toggle("choisi", sel);
    b.setAttribute("aria-pressed", String(sel));
  });
  app.querySelectorAll('[data-act="valider"]').forEach((b) => (b.disabled = false));
}

function jeNeSaisPas(mode) {
  const v = vues[mode];
  if (!v || v.valide) return;
  v.choisi = -1;
  valider(mode, false);
}

function valider(mode, sur) {
  if (mode === "examen") return validerExamen(sur);
  const v = vues.serie;
  if (!v || v.valide || v.choisi === null || !serie) return;
  const q = Q[v.id];
  const nsp = v.choisi === -1;
  const orig = nsp ? -1 : v.ordre[v.choisi];
  const juste = orig === q.bonne;
  const surEff = nsp ? false : etat.reglages.confiance ? !!sur : true;
  const { premier } = L.repondre(serie, etat, v.id, { juste, sur: surEff }, aujourdhui());
  v.valide = true;
  v.res = { juste, sur: surEff, nsp, premier };
  sauver();
  if (!juste) vibrer();
  pageSerie(false);
  const verdict = $("#verdict");
  if (verdict) {
    verdict.focus({ preventScroll: true });
    verdict.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}

function suivanteSerie() {
  const v = vues.serie;
  if (!serie || !v || !v.valide) return;
  const encore = L.avancer(serie);
  vues.serie = null;
  if (!encore) finirSerie();
  pageSerie(true);
}

function finirSerie() {
  if (!serie || serie.enregistree) return;
  const { justes, total } = L.scoreSerie(serie);
  L.enregistrerHistorique(etat, { mode: serie.mode, titre: serie.titre, chap: serie.chap, justes, total });
  serie.enregistree = true;
  sauver();
}

function bilanSerie() {
  const ids = Object.keys(serie.premiers);
  const { justes, total } = L.scoreSerie(serie);
  const aRevoir = ids.filter((id) => L.etatDe(etat, id) === "revoir");
  const style = serie.chap ? styleChap(serie.chap) : "";
  let suiteChap = "";
  if (serie.chap) {
    const n = L.compter(etat, idsDuChapitre(serie.chap));
    suiteChap = `<section class="carte chapitre chap" style="${style}; margin-top:16px">
      <div class="chap-tete">${anneau(n, 20)}<div><p class="chap-num">${titreChap(serie.chap)}</p>
      <p class="compteurs">${nb(n.maitrisee, "maîtrisée", "maîtrisées")} · ${n.revoir} à revoir · ${nb(n.nouvelle, "nouvelle", "nouvelles")}</p></div></div></section>`;
  }
  const boutons = [];
  if (serie.chap) boutons.push(`<button class="btn btn-chap btn-plein" data-act="lancer" data-chap="${serie.chap}">${aRevoir.length ? "Relancer le rattrapage" : "Relancer le QCM"}</button>`);
  else if (L.idsRevoir(DATA, etat).length) boutons.push(`<button class="btn btn-plein" data-act="erreurs">Réviser mes erreurs</button>`);
  boutons.push(`<a class="btn btn-sec btn-plein" href="#/">Retour à l'accueil</a>`);
  afficher(
    `<section class="${serie.chap ? "chap" : ""}" style="${style}">
      <div class="bilan-tete">
        <p>${esc(serie.mode)} · ${esc(serie.titre)}</p>
        <h1>Série terminée</h1>
        <p class="gros-score">${justes} / ${total}</p>
        <p>réussies du premier coup</p>
      </div>
      ${suiteChap}
      <h2 class="titre-section">${aRevoir.length ? `À revoir la prochaine fois (${aRevoir.length})` : "Rien à revoir"}</h2>
      ${aRevoir.length ? listeQuestions(aRevoir) : `<p class="vide">Toutes les questions de la série ont été réussies du premier coup avec « Sûr ».</p>`}
      <div class="pile" style="margin-top:20px">${boutons.join("")}</div>
    </section>`,
  );
}

function listeQuestions(ids, extra = () => "") {
  return `<ul class="liste-questions">${ids
    .map((id) => {
      const q = Q[id];
      return `<li class="chap" style="${styleChap(q.chapitre)}"><span class="id">${esc(id)}</span>${fmt(q.question)}${extra(id) ? `<br><span class="extra">${extra(id)}</span>` : ""}</li>`;
    })
    .join("")}</ul>`;
}

// ---------- Chapitre maîtrisé ----------
function pageMaitrise(chap) {
  const ids = idsDuChapitre(chap);
  const n = L.compter(etat, ids);
  if (n.maitrisee < ids.length) return aller("");
  const st = L.statsQuestions(DATA, etat, (q) => q.chapitre === chap);
  couleurBarre(CHAP[chap].couleur);
  afficher(`<section class="chap" style="${styleChap(chap)}">
    <div class="bilan-tete">
      <p>${titreChap(chap)}</p>
      <h1>Chapitre maîtrisé</h1>
      <p class="gros-score">${n.maitrisee} / ${ids.length}</p>
      <p>questions maîtrisées</p>
    </div>
    <section class="carte" style="margin-top:16px">
      <p><b>Réussite du premier coup :</b> ${taux(st.reussis, st.essais)} (${st.reussis} sur ${st.essais} réponses)</p>
      <div class="lignes-barres" style="margin-top:12px">${lignesTypes(st.parType)}</div>
    </section>
    <p class="intro" style="margin-top:16px">« Refaire les 20 questions » ne change rien aux états tant qu'il n'y a pas d'erreur : une erreur ou un « Pas sûr » remet la question à revoir.</p>
    <div class="pile">
      <button class="btn btn-chap btn-plein" data-act="refaire" data-chap="${chap}">Refaire les 20 questions</button>
      <a class="btn btn-chap-sec btn-plein" href="#/essentiel/${chap}">L'essentiel du chapitre</a>
      <a class="btn btn-sec btn-plein" href="#/">Retour à l'accueil</a>
    </div>
  </section>`);
}

// ---------- Examen blanc ----------
function pageExamen(anim) {
  if (!examen) return introExamen();
  if (examen.fini) return resultatExamen();
  const id = examen.ids[examen.pos];
  let v = vues.examen;
  if (!v || v.id !== id || v.pos !== examen.pos) v = vues.examen = nouvelleVue(id, examen.pos);
  const q = Q[id];
  couleurBarre(CHAP[q.chapitre].couleur);
  afficher(
    `<section class="chap" style="${styleChap(q.chapitre)}" data-qid="${q.id}">
      ${htmlBandeau(q, { compteur: `${examen.pos + 1} / ${examen.ids.length}`, progression: (100 * examen.pos) / examen.ids.length, chrono: formatDuree(examen.fin - Date.now()), quitter: "quitter-examen" })}
      <h2 class="enonce" tabindex="-1">${fmt(q.question)}</h2>
      ${htmlChoix(q, v, false)}
      <button class="btn-lien nsp" data-act="nsp">Je ne sais pas</button>
      ${aideClavier(etat.reglages.confiance)}
      ${barreConfiance(v, "Valider")}
    </section>`,
    { haut: !!anim, anim: !!anim },
  );
  majChrono();
}

function introExamen() {
  afficher(`${entetePage("Examen blanc")}
    <section class="carte">
      <p><b>20 questions</b> tirées au hasard, 4 par chapitre, chapitres mélangés.</p>
      <p style="margin-top:8px"><b>25 minutes</b> au chronomètre, <b>aucune correction pendant l'épreuve</b>.</p>
      <p style="margin-top:8px">À la fin : la note sur 20, le détail par chapitre et par type, puis la correction question par question. Les questions ratées passent « à revoir ».</p>
    </section>
    <div class="pile" style="margin-top:16px">
      <button class="btn btn-plein" data-act="examen-commencer">Commencer l'examen</button>
    </div>`);
}

function commencerExamen() {
  etat.compteurSeries = (etat.compteurSeries || 0) + 1;
  examen = { ids: L.serieExamen(DATA), pos: 0, reponses: {}, debut: Date.now(), fin: Date.now() + DUREE_EXAMEN, fini: false, sid: etat.compteurSeries };
  vues.examen = null;
  sauver();
  demarrerMinuteur();
  aller("examen");
}

function demarrerMinuteur() {
  clearInterval(minuteur);
  minuteur = setInterval(majChrono, 1000);
}

function formatDuree(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function majChrono() {
  if (!examen || examen.fini) return clearInterval(minuteur);
  const reste = examen.fin - Date.now();
  if (reste <= 0) {
    terminerExamen();
    if (routeActuelle === "examen") pageExamen(true);
    else toast("Temps écoulé : l'examen blanc est terminé.", { label: "Voir", fn: () => aller("examen") });
    return;
  }
  const el = $("#chrono");
  if (el) {
    el.textContent = formatDuree(reste);
    el.classList.toggle("urgent", reste < 5 * 60 * 1000);
  }
}

function validerExamen(sur) {
  const v = vues.examen;
  if (!examen || examen.fini || !v || v.choisi === null) return;
  const nsp = v.choisi === -1;
  if (!nsp && v.choisi < 0) return;
  examen.reponses[v.id] = { orig: nsp ? -1 : v.ordre[v.choisi], sur: nsp ? false : etat.reglages.confiance ? !!sur : true };
  L.compterJour(etat, aujourdhui());
  sauver();
  examen.pos++;
  vues.examen = null;
  if (examen.pos >= examen.ids.length) terminerExamen();
  pageExamen(true);
}

function terminerExamen() {
  if (!examen || examen.fini) return;
  clearInterval(minuteur);
  const jour = aujourdhui();
  let justes = 0;
  for (const id of examen.ids) {
    const r = examen.reponses[id];
    const juste = !!r && r.orig === Q[id].bonne;
    if (juste) justes++;
    L.premiereReponse(etat, id, { juste, sur: juste && !!r.sur }, examen.sid, jour);
  }
  examen.fini = true;
  examen.duree = Math.min(Date.now(), examen.fin) - examen.debut;
  examen.justes = justes;
  L.enregistrerHistorique(etat, { mode: "Examen blanc", titre: "Examen blanc", chap: null, justes, total: examen.ids.length });
  vues.examen = null;
  sauver();
}

function resultatExamen() {
  const ex = examen;
  const parChap = {};
  const parType = {};
  for (const id of ex.ids) {
    const q = Q[id];
    const juste = ex.reponses[id]?.orig === q.bonne;
    const c = (parChap[q.chapitre] ||= { essais: 0, reussis: 0 });
    const t = (parType[q.type] ||= { essais: 0, reussis: 0 });
    c.essais++;
    t.essais++;
    if (juste) {
      c.reussis++;
      t.reussis++;
    }
  }
  const lignesChap = DATA.chapitres
    .map((c) => {
      const x = parChap[c.id] || { essais: 0, reussis: 0 };
      return ligneBarre(titreChap(c.id), `${x.reussis} / ${x.essais}`, x.essais ? x.reussis / x.essais : 0, styleChap(c.id));
    })
    .join("");
  const corrections = ex.ids
    .map((id, i) => {
      const q = Q[id];
      const r = ex.reponses[id];
      const juste = r?.orig === q.bonne;
      const ta = !r ? "Pas de réponse (temps écoulé)" : r.orig === -1 ? "Je ne sais pas" : fmt(q.choix[r.orig]);
      return `<details class="corr chap" style="${styleChap(q.chapitre)}">
        <summary><span class="${juste ? "ok" : "ko"}">${juste ? ICONES.ok : ICONES.ko}</span><span><b>${i + 1}.</b> ${fmt(q.question)}</span></summary>
        <div class="corps">
          <div>${badgeType(q.type)}</div>
          ${juste ? "" : `<div class="rep faux"><b>Ta réponse</b>${ta}</div>`}
          <div class="rep juste"><b>Bonne réponse${juste && r?.sur === false ? " (donnée avec « Pas sûr »)" : ""}</b>${fmt(q.choix[q.bonne])}</div>
          <p>${fmt(q.explication)}</p>
          <p class="ref-cours">À revoir : ${esc(q.cours)}</p>
        </div>
      </details>`;
    })
    .join("");
  const ratees = ex.ids.filter((id) => ex.reponses[id]?.orig !== Q[id].bonne).length;
  afficher(`
    <div class="bilan-tete">
      <p>Examen blanc · ${formatDuree(ex.duree)} utilisées sur 25:00</p>
      <h1>Note</h1>
      <p class="gros-score">${ex.justes} / 20</p>
      <p>${ratees ? `${nb(ratees, "question ratée passe", "questions ratées passent")} « à revoir »` : "Aucune erreur"}</p>
    </div>
    <h2 class="titre-section">Par chapitre</h2>
    <section class="carte"><div class="lignes-barres">${lignesChap}</div></section>
    <h2 class="titre-section">Par type de question</h2>
    <section class="carte"><div class="lignes-barres">${lignesTypes(parType)}</div></section>
    <h2 class="titre-section">Correction</h2>
    ${corrections}
    <div class="pile" style="margin-top:20px">
      ${L.idsRevoir(DATA, etat).length ? `<button class="btn btn-plein" data-act="erreurs">Réviser mes erreurs</button>` : ""}
      <button class="btn btn-sec btn-plein" data-act="examen-nouveau">Nouvel examen blanc</button>
      <a class="btn btn-sec btn-plein" href="#/">Retour à l'accueil</a>
    </div>`);
}

function quitterExamen() {
  ouvrirFeuille({
    titre: "Quitter l'examen ?",
    corps: `<p>Il reste ${formatDuree(examen.fin - Date.now())}. Le chronomètre continue si tu reviens à l'accueil.</p>`,
    actions: [
      { label: "Continuer l'examen", classe: "btn" },
      { label: "Revenir à l'accueil (l'examen reste en cours)", classe: "btn-sec", fn: () => aller("") },
      {
        label: "Terminer maintenant et voir la note",
        classe: "btn-sec",
        fn: () => {
          terminerExamen();
          pageExamen(true);
        },
      },
      {
        label: "Abandonner sans rien compter",
        classe: "btn-faux",
        fn: () => {
          clearInterval(minuteur);
          examen = null;
          vues.examen = null;
          aller("");
        },
      },
    ],
  });
}

// ---------- Rappel actif (flashcards) ----------
function pageFlash(anim) {
  if (!flash) return reglagesFlash();
  if (flash.finie) return bilanFlash();
  const id = flash.file[flash.pos];
  const q = Q[id];
  couleurBarre(CHAP[q.chapitre].couleur);
  const reste = flash.total - flash.sues.length;
  const premier = flash.pos < flash.total;
  let corps;
  let bas;
  if (!flash.revele) {
    corps = `<p class="intro">Réfléchis à la réponse, puis affiche-la.</p>`;
    bas = `<div class="barre-action"><button class="btn btn-chap" data-act="flash-reveler">Afficher la réponse</button></div>`;
  } else {
    corps = `<div class="carte-reponse"><p class="etiquette">Réponse</p><p class="bonne">${fmt(q.choix[q.bonne])}</p></div>
      <p class="explication">${fmt(q.explication)}</p>
      <p class="ref-cours">À revoir : ${esc(q.cours)}</p>
      <button class="btn btn-chap-sec btn-plein" style="margin-top:12px" data-act="essentiel-feuille" data-chap="${q.chapitre}">Voir l'essentiel du chapitre</button>`;
    bas = `<div class="barre-action">
      <button class="btn btn-faux" data-act="flash-eval" data-v="0">Je ne savais pas</button>
      <button class="btn btn-juste" data-act="flash-eval" data-v="1">Je savais</button>
    </div>`;
  }
  afficher(
    `<section class="chap" style="${styleChap(q.chapitre)}" data-qid="${q.id}">
      ${htmlBandeau(q, { compteur: premier ? `${flash.pos + 1} / ${flash.total}` : "Reprise", progression: (100 * flash.sues.length) / flash.total, encore: reste ? `Encore ${nb(reste, "carte", "cartes")} à savoir` : "", quitter: "quitter-flash" })}
      <h2 class="enonce" tabindex="-1">${fmt(q.question)}</h2>
      ${corps}
      <p class="aide-clavier">Clavier : <kbd>Entrée</kbd> pour afficher la réponse, puis <kbd>1</kbd> = Je ne savais pas, <kbd>2</kbd> = Je savais</p>
      ${bas}
    </section>`,
    { haut: !!anim, anim: !!anim },
  );
}

function reglagesFlash() {
  const ids = idsFlash();
  afficher(`${entetePage("Rappel actif")}
    <p class="intro">La question s'affiche sans les choix. Cherche la réponse dans ta tête, affiche-la, puis dis honnêtement si tu la savais. « Je ne savais pas » met la question à revoir.</p>
    <section class="carte">
      <span class="reglage"><span class="nom">Chapitre</span></span>
      <div class="puces">
        <button class="puce" data-act="flash-chap" data-v="tous" aria-pressed="${reglFlash.chap === "tous"}">Tous</button>
        ${DATA.chapitres.map((c) => `<button class="puce chap" style="${styleChap(c.id)}" data-act="flash-chap" data-v="${c.id}" aria-pressed="${reglFlash.chap === c.id}" aria-label="Chapitre ${c.id}">${c.id}</button>`).join("")}
      </div>
      <div class="puces" style="margin-top:12px">
        <button class="puce" data-act="flash-revoir" aria-pressed="${reglFlash.revoir}">Seulement les questions à revoir</button>
      </div>
    </section>
    <div class="pile" style="margin-top:16px">
      <button class="btn btn-plein" data-act="flash-commencer" ${ids.length ? "" : "disabled"}>${ids.length ? `Commencer (${nb(ids.length, "carte", "cartes")})` : "Aucune carte avec ces filtres"}</button>
    </div>`);
}
function idsFlash() {
  return DATA.questions
    .filter((q) => reglFlash.chap === "tous" || q.chapitre === reglFlash.chap)
    .map((q) => q.id)
    .filter((id) => !reglFlash.revoir || L.etatDe(etat, id) === "revoir");
}
function commencerFlash() {
  const ids = idsFlash();
  if (!ids.length) return;
  const melange = reglFlash.chap === "tous" ? L.entrelacer(ids, (id) => Q[id].chapitre) : L.melanger(ids);
  flash = {
    file: melange,
    pos: 0,
    total: ids.length,
    sues: [],
    premiers: {},
    revele: false,
    finie: false,
    titre: reglFlash.chap === "tous" ? "Rappel actif, tous chapitres" : `Rappel actif, chapitre ${reglFlash.chap}`,
    chap: reglFlash.chap === "tous" ? null : reglFlash.chap,
  };
  aller("flash");
}
function evaluerFlash(savait) {
  if (!flash || flash.finie || !flash.revele) return;
  const id = flash.file[flash.pos];
  const premiere = !(id in flash.premiers);
  if (premiere) flash.premiers[id] = savait;
  const jour = aujourdhui();
  L.evaluationFlash(etat, id, savait, jour, premiere);
  L.compterJour(etat, jour);
  if (savait) {
    if (!flash.sues.includes(id)) flash.sues.push(id);
  } else {
    flash.file.push(id);
    vibrer();
  }
  flash.pos++;
  flash.revele = false;
  if (flash.pos >= flash.file.length) {
    flash.finie = true;
    const justes = Object.values(flash.premiers).filter(Boolean).length;
    L.enregistrerHistorique(etat, { mode: "Rappel actif", titre: flash.titre, chap: flash.chap, justes, total: flash.total });
  }
  sauver();
  pageFlash(true);
}
function bilanFlash() {
  const ids = Object.keys(flash.premiers);
  const sues = ids.filter((id) => flash.premiers[id]).length;
  const nonSues = ids.filter((id) => !flash.premiers[id]);
  afficher(`<div class="bilan-tete ${flash.chap ? "chap" : ""}" style="${flash.chap ? styleChap(flash.chap) : ""}">
      <p>${esc(flash.titre)}</p>
      <h1>Rappel actif terminé</h1>
      <p class="gros-score">${sues} / ${flash.total}</p>
      <p>sues du premier coup</p>
    </div>
    <h2 class="titre-section">${nonSues.length ? `Mises à revoir (${nonSues.length})` : "Tout était su"}</h2>
    ${nonSues.length ? listeQuestions(nonSues) : `<p class="vide">Aucune question mise à revoir.</p>`}
    <div class="pile" style="margin-top:20px">
      <button class="btn btn-plein" data-act="flash-nouveau">Nouvelle séance</button>
      <a class="btn btn-sec btn-plein" href="#/">Retour à l'accueil</a>
    </div>`);
}

// ---------- Entraînement ciblé ----------
function pageCible() {
  cible ||= { chaps: DATA.chapitres.map((c) => c.id), types: Object.keys(TYPES) };
  const ids = L.idsCibles(DATA, cible.chaps, cible.types);
  afficher(`${entetePage("Entraînement ciblé")}
    <p class="intro">Choisis les chapitres et les types de questions. Par exemple : seulement le raisonnement du chapitre III.</p>
    <section class="carte">
      <span class="reglage"><span class="nom">Chapitres</span></span>
      <div class="puces">${DATA.chapitres
        .map((c) => `<button class="puce chap" style="${styleChap(c.id)}" data-act="cible-chap" data-v="${c.id}" aria-pressed="${cible.chaps.includes(c.id)}" title="${esc(c.titre)}">${c.id}</button>`)
        .join("")}</div>
      <span class="reglage" style="margin-top:16px;display:block"><span class="nom">Types de questions</span></span>
      <div class="puces">${Object.entries(TYPES)
        .map(([k, t]) => `<button class="puce" data-act="cible-type" data-v="${k}" aria-pressed="${cible.types.includes(k)}">${esc(t.nom)}</button>`)
        .join("")}</div>
    </section>
    <div class="pile" style="margin-top:16px">
      <button class="btn btn-plein" data-act="cible-lancer" ${ids.length ? "" : "disabled"}>${ids.length ? `Lancer (${nb(ids.length, "question", "questions")})` : "Aucune question avec ces filtres"}</button>
    </div>`);
}
function basculer(liste, v) {
  const i = liste.indexOf(v);
  if (i >= 0) liste.splice(i, 1);
  else liste.push(v);
}

// ---------- L'essentiel ----------
function htmlPoints(chap) {
  return `<ol class="points">${DATA.essentiel[chap].map((p) => `<li>${fmt(p)}</li>`).join("")}</ol>`;
}
function pageEssentiel(chap) {
  const c = CHAP[chap];
  document.body.classList.add("fond-chap");
  document.body.style.setProperty("--fond-chap", c.couleur);
  couleurBarre(c.couleur);
  afficher(`<section class="essentiel chap" style="${styleChap(chap)}">
    ${entetePage("L'essentiel")}
    <nav class="onglets" aria-label="Chapitres">${DATA.chapitres
      .map((x) => `<a class="onglet" style="--c:${x.couleur}" href="#/essentiel/${x.id}" ${x.id === chap ? 'aria-current="page"' : ""} aria-label="Chapitre ${x.id}">${x.id}</a>`)
      .join("")}</nav>
    <h2>${titreChap(chap)}</h2>
    ${htmlPoints(chap)}
    <button class="btn btn-blanc btn-plein" data-act="lancer" data-chap="${chap}">Lancer le QCM du chapitre ${chap}</button>
  </section>`);
}
function ouvrirEssentiel(chap) {
  ouvrirFeuille({
    titre: `L'essentiel · Chapitre ${chap}`,
    corps: `<p style="margin-bottom:12px">${esc(CHAP[chap].titre)}</p>${htmlPoints(chap)}`,
    actions: [{ label: "Fermer", classe: "btn-plein" }],
    classe: "essentiel-feuille chap",
    style: styleChap(chap),
  });
}

// ---------- Formulaire ----------
function pageFormulaire() {
  afficher(`${entetePage("Formulaire")}
    <p class="intro">${nb(DATA.formulaire.length, "formule", "formules")} à connaître.</p>
    ${DATA.formulaire
      .map((f) => `<article class="carte formule"><h3>${esc(f.theme)}</h3><p class="f">${fmt(f.formule)}</p>${f.remarque ? `<p class="rem">${fmt(f.remarque)}</p>` : ""}</article>`)
      .join("")}`);
}

// ---------- Statistiques ----------
function ligneBarre(nom, valeur, fraction, style = "", type = "") {
  return `<div class="lb ${style ? "chap" : ""}" style="${style}" ${type ? `data-type="${type}"` : ""}><span class="lb-nom">${nom}</span><span class="lb-val">${valeur}</span><div class="lb-jauge"><div style="width:${Math.round(100 * fraction)}%"></div></div></div>`;
}
function lignesTypes(parType) {
  return Object.entries(TYPES)
    .map(([k, t]) => {
      const x = parType[k] || { essais: 0, reussis: 0 };
      return ligneBarre(`${badgeType(k)}`, x.essais ? `${taux(x.reussis, x.essais)} (${x.reussis}/${x.essais})` : "aucune réponse", x.essais ? x.reussis / x.essais : 0, "", k);
    })
    .join("");
}

function graphiqueHistorique(h) {
  // Largeur 300 : à 375 px d'écran, le graphique est affiché à l'échelle 1 ou plus (textes d'au moins 16 px).
  const W = 300;
  const H = 180;
  const gauche = 40;
  const bas = 26;
  const haut = 10;
  const pas = (W - gauche - 4) / 10;
  const larg = pas * 0.64;
  const hUtile = H - haut - bas;
  let s = `<svg class="graphique" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score des ${h.length} dernières séries, en pourcentage">`;
  for (const v of [0, 50, 100]) {
    const y = haut + hUtile * (1 - v / 100);
    s += `<line class="axe" x1="${gauche}" x2="${W}" y1="${y}" y2="${y}"/><text x="${gauche - 6}" y="${y + 5}" text-anchor="end">${v}</text>`;
  }
  h.forEach((e, i) => {
    const p = e.total ? e.justes / e.total : 0;
    const hb = Math.max(3, hUtile * p);
    const x = gauche + 4 + i * pas + (pas - larg) / 2;
    const y = haut + hUtile - hb;
    const titre = `${dateCourte(e.t)} · ${e.mode} · ${e.justes}/${e.total}`;
    const style = e.chap && CHAP[e.chap] ? `class="chap barre" style="${styleChap(e.chap)};fill:var(--ca)"` : `class="barre-neutre"`;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larg.toFixed(1)}" height="${hb.toFixed(1)}" rx="4" ${style}><title>${esc(titre)}</title></rect>`;
    s += `<text x="${(x + larg / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${i + 1}</text>`;
  });
  return s + "</svg>";
}
function dateCourte(t) {
  const d = new Date(t);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function pageStats() {
  const jour = aujourdhui();
  const g = L.statsQuestions(DATA, etat);
  const fait = etat.jours[jour] || 0;
  const objectif = etat.reglages.objectif;
  const suite = L.joursDAffilee(etat, jour);
  const h = etat.historique.slice(-10);
  const top = L.plusRatees(etat, 10);
  const parChap = DATA.chapitres
    .map((c) => {
      const st = L.statsQuestions(DATA, etat, (q) => q.chapitre === c.id);
      return `<article class="carte chapitre chap" style="${styleChap(c.id)}">
        <div class="chap-tete">${anneau(st, 20)}<div><p class="chap-num">Chapitre ${c.id}</p><h3>${esc(c.titre)}</h3>
        <p class="compteurs">${nb(st.maitrisee, "maîtrisée", "maîtrisées")} · ${st.revoir} à revoir · ${nb(st.nouvelle, "nouvelle", "nouvelles")}</p></div></div>
        <p style="margin-top:12px"><b>Réussite du premier coup :</b> ${taux(st.reussis, st.essais)}${st.essais ? ` (${st.reussis}/${st.essais})` : ""}</p>
        <div class="lignes-barres" style="margin-top:10px">${lignesTypes(st.parType)}</div>
      </article>`;
    })
    .join("");
  afficher(`${entetePage("Statistiques")}
    <section class="carte">
      <p><b>${nb(g.maitrisee, "question maîtrisée", "questions maîtrisées")}</b> · ${g.revoir} à revoir · ${nb(g.nouvelle, "nouvelle", "nouvelles")}</p>
      <p style="margin-top:6px">Réussite du premier coup : <b>${taux(g.reussis, g.essais)}</b>${g.essais ? ` sur ${nb(g.essais, "réponse", "réponses")}` : ""}</p>
      <div class="jauge" role="progressbar" aria-label="Objectif du jour" aria-valuemin="0" aria-valuemax="${objectif}" aria-valuenow="${Math.min(fait, objectif)}"><div style="width:${Math.min(100, (100 * fait) / objectif)}%"></div></div>
      <p>Aujourd'hui : <b>${fait} / ${objectif}</b> questions</p>
      <p class="serie-jours" style="margin-top:4px">${ICONES.flamme}<span>${suite ? `${nb(suite, "jour", "jours")} d'affilée` : "Aucune série de jours en cours"}</span></p>
    </section>

    <h2 class="titre-section">Par type de question</h2>
    <section class="carte"><div class="lignes-barres">${lignesTypes(g.parType)}</div></section>

    <h2 class="titre-section">Par chapitre</h2>
    ${parChap}

    <h2 class="titre-section">Les 10 dernières séries</h2>
    <section class="carte">
      ${
        h.length
          ? `<p class="intro" style="margin-bottom:4px">Score du premier coup, en %</p>${graphiqueHistorique(h)}
        <ol class="historique-liste">${h
          .map((e, i) => `<li><span class="num">${i + 1}</span><span>${esc(e.mode === e.titre ? e.mode : `${e.mode} · ${e.titre}`)}<br><span class="quand">${dateCourte(e.t)}</span></span><span class="sc">${e.justes}/${e.total}</span></li>`)
          .join("")}</ol>`
          : `<p class="vide">Aucune série terminée pour l'instant.</p>`
      }
    </section>

    <h2 class="titre-section">Mes questions les plus ratées</h2>
    ${
      top.length
        ? `${listeQuestions(
            top.map((x) => x.id),
            (id) => `ratée ${etat.questions[id].erreurs} fois · ${L.etatDe(etat, id) === "maitrisee" ? "maîtrisée" : L.etatDe(etat, id) === "revoir" ? "à revoir" : "nouvelle"}`,
          )}
        <div class="pile" style="margin-top:12px"><button class="btn btn-plein" data-act="plus-ratees">Travailler ces ${nb(top.length, "question", "questions")}</button></div>`
        : `<p class="vide">Aucune erreur enregistrée.</p>`
    }`);
}

// ---------- Réglages et sauvegarde ----------
function segmente(cle, libelle, options) {
  const val = etat.reglages[cle];
  return `<div class="reglage"><span class="nom" id="r-${cle}">${libelle}</span>
    <div class="segmente" role="radiogroup" aria-labelledby="r-${cle}">${options
      .map(([v, nom]) => `<button role="radio" aria-checked="${String(val) === String(v)}" data-act="regl" data-k="${cle}" data-v="${v}">${nom}</button>`)
      .join("")}</div></div>`;
}
function pageReglages() {
  const r = etat.reglages;
  afficher(`${entetePage("Réglages et sauvegarde")}
    <section class="carte">
      ${segmente("theme", "Thème", [["auto", "Auto"], ["clair", "Clair"], ["sombre", "Sombre"]])}
      ${segmente("taille", "Taille du texte", [["normale", "Normale"], ["grande", "Grande"]])}
      ${segmente("melange", "Mélange des choix", [[true, "Oui"], [false, "Non"]])}
      ${segmente("confiance", "Indice de confiance (Sûr / Pas sûr)", [[true, "Oui"], [false, "Non"]])}
      ${segmente("maitrise", "Exigence de maîtrise", [[1, "1 réussite"], [2, "2 réussites"]])}
      <p class="aide">Nombre de réussites du premier coup, avec « Sûr », dans des séries différentes, pour qu'une question soit maîtrisée.</p>
      <div class="reglage"><span class="nom" id="r-obj">Objectif quotidien</span>
        <div class="pas-a-pas" role="group" aria-labelledby="r-obj">
          <button class="btn btn-sec" data-act="objectif" data-v="-5" aria-label="Diminuer l'objectif">−</button>
          <output aria-live="polite">${r.objectif}</output>
          <button class="btn btn-sec" data-act="objectif" data-v="5" aria-label="Augmenter l'objectif">+</button>
          <span>questions par jour</span>
        </div>
      </div>
    </section>

    <h2 class="titre-section">Sauvegarde</h2>
    <section class="carte">
      <p>La progression est enregistrée <b>dans chaque appareil séparément</b>. Pour passer du téléphone à l'ordinateur, exporte le fichier ici puis importe-le là-bas.</p>
      <div class="pile" style="margin-top:12px">
        <button class="btn btn-plein" data-act="exporter">Exporter ma progression</button>
        <label class="btn btn-sec btn-plein" tabindex="0" role="button">Importer une progression<input type="file" id="fichier-import" class="visuellement-cache" accept=".json,application/json" tabindex="-1"></label>
      </div>
    </section>

    <h2 class="titre-section">Réinitialiser</h2>
    <section class="carte">
      <span class="reglage"><span class="nom">Chapitre à réinitialiser</span></span>
      <div class="puces">${DATA.chapitres
        .map((c) => `<button class="puce chap" style="${styleChap(c.id)}" data-act="reset-choix" data-v="${c.id}" aria-pressed="${chapReset === c.id}" aria-label="Chapitre ${c.id}">${c.id}</button>`)
        .join("")}</div>
      <div class="pile" style="margin-top:12px">
        <button class="btn btn-sec btn-plein" data-act="reset-chap">Réinitialiser le chapitre ${chapReset}</button>
        <button class="btn btn-danger btn-plein" data-act="reset-tout">Tout réinitialiser</button>
      </div>
    </section>
    <p class="pied">Données : ${esc(DATA.cours)} · version ${DATA.version}</p>`);
}

function changerReglage(cle, v) {
  let val = v;
  if (cle === "melange" || cle === "confiance") val = v === "true";
  if (cle === "maitrise") val = Number(v) === 2 ? 2 : 1;
  etat.reglages[cle] = val;
  sauver();
  appliquerReglages();
  pageReglages();
  const b = app.querySelector(`[data-k="${cle}"][data-v="${v}"]`);
  b?.focus({ preventScroll: true });
}

function exporter() {
  const contenu = JSON.stringify({ app: "qcm-iot", exporteLe: new Date().toISOString(), ...etat }, null, 1);
  try {
    const url = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `qcm-iot-progression-${aujourdhui()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Fichier de progression téléchargé.");
  } catch (e) {
    toast("Export impossible sur ce navigateur.");
  }
}

function importer(fichier) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    let obj;
    try {
      obj = JSON.parse(String(lecteur.result));
    } catch (e) {
      return toast("Ce fichier n'est pas un JSON valide.");
    }
    if (!L.estUneSauvegarde(obj)) return toast("Ce fichier n'est pas une progression QCM IoT.");
    const suivies = Object.keys(obj.questions).length;
    ouvrirFeuille({
      titre: "Importer cette progression ?",
      corps: `<p>Le fichier contient ${nb(suivies, "question suivie", "questions suivies")}${obj.exporteLe ? `, exporté le ${new Date(obj.exporteLe).toLocaleString("fr-FR")}` : ""}.</p><p>Il <b>remplacera</b> la progression actuelle de cet appareil.</p>`,
      actions: [
        { label: "Annuler", classe: "btn-sec" },
        {
          label: "Remplacer par ce fichier",
          classe: "btn",
          fn: () => {
            etat = L.normaliser(obj);
            serie = examen = flash = null;
            vues.serie = vues.examen = null;
            sauver();
            appliquerReglages();
            toast("Progression importée.");
            pageReglages();
          },
        },
      ],
    });
  };
  lecteur.onerror = () => toast("Lecture du fichier impossible.");
  lecteur.readAsText(fichier);
}

function confirmerReset(tout) {
  const chap = chapReset;
  ouvrirFeuille({
    titre: tout ? "Tout réinitialiser ?" : `Réinitialiser le chapitre ${chap} ?`,
    corps: tout
      ? `<p>Les états, les boîtes de révision, l'historique et la série de jours seront effacés. Les réglages sont conservés.</p>`
      : `<p>Les 20 questions du chapitre ${chap} (${esc(CHAP[chap].titre)}) redeviendront « nouvelles ». Le reste ne change pas.</p>`,
    actions: [
      { label: "Annuler", classe: "btn-sec" },
      {
        label: tout ? "Tout effacer" : `Réinitialiser le chapitre ${chap}`,
        classe: "btn-danger",
        fn: () => {
          if (tout) {
            const reglages = etat.reglages;
            etat = L.etatVide();
            etat.reglages = reglages;
            serie = examen = flash = null;
          } else {
            L.reinitialiserChapitre(DATA, etat, chap);
            if (serie?.chap === chap) serie = null;
          }
          sauver();
          toast(tout ? "Progression effacée." : `Chapitre ${chap} réinitialisé.`);
          pageReglages();
        },
      },
    ],
  });
}

// ---------- Feuille (fenêtre en bas d'écran) ----------
function ouvrirFeuille({ titre, corps = "", actions = [], classe = "", style = "" }) {
  const f = $("#feuille");
  retourFocus = document.activeElement;
  actionsFeuille = actions;
  f.innerHTML = `<div class="voile" data-act="fermer-feuille"></div>
    <div class="feuille ${classe}" role="dialog" aria-modal="true" aria-labelledby="feuille-titre" style="${style}">
      <h2 id="feuille-titre">${titre}</h2>${corps}
      <div class="feuille-actions">${actions.map((a, i) => `<button class="btn ${a.classe || "btn-sec"}" data-act="feuille-action" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>
    </div>`;
  f.hidden = false;
  document.body.classList.add("feuille-ouverte");
  f.querySelector(".feuille-actions button")?.focus({ preventScroll: true });
}
function fermerFeuille(rendreFocus = true) {
  const f = $("#feuille");
  if (f.hidden) return;
  f.hidden = true;
  f.innerHTML = "";
  document.body.classList.remove("feuille-ouverte");
  actionsFeuille = [];
  if (rendreFocus && retourFocus?.isConnected) retourFocus.focus({ preventScroll: true });
}

// ---------- Toast ----------
function toast(message, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(message)}</span>${action ? `<button class="btn" data-act="toast-action">${esc(action.label)}</button>` : ""}`;
  toastAction = action?.fn || null;
  t.classList.add("visible");
  clearTimeout(toastMinuteur);
  toastMinuteur = setTimeout(() => t.classList.remove("visible"), action ? 12000 : 3500);
}

// ---------- Actions ----------
const ACTIONS = {
  aller: (el) => aller(el.dataset.h),
  lancer: (el) => lancerChapitre(el.dataset.chap),
  refaire: (el) => {
    const ids = L.melanger(idsDuChapitre(el.dataset.chap));
    demarrerSerie({ mode: "Refaire", titre: `Chapitre ${el.dataset.chap}`, chap: el.dataset.chap, ids });
  },
  "du-jour": () => demarrerSerie({ mode: "Révision du jour", titre: "Révision espacée", ids: L.serieDuJour(DATA, etat, aujourdhui()) }),
  erreurs: () => demarrerSerie({ mode: "Erreurs", titre: "Révision des erreurs", ids: L.serieErreurs(DATA, etat) }),
  "plus-ratees": () => demarrerSerie({ mode: "Plus ratées", titre: "Mes questions les plus ratées", ids: L.melanger(L.plusRatees(etat, 10).map((x) => x.id)) }),
  choix: (el) => choisir(Number(el.dataset.k), routeActuelle === "examen" ? "examen" : "serie"),
  valider: (el) => valider(routeActuelle === "examen" ? "examen" : "serie", el.dataset.sur === "1"),
  nsp: () => jeNeSaisPas(routeActuelle === "examen" ? "examen" : "serie"),
  suivante: () => suivanteSerie(),
  quitter: () => aller(""),
  "essentiel-feuille": (el) => ouvrirEssentiel(el.dataset.chap),
  "examen-commencer": () => commencerExamen(),
  "examen-nouveau": () => {
    examen = null;
    pageExamen(true);
  },
  "quitter-examen": () => quitterExamen(),
  "quitter-flash": () => aller(""),
  "flash-chap": (el) => {
    reglFlash.chap = el.dataset.v;
    reglagesFlash();
  },
  "flash-revoir": () => {
    reglFlash.revoir = !reglFlash.revoir;
    reglagesFlash();
  },
  "flash-commencer": () => commencerFlash(),
  "flash-reveler": () => {
    if (!flash || flash.revele) return;
    flash.revele = true;
    pageFlash(false);
  },
  "flash-eval": (el) => evaluerFlash(el.dataset.v === "1"),
  "flash-nouveau": () => {
    flash = null;
    pageFlash(true);
  },
  "cible-chap": (el) => {
    basculer(cible.chaps, el.dataset.v);
    pageCible();
  },
  "cible-type": (el) => {
    basculer(cible.types, el.dataset.v);
    pageCible();
  },
  "cible-lancer": () => {
    const ids = L.idsCibles(DATA, cible.chaps, cible.types);
    const chap = cible.chaps.length === 1 ? cible.chaps[0] : null;
    const types = cible.types.length === 3 ? "tous types" : cible.types.map((t) => TYPES[t].nom.toLowerCase()).join(", ");
    demarrerSerie({ mode: "Ciblé", titre: `${chap ? `Chapitre ${chap}` : `Chapitres ${cible.chaps.join(", ")}`} · ${types}`, chap, ids: chap ? L.melanger(ids) : L.entrelacer(ids, (id) => Q[id].chapitre) });
  },
  regl: (el) => changerReglage(el.dataset.k, el.dataset.v),
  objectif: (el) => {
    etat.reglages.objectif = Math.min(200, Math.max(5, etat.reglages.objectif + Number(el.dataset.v)));
    sauver();
    pageReglages();
    app.querySelector(`[data-act="objectif"][data-v="${el.dataset.v}"]`)?.focus({ preventScroll: true });
  },
  exporter: () => exporter(),
  "reset-choix": (el) => {
    chapReset = el.dataset.v;
    pageReglages();
  },
  "reset-chap": () => confirmerReset(false),
  "reset-tout": () => confirmerReset(true),
  "fermer-feuille": () => fermerFeuille(),
  "feuille-action": (el) => {
    const a = actionsFeuille[Number(el.dataset.i)];
    fermerFeuille();
    a?.fn?.();
  },
  "toast-action": () => {
    $("#toast").classList.remove("visible");
    toastAction?.();
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const f = ACTIONS[el.dataset.act];
  if (!f) return;
  e.preventDefault();
  f(el, e);
});

document.addEventListener("change", (e) => {
  if (e.target.id === "fichier-import" && e.target.files?.[0]) {
    importer(e.target.files[0]);
    e.target.value = "";
  }
});

// Le libellé « Importer » se comporte comme un bouton au clavier.
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("label[role=button]")) {
    e.preventDefault();
    e.target.querySelector("input")?.click();
  }
});

// ---------- Raccourcis clavier ----------
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.matches?.("input, textarea, select, label[role=button]")) return;
  if (!$("#feuille").hidden) {
    if (e.key === "Escape") fermerFeuille();
    return;
  }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (routeActuelle === "flash" && flash && !flash.finie) {
    if (!flash.revele && (k === "Enter" || k === " ")) {
      e.preventDefault();
      return ACTIONS["flash-reveler"]();
    }
    if (flash.revele && (k === "1" || k === "2")) {
      e.preventDefault();
      return evaluerFlash(k === "2");
    }
    return;
  }
  const mode = routeActuelle === "serie" && serie && !serie.finie ? "serie" : routeActuelle === "examen" && examen && !examen.fini ? "examen" : null;
  if (!mode) return;
  const v = vues[mode];
  if (!v) return;
  let idx = "1234".indexOf(k);
  if (idx < 0) idx = "abcd".indexOf(k);
  if (k.length === 1 && idx >= 0 && !v.valide) {
    e.preventDefault();
    return choisir(idx, mode);
  }
  if (k === "Enter") {
    e.preventDefault();
    if (v.valide) return mode === "serie" && suivanteSerie();
    if (v.choisi !== null && v.choisi >= 0) return valider(mode, true);
    return;
  }
  if (!v.valide && v.choisi !== null && v.choisi >= 0 && (k === "s" || k === "p") && etat.reglages.confiance) {
    e.preventDefault();
    return valider(mode, k === "s");
  }
  if (!v.valide && (k === "0" || k === "?" || k === "n")) {
    e.preventDefault();
    return jeNeSaisPas(mode);
  }
});

// ---------- Hors ligne ----------
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const avaitControleur = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (avaitControleur) toast("Nouvelle version disponible.", { label: "Recharger", fn: () => location.reload() });
  });
}

// ---------- Démarrage ----------
async function demarrer() {
  charger();
  appliquerReglages();
  try {
    const r = await fetch("./data.json");
    if (!r.ok) throw new Error(String(r.status));
    DATA = await r.json();
  } catch (e) {
    app.innerHTML = `<p class="chargement">Impossible de charger les questions. Vérifie la connexion, puis recharge la page.</p>`;
    return;
  }
  for (const q of DATA.questions) Q[q.id] = q;
  for (const c of DATA.chapitres) CHAP[c.id] = c;
  if (!CHAP[chapReset]) chapReset = DATA.chapitres[0].id;
  route();
}
demarrer();

// Accès pour les tests automatisés (lecture seule de l'état).
window.__qcm = { etat: () => etat, serie: () => serie };
