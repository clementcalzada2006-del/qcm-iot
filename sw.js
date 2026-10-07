// Service worker : met tous les fichiers en cache pour un fonctionnement hors ligne.
// Changer VERSION à chaque mise en ligne pour que les téléphones récupèrent la nouvelle version.
const VERSION = "qcm-iot-2026-10-07-1";
const FICHIERS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./logique.js",
  "./data.json",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(FICHIERS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("qcm-iot-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // Toute page de l'application renvoie index.html (la navigation se fait par #/…).
    e.respondWith(
      caches.match("./index.html", { cacheName: VERSION }).then((r) => r || fetch(req)),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true, cacheName: VERSION }).then(
      (r) =>
        r ||
        fetch(req).then((rep) => {
          if (rep.ok && rep.type === "basic") {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie));
          }
          return rep;
        }),
    ),
  );
});
