(() => {
  "use strict";

  // Bella Travel 아카이브(허브)의 절대경로.
  // GitHub Pages 프로젝트 사이트 기준 "/레포명/" 형태 (도메인 루트 기준이라 사용자명과 무관하게 동작).
  // 허브 레포 이름을 바꾸면 이 값만 수정하면 됨.
  const ARCHIVE_URL = "/bella-travel/";

  const TAG_LABEL = { normal: "일정", food: "맛집", onsen: "온천", shop: "쇼핑" };

  let currentDay = 1;
  let currentItem = null; // 현재 모달에 열려있는 item
  const objectUrls = []; // 상세 모달 첨부용 blob object URL 추적 (해제용)

  // ---------------- 공용: 팝업 카드 닫기 바인딩 ----------------
  // "{prefix}Backdrop" / "{prefix}Close" / "{prefix}CloseBottom" 이라는 id 규칙만 지키면
  // 어떤 팝업(모달/뷰어/각종 참고정보 카드)이든 닫기 버튼 3종(상단 X · 하단 버튼 · 배경 클릭)을
  // 한 줄로 연결해준다. CloseBottom 버튼이 없는 팝업(예: 뷰어)은 자동으로 건너뛴다.
  // onClose: 배경 hidden 처리 외에 추가로 정리할 상태가 있을 때만 넘기면 됨 (예: currentItem 리셋)
  function bindCardClose(prefix, onClose) {
    const backdrop = document.getElementById(prefix + "Backdrop");
    if (!backdrop) return;
    const doClose = () => {
      backdrop.hidden = true;
      if (onClose) onClose();
    };
    const closeBtn = document.getElementById(prefix + "Close");
    if (closeBtn) closeBtn.addEventListener("click", doClose);
    const bottomBtn = document.getElementById(prefix + "CloseBottom");
    if (bottomBtn) bottomBtn.addEventListener("click", doClose);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) doClose();
    });
  }

  // ---------------- 공용: 첨부 이미지 업로드 전 리사이즈 ----------------
  // 아이폰 카메라 원본(장당 3~8MB)을 그대로 저장하면 기기 용량과 백업 파일 크기가 금방 커지므로,
  // 긴 변 기준 MAX_DIM을 넘는 이미지는 캔버스로 축소한 뒤 JPEG로 재압축해서 저장한다.
  // - PDF 등 이미지가 아닌 파일은 그대로 통과
  // - GIF는 리사이즈 시 애니메이션이 깨지므로 원본 유지
  // - createImageBitmap 미지원 등 예외 상황에서는 원본 파일을 그대로 반환 (기능 저하 없이 안전하게 폴백)
  const RESIZE_MAX_DIM = 1600;
  const RESIZE_QUALITY = 0.85;
  async function resizeImageIfNeeded(file) {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, RESIZE_MAX_DIM / Math.max(bitmap.width, bitmap.height));
      if (scale >= 1) {
        if (bitmap.close) bitmap.close();
        return file; // 이미 충분히 작음
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (bitmap.close) bitmap.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", RESIZE_QUALITY));
      if (!blob) return file;
      const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
      return new File([blob], newName, { type: "image/jpeg" });
    } catch (e) {
      return file; // 리사이즈 실패 시 원본 그대로 저장 (안전한 폴백)
    }
  }

  // 첨부(사진/PDF) 그리드 렌더링 공용 함수.
  // 상세 모달, Visit Japan Web QR 카드 등 첨부가 필요한 곳 어디서든 재사용.
  // gridId: 그릴 대상 그리드 엘리먼트 id
  // itemId: DB에 저장된 첨부의 소속 id
  // urlStore: 이 그리드가 생성한 object URL을 추적/해제하기 위한 배열(호출부마다 별도로 준비)
  async function renderAttachmentGrid(gridId, itemId, urlStore) {
    const grid = document.getElementById(gridId);
    const attachments = await DB.getAttachments(itemId);
    grid.innerHTML = "";
    while (urlStore.length) {
      URL.revokeObjectURL(urlStore.pop());
    }
    attachments.forEach(att => {
      const url = URL.createObjectURL(att.blob);
      urlStore.push(url);
      const div = document.createElement("div");
      div.className = "attach-thumb";
      if (att.type.startsWith("image/")) {
        div.innerHTML = `<img src="${url}" alt="${att.name}">`;
      } else {
        div.innerHTML = `<div class="pdf-badge">📄<br>${att.name}</div>`;
      }
      const del = document.createElement("button");
      del.className = "del-attach";
      del.textContent = "✕";
      del.addEventListener("click", async (e) => {
        e.stopPropagation();
        await DB.deleteAttachment(att.id);
        renderAttachmentGrid(gridId, itemId, urlStore);
      });
      div.appendChild(del);
      div.addEventListener("click", () => openViewer(att, url));
      grid.appendChild(div);
    });
  }

  // ---------------- 뷰 전환 ----------------
  function switchView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + view).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.view === view);
    });
    if (view === "book") renderBook();
    if (view === "checklist") renderChecklist();
    if (view === "map") renderMap();
  }

  function switchDay(day) {
    currentDay = day;
    document.querySelectorAll(".day-tab").forEach(t => {
      t.classList.toggle("active", Number(t.dataset.day) === day);
    });
    renderTimeline();
  }

  // ---------------- 타임라인 ----------------
  function renderTimeline() {
    const el = document.getElementById("timeline");
    const items = ITEMS.filter(i => i.day === currentDay);
    el.innerHTML = items.map(itemCardHtml).join("");
    el.querySelectorAll(".tl-item").forEach(node => {
      node.querySelector(".tl-card").addEventListener("click", () => openModal(node.dataset.id));
    });
  }

  function itemCardHtml(item) {
    return `
      <div class="tl-item" data-id="${item.id}">
        <div class="tl-time-dot"><span class="dot"></span></div>
        <button class="tl-card tag-${item.tag}" type="button">
          <div class="tl-card-head">
            <h3>${item.title}</h3>
            <span class="tl-tag">${TAG_LABEL[item.tag] || ""}</span>
          </div>
          ${item.desc ? `<p class="desc">${item.desc}</p>` : ""}
          ${item.remark ? `<p class="remark">📝 ${item.remark}</p>` : ""}
          <div class="meta-row"><span>⏰ ${item.time}</span></div>
        </button>
      </div>`;
  }

  // ---------------- 예약 ----------------
  function renderBook() {
    const el = document.getElementById("bookPanel");
    let html = "";

    html += `<div class="book-card"><h3>🏨 숙소</h3>
      <div class="book-row"><span class="k">숙소명</span><span class="v">${TRIP.hotel}</span></div>
      <div class="book-row"><span class="k">체크인</span><span class="v">2026-08-02</span></div>
      <div class="book-row"><span class="k">체크아웃</span><span class="v">2026-08-04</span></div>
    </div>`;

    TRIP.flights.forEach((f) => {
      html += `<div class="book-card"><h3>✈️ ${f.route}</h3>
        <div class="book-row"><span class="k">날짜</span><span class="v">${f.date}</span></div>
        <div class="book-row"><span class="k">출발</span><span class="v">${f.dep}</span></div>
        <div class="book-row"><span class="k">도착</span><span class="v">${f.arr}</span></div>
        <div class="book-row"><span class="k">편명</span><span class="v">${f.code}</span></div>
      </div>`;
    });

    el.innerHTML = html;
  }

  // ITEMS에 없는 id로 모달을 열 때(예: 향후 자유메모 항목) 빈 값으로 대체
  function resolveItem(id) {
    const found = ITEMS.find(i => i.id === id);
    if (found) return found;
    return { id, title: "메모", desc: "", mapQuery: "", time: "", remark: "" };
  }

  // ---------------- 체크리스트 ----------------
  async function renderChecklist() {
    const list = await DB.getChecklist();
    const el = document.getElementById("checklistList");
    el.innerHTML = list.map((it, idx) => `
      <li class="${it.done ? "done" : ""}" data-idx="${idx}">
        <input type="checkbox" ${it.done ? "checked" : ""}>
        <span>${it.text}</span>
        <button class="del" aria-label="삭제">삭제</button>
      </li>`).join("");

    el.querySelectorAll("li").forEach(li => {
      const idx = Number(li.dataset.idx);
      li.querySelector("input").addEventListener("change", async (e) => {
        const l = await DB.getChecklist();
        l[idx].done = e.target.checked;
        await DB.setChecklist(l);
        renderChecklist();
      });
      li.querySelector(".del").addEventListener("click", async () => {
        const l = await DB.getChecklist();
        l.splice(idx, 1);
        await DB.setChecklist(l);
        renderChecklist();
      });
    });

    const refEl = document.getElementById("refList");
    if (refEl) {
      refEl.innerHTML = REFERENCE_ITEMS.map(r => `
        <li><span>${r.title}</span>
          <button class="btn-ghost small" data-ref="${r.id}">보기</button>
        </li>`).join("");
      refEl.querySelectorAll("[data-ref]").forEach(btn => {
        btn.addEventListener("click", () => openReferenceCard(btn.dataset.ref));
      });
    }
  }

  document.getElementById("checklistForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("checklistInput");
    const text = input.value.trim();
    if (!text) return;
    const list = await DB.getChecklist();
    list.push({ text, done: false });
    await DB.setChecklist(list);
    input.value = "";
    renderChecklist();
  });

  function openReferenceCard(id) {
    if (id === "ref-airport-station") {
      document.getElementById("transitCardBackdrop").hidden = false;
    } else if (id === "ref-japanese-phrases") {
      renderPhraseTable();
      document.getElementById("phraseCardBackdrop").hidden = false;
    } else if (id === "ref-shopping-stores") {
      renderStoreTable();
      document.getElementById("storeCardBackdrop").hidden = false;
    } else if (id === "ref-shopping-list") {
      renderShoppingList();
      document.getElementById("shoppingCardBackdrop").hidden = false;
    } else if (id === "ref-food-list") {
      renderFoodList();
      document.getElementById("foodCardBackdrop").hidden = false;
    }
  }
  // ---------------- Visit Japan Web QR 카드 (준비물 아래 고정 퀵카드에서 오픈) ----------------
  const QR_ITEM_ID = "ref-visit-japan-qr";
  const qrObjectUrls = [];
  function renderQrAttachments() {
    return renderAttachmentGrid("qrAttachGrid", QR_ITEM_ID, qrObjectUrls);
  }
  document.getElementById("qrQuickBtn").addEventListener("click", () => {
    renderQrAttachments();
    document.getElementById("qrCardBackdrop").hidden = false;
  });
  document.getElementById("qrFileInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      const resized = await resizeImageIfNeeded(f);
      await DB.addAttachment(QR_ITEM_ID, resized);
    }
    e.target.value = "";
    renderQrAttachments();
  });

  // ---------------- 자주쓰는 일본어 카드 ----------------
  function renderPhraseTable() {
    const body = document.getElementById("phraseTableBody");
    let html = "";
    let lastCategory = null;
    JAPANESE_PHRASES.forEach(p => {
      if (p.category && p.category !== lastCategory) {
        html += `<tr class="phrase-cat"><td colspan="3">${p.category}</td></tr>`;
        lastCategory = p.category;
      }
      html += `<tr><td>${p.ko}</td><td>${p.ja}</td><td>${p.pron}</td></tr>`;
    });
    body.innerHTML = html;
  }
  // ---------------- 참고정보 공용: 지도 링크 생성 ----------------
  // mapQuery(검색어 문자열)만 있으면 어디서든 재사용 가능 (상세 모달의 modalMapLink와 동일한 방식)
  function mapLinkHtml(query) {
    if (!query) return "";
    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
    return `<a class="map-link map-link-inline" href="${url}" target="_blank" rel="noopener" aria-label="지도에서 보기">📍</a>`;
  }

  // ---------------- 쇼핑 추천 매장 카드 (표) ----------------
  function renderStoreTable() {
    const body = document.getElementById("storeTableBody");
    body.innerHTML = SHOPPING_STORES.map(s => `
      <tr>
        <td data-label="매장">
          <div class="store-name-cell">
            ${s.image ? `<img class="item-thumb" src="${s.image}" alt="">` : ""}
            <span>${s.name}</span>
          </div>
        </td>
        <td data-label="위치">${s.area} ${mapLinkHtml(s.mapQuery)}</td>
        <td data-label="영업시간">${s.hours || "-"}</td>
        <td data-label="추천 상품">${s.recommend}</td>
      </tr>`).join("");
  }
  // ---------------- 쇼핑리스트 / 꼭 먹어야 할 음식 공용 렌더러 ----------------
  // groups: [{ group, items: [{ title, desc, mapQuery, image }] }] 형태를 그대로 렌더링.
  // 같은 구조를 쓰기 때문에 다른 여행에서도 SHOPPING_LIST / FOOD_LIST 데이터만 바꾸면 재사용 가능.
  function renderGroupedList(groups, containerId) {
    const el = document.getElementById(containerId);
    el.innerHTML = groups.map((g, gi) => `
      ${gi > 0 ? '<hr class="washi-divider">' : ""}
      <h3>${g.group}</h3>
      <ul class="item-list">
        ${g.items.map(it => `
          <li>
            ${it.image ? `<img class="item-thumb" src="${it.image}" alt="">` : ""}
            <div class="item-content">
              <div class="item-line">
                <span class="item-title">${it.title}</span>
                ${mapLinkHtml(it.mapQuery)}
              </div>
              <p class="item-desc">${it.desc}</p>
            </div>
          </li>`).join("")}
      </ul>`).join("");
  }
  function renderShoppingList() { renderGroupedList(SHOPPING_LIST, "shoppingListBody"); }
  function renderFoodList() { renderGroupedList(FOOD_LIST, "foodListBody"); }

  // ---------------- 지도 (모두에게 동일 - data.js의 TRIP.mapEmbedUrl 고정 사용) ----------------
  function renderMap() {
    const iframe = document.getElementById("mapIframe");
    if (TRIP.mapEmbedUrl) iframe.src = TRIP.mapEmbedUrl;
  }

  // ---------------- 상세 모달 ----------------
  async function openModal(id) {
    const item = resolveItem(id);
    currentItem = item;

    document.getElementById("modalTime").textContent = item.time || "메모";
    document.getElementById("modalTime").style.display = item.time ? "" : "none";
    document.getElementById("modalTitle").textContent = item.title;
    document.getElementById("modalSubtitle").textContent =
      [item.desc, item.remark].filter(Boolean).join(" · ");

    const mapLink = document.getElementById("modalMapLink");
    if (item.mapQuery) {
      mapLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.mapQuery);
      mapLink.style.display = "";
    } else {
      mapLink.style.display = "none";
    }

    const note = await DB.getNote(item.id);
    document.getElementById("modalNote").value = note;

    await renderAttachments(item.id);

    document.getElementById("modalBackdrop").hidden = false;
  }

  // 메모 자동저장 (debounce)
  let noteTimer = null;
  document.getElementById("modalNote").addEventListener("input", (e) => {
    if (!currentItem) return;
    const id = currentItem.id;
    const val = e.target.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => DB.setNote(id, val), 400);
  });

  function renderAttachments(itemId) {
    return renderAttachmentGrid("modalAttachGrid", itemId, objectUrls);
  }

  document.getElementById("modalFileInput").addEventListener("change", async (e) => {
    if (!currentItem) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      const resized = await resizeImageIfNeeded(f);
      await DB.addAttachment(currentItem.id, resized);
    }
    e.target.value = "";
    renderAttachments(currentItem.id);
  });

  // ---------------- 첨부파일 뷰어 팝업 ----------------
  function openViewer(att, url) {
    const content = document.getElementById("viewerContent");
    if (att.type.startsWith("image/")) {
      content.innerHTML = `<img src="${url}" alt="${att.name}">`;
    } else if (att.type === "application/pdf") {
      content.innerHTML = `<iframe src="${url}"></iframe>`;
    } else {
      content.innerHTML = `<p style="color:#fff">미리보기를 지원하지 않는 파일이에요.</p>`;
    }
    document.getElementById("viewerBackdrop").hidden = false;
  }
  // ---------------- 네비게이션 바인딩 ----------------
  document.getElementById("dayTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".day-tab");
    if (btn) switchDay(Number(btn.dataset.day));
  });
  document.getElementById("bottomNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (btn) switchView(btn.dataset.view);
  });

  // ---------------- 다크모드 ----------------
  const THEME_KEY = "fukuoka-trip-theme";
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try { localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch (e) {}
    const meta = document.getElementById("themeColorMeta");
    if (meta) meta.setAttribute("content", isDark ? "#1E1B18" : "#3D5A6C");
  }
  const darkModeToggle = document.getElementById("darkModeToggle");
  darkModeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(darkModeToggle.checked); // theme-color 메타를 현재 상태와 동기화
  darkModeToggle.addEventListener("change", (e) => applyTheme(e.target.checked));

  // ---------------- 데이터 백업 / 복원 ----------------
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

  function showBackupStatus(msg) {
    const el = document.getElementById("backupStatus");
    el.textContent = msg;
    el.hidden = false;
  }

  document.getElementById("exportBtn").addEventListener("click", async () => {
    const btn = document.getElementById("exportBtn");
    btn.disabled = true;
    try {
      const [notes, checklist, rawAttachments] = await Promise.all([
        DB.getAllNotes(),
        DB.getChecklist(),
        DB.getAllAttachments()
      ]);
      const attachments = await Promise.all(rawAttachments.map(async (a) => ({
        id: a.id,
        itemId: a.itemId,
        name: a.name,
        type: a.type,
        createdAt: a.createdAt,
        dataUrl: await blobToDataURL(a.blob)
      })));
      const payload = {
        app: "fukuoka-trip-pwa",
        version: 1,
        exportedAt: new Date().toISOString(),
        notes, checklist, attachments
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fukuoka-trip-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showBackupStatus(`✅ 내보내기 완료 (${new Date().toLocaleString("ko-KR")})`);
    } catch (err) {
      showBackupStatus("⚠️ 내보내기에 실패했어요. 다시 시도해 주세요.");
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("importFileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!confirm("백업 파일을 불러오면 현재 저장된 메모·사진·체크리스트 위에 덮어써요. 계속할까요?")) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || payload.app !== "fukuoka-trip-pwa") {
        showBackupStatus("⚠️ 이 앱의 백업 파일이 아니에요.");
        return;
      }

      for (const [itemId, noteText] of Object.entries(payload.notes || {})) {
        await DB.setNote(itemId, noteText);
      }
      if (Array.isArray(payload.checklist)) {
        await DB.setChecklist(payload.checklist);
      }
      for (const att of payload.attachments || []) {
        const blob = await dataURLToBlob(att.dataUrl);
        await DB.putAttachmentRaw({
          id: att.id, itemId: att.itemId, name: att.name,
          type: att.type, blob, createdAt: att.createdAt
        });
      }

      showBackupStatus(`✅ 가져오기 완료 (${new Date().toLocaleString("ko-KR")})`);
      renderChecklist();
      if (currentItem) await renderAttachments(currentItem.id);
    } catch (err) {
      showBackupStatus("⚠️ 가져오기에 실패했어요. 올바른 백업 파일인지 확인해 주세요.");
    }
  });

  // ---------------- 진입 경로 확인 (Bella Travel 아카이브 연동) ----------------
  // 아카이브 카드 클릭 시 ?source=archive 로 진입 → 세션 동안 "홈(← Bella Travel)" 버튼 표시.
  // 동행자에게 공유하는 링크(파라미터 없음)로 직접 접속하면 버튼이 보이지 않는다.
  // sessionStorage는 path가 아닌 origin(도메인) 단위로 공유되므로, fukuoka-trip과 bella-travel이
  // 서로 다른 레포(다른 project page)라도 같은 username.github.io 도메인이면 정상 동작한다.
  const ENTRY_KEY = "bella-entry-source";
  (function initEntrySource() {
    const params = new URLSearchParams(location.search);
    const source = params.get("source");
    if (source) {
      try { sessionStorage.setItem(ENTRY_KEY, source); } catch (e) {}
      // 주소창에서 파라미터를 지워 링크가 지저분해 보이지 않게 함 (세션 플래그로 상태 유지)
      params.delete("source");
      const cleanUrl = location.pathname + (params.toString() ? `?${params}` : "") + location.hash;
      history.replaceState(null, "", cleanUrl);
    }
    let entrySource = null;
    try { entrySource = sessionStorage.getItem(ENTRY_KEY); } catch (e) {}
    const homeBtn = document.getElementById("homeBtn");
    if (entrySource === "archive") {
      homeBtn.hidden = false;
      homeBtn.addEventListener("click", () => { location.href = ARCHIVE_URL; });
    }
  })();

  // ---------------- 팝업 닫기 일괄 바인딩 ----------------
  bindCardClose("modal", () => { currentItem = null; });
  bindCardClose("viewer");
  bindCardClose("transitCard");
  bindCardClose("qrCard");
  bindCardClose("phraseCard");
  bindCardClose("storeCard");
  bindCardClose("shoppingCard");
  bindCardClose("foodCard");

  // ---------------- 초기화 ----------------
  renderTimeline();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
