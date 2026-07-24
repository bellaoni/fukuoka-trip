// shared-core/backup.js
// 백업/복원 공용 유틸(파일 다운로드 트리거, dataURL<->Blob 변환).
// 스토어 목록 구성(notes/checklist/attachments/geocodes/expenses 등)은 앱마다
// 다르므로 이 모듈에 포함하지 않음 — 각 앱의 export/import 핸들러에서 아래
// 유틸을 조합해서 사용한다(fukuoka-trip/app.js 로직과 동일, 변경 없음).

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { blobToDataURL, dataURLToBlob, downloadJSON };
} else {
  window.SharedCore = window.SharedCore || {};
  window.SharedCore.backup = { blobToDataURL, dataURLToBlob, downloadJSON };
}
