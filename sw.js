const CACHE_NAME = "fukuoka-trip-v26";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./db.js",
  "./data.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 지도 타일 전용 캐시. 무한정 쌓이지 않도록 개수 상한을 두고 오래된 것부터 지운다.
const TILE_CACHE = "fukuoka-trip-tiles-v1";
const TILE_LIMIT = 400; // 타일 1개 약 10~15KB → 최대 약 5~6MB 수준으로 제한

function isTileRequest(url) {
  return /^[abc]\.tile\.openstreetmap\.org$/.test(url.hostname);
}

async function trimTileCache() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - TILE_LIMIT;
  if (excess > 0) {
    // Cache.keys()는 대부분의 브라우저에서 삽입 순서를 유지하므로 앞쪽(오래된 것)부터 제거한다.
    await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== TILE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for app shell & fonts, network-first fallback for everything else.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 지도 타일: cache-first + 개수 제한 (LRU에 가깝게 오래된 순 삭제)
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.status === 200) {
            cache.put(req, res.clone());
            trimTileCache();
          }
          return res;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin app files, Google Fonts, Leaflet(cdnjs) 라이브러리 파일을 opportunistically 저장.
          const isFont = url.hostname.includes("fonts.g");
          const isCdnLib = url.hostname === "cdnjs.cloudflare.com";
          if ((url.origin === self.location.origin || isFont || isCdnLib) && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
