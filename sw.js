// __CACHE_VERSION__은 배포 시 GitHub Actions(.github/workflows/deploy.yml)가
// 커밋 SHA 짧은 7자리로 자동 치환한다(sw-version-test에서 검증). 수동 증가 불필요.
// TILE_CACHE는 배포와 무관하게 유지되는 별도 캐시라 버전 자동화 대상에서 제외(불필요한 타일 재다운로드 방지).
const CACHE_NAME = "fukuoka-trip-v__CACHE_VERSION__";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./db.js",
  "./data.js",
  "./shared-core/theme.js",
  "./shared-core/popup.js",
  "./shared-core/attachments.js",
  "./shared-core/backup.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
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
  // 여기서 바로 skipWaiting()하지 않고 "대기 중" 상태로 둔다.
  // app.js가 이 상태를 감지해 사용자에게 새로고침 여부를 물어보고,
  // 사용자가 동의했을 때만 아래 message 리스너를 통해 활성화된다.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
