// Service Worker der Stimmcoach-App: alle App-Dateien liegen nach dem ersten Laden am Gerät (offline).
// Er lädt nur vom eigenen Ursprung und speichert keine Stücke – die bleiben in der App-Datenbank am Gerät.
const CACHE = "stimmcoach-31c285710331";
const DATEIEN = ["./","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-192.png","icons/maskable-512.png","index.html","labor.js","manifest.webmanifest","vendor/klavier.js","vendor/opensheetmusicdisplay.min.js","vendor/verovio-toolkit-wasm.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("stimmcoach-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (e) => { if (e.data === "aktualisieren") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Paket über „Teilen“ (Android): Datei kurz ablegen, die App holt sie beim Start ab
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/teilen")) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const f = fd.getAll("paket").find((x) => x && typeof x === "object");
        if (f) await (await caches.open("vsc-geteilt")).put("geteilt", new Response(f, { headers: { "x-name": encodeURIComponent(f.name || "geteilt.vsc") } }));
      } catch (_) {}
      return Response.redirect("./?geteilt=1", 303);
    })());
    return;
  }
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const treffer = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("./") : null);
      return treffer || fetch(req);
    }),
  );
});
