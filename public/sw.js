// Service worker mínimo de SeguAlaFija.
// - Navegación: siempre a la red; sin conexión muestra offline.html.
// - Solo se guardan en caché los archivos estáticos con hash (/_next/static) y
//   los íconos. Nunca páginas, cotizaciones, API ni datos personales.
// Cambia VERSION para invalidar la caché.
const VERSION = "saf-v1";
const OFFLINE_URL = new URL("offline.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin && (url.pathname.includes("/_next/static/") || /\/icon[-\w]*\.(png|svg)$/.test(url.pathname));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  const url = new URL(request.url);
  if (!isStaticAsset(url)) return;
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
