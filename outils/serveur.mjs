// Petit serveur statique pour tester en local : node outils/serveur.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

export function demarrerServeur(port = 0) {
  const serveur = createServer(async (req, res) => {
    try {
      let chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (chemin.endsWith("/")) chemin += "index.html";
      const fichier = normalize(join(racine, chemin));
      if (!fichier.startsWith(racine) || fichier.includes("node_modules")) throw new Error("interdit");
      const contenu = await readFile(fichier);
      res.writeHead(200, { "Content-Type": TYPES[extname(fichier)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(contenu);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("introuvable");
    }
  });
  return new Promise((ok) => serveur.listen(port, "127.0.0.1", () => ok(serveur)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const s = await demarrerServeur(Number(process.argv[2]) || 5190);
  console.log(`QCM IoT : http://127.0.0.1:${s.address().port}/`);
}
