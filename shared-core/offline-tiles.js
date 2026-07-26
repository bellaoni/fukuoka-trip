// shared-core/offline-tiles.js
// 오프라인 지도 타일 미리 받기 공용 로직(버튼 바인딩 + 자동 상태 표시 포함). fukuoka-trip/app.js의
// "오프라인 지도 타일 미리 받기" 섹션을 그대로 추출(로직 변경 없음). 여행지 좌표(geoCoords)·저장 키
// (storageKey)·버튼/상태 엘리먼트 id는 앱마다 다르므로 옵션으로 받는다.
// 자동/대량 다운로드 금지 원칙(master.md 오프라인 우선 설계 원칙)은 그대로 유지 — 사용자가 버튼을
// 누를 때만 1회성으로 캐싱하며, sw.js의 기존 cache-first 타일 캐시를 그대로 재사용한다(중복 캐싱 로직 없음).
//
// 사용 예:
//   SharedCore.offlineTiles.initOfflineTiles({
//     geoCoords: GEO_COORDS,
//     getAllGeocodes: () => DB.getAllGeocodes(),
//     storageKey: "fukuokaTripOfflineTilesState_v1",
//     zooms: [13, 14, 15, 16],
//     radiusM: 750,
//     fetchDelayMs: 300,
//     maxTiles: 2500,
//   });

function deg2tileXY(lat, lng, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return [x, y];
}

function tileKeysAroundPoint(lat, lng, zoom, radiusM) {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const [x1, y1] = deg2tileXY(lat - dLat, lng - dLng, zoom);
  const [x2, y2] = deg2tileXY(lat + dLat, lng + dLng, zoom);
  const keys = [];
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      keys.push(`${zoom}/${x}/${y}`);
    }
  }
  return keys;
}

