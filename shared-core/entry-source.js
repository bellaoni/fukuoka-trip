// shared-core/entry-source.js
// Bella Travel 허브를 거쳐 들어왔는지 판별하는 공용 로직. fukuoka-trip/app.js의
// "진입 경로 확인" IIFE를 그대로 추출(로직 변경 없음). archiveUrl/storageKey/homeBtnId는
// 옵션으로 조정 가능. 판별 결과에 따른 화면 요소 노출(가계부 아코디언 등)은 앱마다 다르므로
// 이 모듈에 포함하지 않음 — 반환된 isArchiveEntry 값을 각 앱이 그대로 사용한다.
//
// 사용 예:
//   const isArchiveEntry = SharedCore.entrySource.initEntrySource({ archiveUrl: ARCHIVE_URL });
//   if (isArchiveEntry) { ... }

function initEntrySource(opts) {
  const archiveUrl = (opts && opts.archiveUrl) || "/";
  const storageKey = (opts && opts.storageKey) || "bella-entry-source";
  const homeBtnId = (opts && opts.homeBtnId) || "homeBtn";

  const params = new URLSearchParams(location.search);
  const source = params.get("source");
  if (source) {
    try { sessionStorage.setItem(storageKey, source); } catch (e) {}
    // 주소창에서 파라미터를 지워 링크가 지저분해 보이지 않게 함 (세션 플래그로 상태 유지)
    params.delete("source");
    const cleanUrl = location.pathname + (params.toString() ? `?${params}` : "") + location.hash;
    history.replaceState(null, "", cleanUrl);
  }
  let entrySource = null;
  try { entrySource = sessionStorage.getItem(storageKey); } catch (e) {}
  const isArchiveEntry = entrySource === "archive";

  const homeBtn = document.getElementById(homeBtnId);
  if (isArchiveEntry) {
    homeBtn.hidden = false;
    homeBtn.addEventListener("click", () => { location.href = archiveUrl; });
  }
  return isArchiveEntry;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initEntrySource };
} else {
  window.SharedCore = window.SharedCore || {};
  window.SharedCore.entrySource = { initEntrySource };
}
