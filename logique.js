// Règles du QCM, sans aucun accès au DOM : importable dans le navigateur et dans Node (tests).

export const CLE = "qcm-iot-v1";

// Boîtes de Leitner : nombre de jours avant de revoir la question.
export const INTERVALLES = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

export const REGLAGES_DEFAUT = {
  theme: "auto", // auto | clair | sombre
  taille: "normale", // normale | grande
  melange: true, // mélange des choix
  confiance: true, // indice de confiance (Sûr / Pas sûr)
  maitrise: 1, // réussites du premier coup exigées (1 ou 2)
  objectif: 20, // questions par jour
};

export function etatVide() {
  return {
    version: 1,
    questions: {}, // id -> fiche
    historique: [], // séries terminées
    jours: {}, // "AAAA-MM-JJ" -> nombre de réponses données ce jour-là
    reglages: { ...REGLAGES_DEFAUT },
    compteurSeries: 0,
  };
}

// Complète un état lu dans le stockage ou dans un fichier importé.
export function normaliser(brut) {
  const e = etatVide();
  if (!brut || typeof brut !== "object") return e;
  if (brut.questions && typeof brut.questions === "object") {
    for (const [id, f] of Object.entries(brut.questions)) {
      if (f && typeof f === "object") e.questions[id] = { ...ficheVide(), ...f };
    }
  }
  if (Array.isArray(brut.historique)) e.historique = brut.historique.filter((h) => h && typeof h === "object").slice(-50);
  if (brut.jours && typeof brut.jours === "object") e.jours = { ...brut.jours };
  if (brut.reglages && typeof brut.reglages === "object") e.reglages = { ...REGLAGES_DEFAUT, ...brut.reglages };
  e.compteurSeries = Number(brut.compteurSeries) || 0;
  return e;
}

export function estUneSauvegarde(obj) {
  return !!obj && typeof obj === "object" && obj.questions && typeof obj.questions === "object" && !Array.isArray(obj.questions);
}

function ficheVide() {
  return {
    vu: false, // déjà interrogée (sinon : nouvelle)
    succes: 0, // réussites du premier coup avec « Sûr », d'affilée, dans des séries différentes
    sess: null, // dernière série où une réussite a été comptée
    echec: false, // la dernière réponse du premier coup était fausse
    boite: 0, // boîte de Leitner (0 = jamais entrée)
    due: null, // date de la prochaine révision espacée
    essais: 0, // réponses du premier coup
    reussis: 0, // réponses du premier coup justes
    erreurs: 0, // toutes les réponses fausses (boucles et flashcards comprises)
    der: 0, // horodatage de la dernière réponse
  };
}

export function fiche(etat, id) {
  if (!etat.questions[id]) etat.questions[id] = ficheVide();
  return etat.questions[id];
}

// ---------- Dates locales ----------
export function jourISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function ajouterJours(iso, n) {
  const [a, m, j] = iso.split("-").map(Number);
  return jourISO(new Date(a, m - 1, j + n));
}

// ---------- États ----------
export function etatDe(etat, id) {
  const f = etat.questions[id];
  if (!f || !f.vu) return "nouvelle";
  return f.succes >= (etat.reglages.maitrise || 1) ? "maitrisee" : "revoir";
}

export function compter(etat, ids) {
  const c = { maitrisee: 0, revoir: 0, nouvelle: 0 };
  for (const id of ids) c[etatDe(etat, id)]++;
  return c;
}

export function compterJour(etat, jour) {
  etat.jours[jour] = (etat.jours[jour] || 0) + 1;
}

