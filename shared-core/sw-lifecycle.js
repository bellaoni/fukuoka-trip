// shared-core/sw-lifecycle.js
// 서비스워커 등록 + 업데이트 알림 토스트 공용 로직. fukuoka-trip/app.js의
// showUpdateToast/서비스워커 등록 블록을 그대로 추출(로직 변경 없음). swPath만 옵션으로 조정 가능.
// (참고) "앱 설치" 배너(beforeinstallprompt/appinstalled)는 이 모듈 범위에 포함하지 않음 — 각 앱에 유지.
//
// 사용 예:
//   SharedCore.swLifecycle.initServiceWorker();
//   // sw.js 경로가 다르면: SharedCore.swLifecycle.initServiceWorker({ swPath: "sw.js" })

function showUpdateToast(reg) {
  let toast = document.getElementById("swUpdateToast");
  if (toast) { toast.hidden = false; return; }
  toast = document.createElement("div");
  toast.id = "swUpdateToast";
  toast.className = "sw-update-toast";
  toast.innerHTML = `<span>새 버전이 있어요</span><button type="button" id="swUpdateBtn">새로고침</button>`;
  document.body.appendChild(toast);
  toast.querySelector("#swUpdateBtn").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    toast.hidden = true;
  });
}

function initServiceWorker(opts) {
  const swPath = (opts && opts.swPath) || "sw.js";
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(swPath).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg);
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // controller가 이미 있다는 건 "새로 설치"가 아니라 "업데이트"라는 뜻
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        });
      });
    }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { showUpdateToast, initServiceWorker };
} else {
  window.SharedCore = window.SharedCore || {};
  window.SharedCore.swLifecycle = { showUpdateToast, initServiceWorker };
}