const TILE_SUBDOMAINS = ["a", "b", "c"];
function tileUrlFromKey(key, subIdx) {
  const [z, x, y] = key.split("/");
  const s = TILE_SUBDOMAINS[subIdx % TILE_SUBDOMAINS.length];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function hashTripPoints(points) {
  return points
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .sort()
    .join("|");
}

function initOfflineTiles(opts) {
  const geoCoords = (opts && opts.geoCoords) || {};
  const getAllGeocodes = (opts && opts.getAllGeocodes) || (async () => ({}));
  const storageKey = (opts && opts.storageKey) || "offlineTilesState_v1";
  const zooms = (opts && opts.zooms) || [13, 14, 15, 16];
  const radiusM = (opts && opts.radiusM) || 750;
  const fetchDelayMs = (opts && opts.fetchDelayMs) || 300;
  const maxTiles = (opts && opts.maxTiles) || 2500;
  const ids = Object.assign({
    btn: "offlineMapBtn",
    redoBtn: "offlineMapRedoBtn",
    cancelBtn: "offlineMapCancelBtn",
    status: "offlineMapStatus",
  }, opts && opts.ids);

  // GEO_COORDS(확정본) + 기기에 저장된 지오코딩 캐시(수동/자동 확정분, 실패기록 제외) 합산
  async function collectTripPoints() {
    const points = Object.values(geoCoords);
    const cached = await getAllGeocodes();
    Object.values(cached).forEach((rec) => {
      if (rec && !rec.failed) points.push({ lat: rec.lat, lng: rec.lng });
    });
    return points;
  }

  function loadOfflineTileState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveOfflineTileState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {}
  }

  // 저장된 상태와 현재 여행지 좌표가 일치하면 기본 버튼을 숨기고 "다시 받기"만 노출한다.
  // 반환값: 현재 상태가 최신(이미 다 받아둠)인지 여부
  function applyOfflineMapButtonState(hash) {
    const btn = document.getElementById(ids.btn);
    const redoBtn = document.getElementById(ids.redoBtn);
    if (!btn || !redoBtn) return false;
    const saved = loadOfflineTileState();
    const isUpToDate = !!saved && saved.pointsHash === hash;
    btn.hidden = isUpToDate;
    redoBtn.hidden = !isUpToDate;
    return isUpToDate;
  }

  let offlinePrefetchRunning = false;
  let offlinePrefetchCancelled = false;

  async function startOfflineTilePrefetch() {
    if (offlinePrefetchRunning) return;
    const btn = document.getElementById(ids.btn);
    const redoBtn = document.getElementById(ids.redoBtn);
    const cancelBtn = document.getElementById(ids.cancelBtn);
    const statusEl = document.getElementById(ids.status);
    if (!btn || !statusEl) return;

    const points = await collectTripPoints();
    const hash = hashTripPoints(points);
    const keySet = new Set();
    points.forEach((p) => {
      zooms.forEach((z) => {
        tileKeysAroundPoint(p.lat, p.lng, z, radiusM).forEach((k) => keySet.add(k));
      });
    });
    const keys = [...keySet];

    if (!keys.length) {
      statusEl.textContent = "받을 지도 범위를 찾지 못했어요.";
      statusEl.hidden = false;
      return;
    }
    if (keys.length > maxTiles) {
      statusEl.textContent = `범위가 너무 넓어요(${keys.length}개). 벌크 다운로드 방지를 위해 중단했어요.`;
      statusEl.hidden = false;
      return;
    }

    offlinePrefetchRunning = true;
    offlinePrefetchCancelled = false;
    btn.disabled = true;
    if (redoBtn) redoBtn.hidden = true;
    cancelBtn.hidden = false;
    statusEl.hidden = false;
    let done = 0;
    let failed = 0;

    for (let i = 0; i < keys.length; i++) {
      if (offlinePrefetchCancelled) break;
      statusEl.textContent = `타일 받는 중... (${done}/${keys.length})`;
      try {
        await fetch(tileUrlFromKey(keys[i], i));
      } catch (e) {
        failed++;
      }
      done++;
      if (i < keys.length - 1) {
        await new Promise((r) => setTimeout(r, fetchDelayMs));
      }
    }

    offlinePrefetchRunning = false;
    btn.disabled = false;
    cancelBtn.hidden = true;
    if (offlinePrefetchCancelled) {
      statusEl.textContent = `취소했어요. (${done}/${keys.length}개 받음)`;
      applyOfflineMapButtonState(hash);
    } else if (failed) {
      statusEl.textContent = `⚠️ 완료 (${done - failed}/${keys.length}개, ${failed}개 실패 — 네트워크 상태를 확인해 주세요. 실패한 타일이 있어 다음에 다시 받아야 할 수 있어요)`;
      applyOfflineMapButtonState(hash);
    } else {
      saveOfflineTileState({ pointsHash: hash, tileCount: keys.length, savedAt: Date.now() });
      applyOfflineMapButtonState(hash);
      statusEl.textContent = `✅ 오프라인 지도 준비 완료 (${keys.length}개 타일) — 이미 저장돼 있어서, 이 화면을 다시 열거나 온라인으로 돌아와도 버튼을 다시 누를 필요 없어요.`;
    }
  }

  document.getElementById(ids.btn)?.addEventListener("click", startOfflineTilePrefetch);
  document.getElementById(ids.redoBtn)?.addEventListener("click", startOfflineTilePrefetch);
  document.getElementById(ids.cancelBtn)?.addEventListener("click", () => {
    offlinePrefetchCancelled = true;
  });

  // 화면 진입 시 기존 저장 상태를 확인해, 이미 받아둔 상태면 기본 버튼을 숨기고
  // "다시 받기"+상태 문구로 안내한다(재연결 후 안내문구가 사라져 다시 눌러야 하는지
  // 헷갈리는 문제 방지). 여행지 좌표가 바뀐 경우에만 기본 버튼이 다시 나타난다.
  (async function initOfflineMapUI() {
    const btn = document.getElementById(ids.btn);
    const redoBtn = document.getElementById(ids.redoBtn);
    const statusEl = document.getElementById(ids.status);
    if (!btn || !redoBtn || !statusEl) return;
    const points = await collectTripPoints();
    const hash = hashTripPoints(points);
    const saved = loadOfflineTileState();
    const isUpToDate = applyOfflineMapButtonState(hash);
    if (isUpToDate && saved) {
      const dateStr = new Date(saved.savedAt).toLocaleDateString("ko-KR");
      statusEl.hidden = false;
      statusEl.textContent = `✅ 오프라인 지도 저장됨 (${dateStr} 기준, 타일 ${saved.tileCount}개). 새 장소가 추가되면 다시 받기가 나타나요.`;
    } else if (saved && !isUpToDate) {
      statusEl.hidden = false;
      statusEl.textContent = "여행지 정보가 바뀌어서 오프라인 지도를 다시 받아야 해요.";
    }
  })();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initOfflineTiles, deg2tileXY, tileKeysAroundPoint, hashTripPoints, tileUrlFromKey };
} else {
  window.SharedCore = window.SharedCore || {};
  window.SharedCore.offlineTiles = { initOfflineTiles };
}
