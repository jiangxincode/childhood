/**
 * Service Worker for 童年游戏合集.
 *
 * Caching strategy
 *   - HTML / navigation requests : network-first, fall back to cache, then offline shell.
 *   - Same-origin static assets  : stale-while-revalidate (cache hit served immediately,
 *                                  cache refreshed in the background).
 *   - Cross-origin requests      : passed through to the network, never cached.
 *
 * Versioning
 *   Bump VERSION below to invalidate every previous cache. The `activate` handler
 *   removes any cache whose key starts with "childhood-" but is not the current one.
 *
 * Kill switch
 *   Open any page with ?nosw=1 once. The bootstrap in js/common.js will unregister
 *   every service worker and wipe every cache for this origin.
 */

// Bump this string to ship a new cache. Keep it short and unique.
const VERSION = "2026-05-23-1";
const CACHE_NAME = `childhood-${VERSION}`;

// App shell precache: only the global resources used by every page.
// Per-game pages and assets are cached on demand at runtime.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/normalize.css",
  "./css/jquery-yys-slider.css",
  "./css/index.css",
  "./js/common.js",
  "./js/jquery-yys-slider.js",
  "./js/base-fix.js",
  "./images/logo.svg",
  "./images/logo-icon.svg",
  "./images/pwa-icon.svg",
  "./images/pwa-icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Use Promise.all + per-item catch so one missing asset
      // does not abort the whole install step.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch((err) => console.warn("[SW] precache failed:", url, err))
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Drop caches from previous versions.
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith("childhood-") && k !== CACHE_NAME)
              .map((k) => caches.delete(k))
          )
        ),
      // Take control of already-open pages without forcing a reload.
      self.clients.claim(),
    ])
  );
});

// Allow the page to ask the waiting worker to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only intercept GET; let POST / PUT / etc. go straight to the network.
  if (req.method !== "GET") return;

  // Parse URL safely, then skip cross-origin (CDN, analytics, ...).
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Never intercept the SW file itself.
  if (url.pathname.endsWith("/sw.js")) return;

  const accept = req.headers.get("accept") || "";
  const isHtml =
    req.mode === "navigate" ||
    accept.includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/");

  if (isHtml) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

/**
 * Network-first: try network, fall back to cache, then to a generic offline
 * response. Suitable for HTML so users always see fresh content when online.
 */
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200 && fresh.type === "basic") {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last-resort fallback: site shell.
    const shell = await cache.match("./index.html");
    if (shell) return shell;
    return new Response("<h1>当前离线</h1><p>请检查网络连接后重试。</p>", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/**
 * Stale-while-revalidate: serve from cache immediately, refresh the cache in
 * the background. Suitable for CSS / JS / images / fonts.
 */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
