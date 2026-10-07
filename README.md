# QCM IoT

Application de révision (QCM) du cours d'infrastructures IoT, BUT Mesures Physiques 3e année.
Site statique (HTML, CSS, JavaScript sans framework), installable sur le téléphone et utilisable hors ligne.

## Fichiers

- `index.html`, `styles.css`, `app.js` : l'interface.
- `logique.js` : les règles (états, rattrapage, boîtes de Leitner), sans DOM.
- `data.json` : les questions (183 au 07/10/2026, toutes les pages du cours couvertes), l'essentiel et le formulaire. Une question peut avoir un schéma (`"figure": { "src": "figures/….svg", "alt": "…" }`) : le fichier doit exister dans `figures/` et figurer dans la liste de `sw.js`. Les choix ont été reformulés pour que la bonne réponse ne soit plus repérable à sa longueur : `npm run biais` mesure ce biais, et `npm test` échoue s'il revient.
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