// Première réponse à une question dans une série : c'est elle seule qui fait évoluer l'état.
export function premiereReponse(etat, id, { juste, sur }, sid, jour) {
  const f = fiche(etat, id);
  f.vu = true;
  f.essais++;
  if (juste) f.reussis++;
  else f.erreurs++;
  if (juste && sur) {
    if (f.sess !== sid) f.succes++;
    f.sess = sid;
    f.echec = false;
    f.boite = Math.min(5, Math.max(1, f.boite) + 1);
  } else if (juste) {
    // bonne réponse mais « Pas sûr » : à revoir, la boîte ne monte pas
    f.succes = 0;
    f.echec = false;
    f.boite = Math.max(1, f.boite);
  } else {
    f.succes = 0;
    f.echec = true;
    f.boite = 1;
  }
  f.due = ajouterJours(jour, INTERVALLES[f.boite]);
  f.der = Date.now();
}

// Réponse à une question déjà vue dans la même série (boucle de rattrapage) : l'état ne change pas.
export function repriseReponse(etat, id, juste) {
  const f = fiche(etat, id);
  if (!juste) f.erreurs++;
  f.der = Date.now();
}

// Flashcards : « Je ne savais pas » met la question à revoir ; « Je savais » la fait monter de boîte.
export function evaluationFlash(etat, id, savait, jour, premiere) {
  const f = fiche(etat, id);
  f.der = Date.now();
  if (!premiere) {
    if (!savait) f.erreurs++;
    return;
  }
  if (savait) {
    f.boite = Math.min(5, Math.max(1, f.boite) + 1);
  } else {
    f.vu = true;
    f.succes = 0;
    f.echec = true;
    f.boite = 1;
    f.erreurs++;
  }
  f.due = ajouterJours(jour, INTERVALLES[f.boite]);
}

