/* =========================================================
   sw.js — Progressive Web App Service Worker
   RTN Backup Group — Meta AI Buy & Sell Marketplace
   Network-First Strategy: Updates automatically upon GitHub changes!
   ========================================================= */

const CACHE_NAME = "rtn-pwa-v3";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./admin/index.html",
  "./product.html",
  "./add-product.html",
  "./my-products.html",
  "./orders.html",
  "./wallet.html",
  "./transactions.html",
  "./profile.html",
  "./dashboard.html",
  "./css/style.css",
  "./js/firebase-config.js",
  "./js/api.js",
  "./js/app.js",
  "./js/pages/home.js",
  "./js/pages/admin.js",
  "./js/pages/product.js",
  "./js/pages/add-product.js",
  "./js/pages/my-products.js",
  "./js/pages/orders.js",
  "./js/pages/wallet.js",
  "./js/pages/transactions.js",
  "./js/pages/profile.js",
  "./js/pages/dashboard.js",
  "./assets/logo.svg",
  "./assets/meta-ai-red.svg",
  "./assets/meta-ai-amber.svg",
  "./assets/meta-ai-emerald.svg",
  "./assets/facebook-aged.svg",
  "./manifest.json"
];

// Install: Cache core assets and immediately activate
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Precache failed for some assets, continuing...", err);
      });
    })
  );
});

// Activate: Clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log("Removing old cache:", k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST for HTML/JS/CSS to ensure auto-updates upon GitHub push
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests from the same origin or CDN fonts/svgs
  if (req.method !== "GET" || (!url.origin.includes(self.location.origin) && !url.origin.includes("fonts.googleapis.com") && !url.origin.includes("fonts.gstatic.com"))) {
    return;
  }

  // Network-First strategy
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is offline or fails
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
      })
  );
});

// Listen for skip waiting messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
