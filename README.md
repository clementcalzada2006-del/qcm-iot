# QCM IoT

Application de révision (QCM) du cours d'infrastructures IoT, BUT Mesures Physiques 3e année.
Site statique (HTML, CSS, JavaScript sans framework), installable sur le téléphone et utilisable hors ligne.

## Fichiers

- `index.html`, `styles.css`, `app.js` : l'interface.
- `logique.js` : les règles (états, rattrapage, boîtes de Leitner), sans DOM.
- `data.json` : les 100 questions, l'essentiel et le formulaire (ne pas modifier).
- `manifest.webmanifest`, `sw.js`, `icons/` : installation et hors ligne.
- `outils/` : contrôles et tests (non nécessaires au site).

## Tester

```bash
npm install
npm test
```

`npm test` vérifie les données, les règles, puis l'application dans Edge (rattrapage, affichage à 375 px, hors ligne, clavier).
`npm run serve` lance le site en local sur http://127.0.0.1:5190/.

## Mettre à jour le site

Après toute modification, changer `VERSION` dans `sw.js` : sinon les téléphones gardent l'ancienne version en cache.