// ---------- Tirages ----------
export function melanger(tab, alea = Math.random) {
  const t = [...tab];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// Mélange en évitant autant que possible deux questions du même chapitre à la suite.
export function entrelacer(ids, chapitreDe, alea = Math.random) {
  const groupes = new Map();
  for (const id of melanger(ids, alea)) {
    const c = chapitreDe(id);
    if (!groupes.has(c)) groupes.set(c, []);
    groupes.get(c).push(id);
  }
  const res = [];
  let dernier = null;
  while (res.length < ids.length) {
    const candidats = [...groupes.entries()].filter(([c, l]) => l.length && c !== dernier);
    const pool = candidats.length ? candidats : [...groupes.entries()].filter(([, l]) => l.length);
    const max = Math.max(...pool.map(([, l]) => l.length));
    const meilleurs = pool.filter(([, l]) => l.length === max);
    const [c, l] = meilleurs[Math.floor(alea() * meilleurs.length)];
    res.push(l.shift());
    dernier = c;
  }
  return res;
}

const idsChapitre = (data, chap) => data.questions.filter((q) => q.chapitre === chap).map((q) => q.id);
const chapitreDe = (data) => {
  const m = Object.fromEntries(data.questions.map((q) => [q.id, q.chapitre]));
  return (id) => m[id];
};

// Bouton « Lancer le QCM » d'un chapitre.
export function serieChapitre(data, etat, chap, alea = Math.random) {
  const ids = idsChapitre(data, chap);
  const revoir = ids.filter((id) => etatDe(etat, id) === "revoir");
  if (revoir.length) {
    const ratees = revoir.filter((id) => etat.questions[id]?.echec).length;
    return { genre: "rattrapage", ids: melanger(revoir, alea), ratees };
  }
  if (ids.some((id) => etatDe(etat, id) === "nouvelle")) return { genre: "complet", ids: melanger(ids, alea) };
  return { genre: "maitrise", ids: melanger(ids, alea) };
}

export function idsRevoir(data, etat) {
  return data.questions.map((q) => q.id).filter((id) => etatDe(etat, id) === "revoir");
}
export function serieErreurs(data, etat, alea = Math.random) {
  return entrelacer(idsRevoir(data, etat), chapitreDe(data), alea);
}

export function idsDuJour(data, etat, jour) {
  return data.questions
    .map((q) => q.id)
    .filter((id) => {
      const f = etat.questions[id];
      return f && f.boite >= 1 && f.due && f.due <= jour;
    });
}
export function serieDuJour(data, etat, jour, alea = Math.random) {
  return entrelacer(idsDuJour(data, etat, jour), chapitreDe(data), alea);
}

export function serieExamen(data, parChapitre = 4, alea = Math.random) {
  const ids = [];
  for (const c of data.chapitres) ids.push(...melanger(idsChapitre(data, c.id), alea).slice(0, parChapitre));
  return entrelacer(ids, chapitreDe(data), alea);
}

export function idsCibles(data, chapitres, types) {
  return data.questions.filter((q) => chapitres.includes(q.chapitre) && types.includes(q.type)).map((q) => q.id);
}

export function plusRatees(etat, n = 10) {
  return Object.entries(etat.questions)
    .filter(([, f]) => f.erreurs > 0)
    .sort(([, a], [, b]) => b.erreurs - a.erreurs || a.reussis / (a.essais || 1) - b.reussis / (b.essais || 1) || b.der - a.der)
    .slice(0, n)
    .map(([id, f]) => ({ id, erreurs: f.erreurs }));
}

// ---------- Série en cours (boucle jusqu'à réussite) ----------
export function nouvelleSerie({ mode, titre, chap = null, ids, message = "" }, etat) {
  etat.compteurSeries = (etat.compteurSeries || 0) + 1;
  return { mode, titre, chap, message, sid: etat.compteurSeries, file: [...ids], pos: 0, total: ids.length, premiers: {}, reussies: [], finie: false };
}
export const questionCourante = (s) => s.file[s.pos];

export function repondre(serie, etat, id, { juste, sur }, jour) {
  const premier = !(id in serie.premiers);
  if (premier) {
    serie.premiers[id] = { juste, sur };
    premiereReponse(etat, id, { juste, sur }, serie.sid, jour);
  } else {
    repriseReponse(etat, id, juste);
  }
  compterJour(etat, jour);
  if (juste) {
    if (!serie.reussies.includes(id)) serie.reussies.push(id);
  } else {
    serie.file.push(id); // remise à la fin de la série en cours
  }
  return { premier };
}

// Passe à la question suivante ; renvoie false quand la série est terminée.
export function avancer(serie) {
  serie.pos++;
  if (serie.pos >= serie.file.length) serie.finie = true;
  return !serie.finie;
}
export const restantes = (s) => s.total - s.reussies.length;
export const premierPassage = (s) => s.pos < s.total;
export function scoreSerie(s) {
  const p = Object.values(s.premiers);
  return { justes: p.filter((x) => x.juste).length, total: s.total };
}

export function enregistrerHistorique(etat, entree) {
  etat.historique.push({ t: Date.now(), ...entree });
  if (etat.historique.length > 50) etat.historique = etat.historique.slice(-50);
}

// ---------- Statistiques ----------
export function statsQuestions(data, etat, filtre = () => true) {
  const qs = data.questions.filter(filtre);
  const c = compter(etat, qs.map((q) => q.id));
  let essais = 0;
  let reussis = 0;
  const parType = {};
  for (const q of qs) {
    const t = (parType[q.type] ||= { essais: 0, reussis: 0 });
    const f = etat.questions[q.id];
    if (!f) continue;
    essais += f.essais;
    reussis += f.reussis;
    t.essais += f.essais;
    t.reussis += f.reussis;
  }
  return { ...c, essais, reussis, parType };
}

export function joursDAffilee(etat, jour) {
  let d = jour;
  if (!(etat.jours[d] > 0)) d = ajouterJours(d, -1);
  let n = 0;
  while (etat.jours[d] > 0) {
    n++;
    d = ajouterJours(d, -1);
  }
  return n;
}

export function reinitialiserChapitre(data, etat, chap) {
  for (const id of idsChapitre(data, chap)) delete etat.questions[id];
}
