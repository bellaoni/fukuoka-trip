// shared-core/attachments.js
// 첨부 이미지 업로드 전 리사이즈 공용 로직. fukuoka-trip/app.js의
// resizeImageIfNeeded를 그대로 추출(로직 변경 없음). MAX_DIM/QUALITY는 옵션으로 조정 가능.

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.85;

async function resizeImageIfNeeded(file, opts) {
  const maxDim = (opts && opts.maxDim) || DEFAULT_MAX_DIM;
  const quality = (opts && opts.quality) || DEFAULT_QUALITY;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      if (bitmap.close) bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    return file;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { resizeImageIfNeeded };
} else {
  window.SharedCore = window.SharedCore || {};
  window.SharedCore.attachments = { resizeImageIfNeeded };
}
