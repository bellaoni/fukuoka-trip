(() => {
  "use strict";

  // Bella Travel 아카이브(허브)의 절대경로.
  // GitHub Pages 프로젝트 사이트 기준 "/레포명/" 형태 (도메인 루트 기준이라 사용자명과 무관하게 동작).
  // 허브 레포 이름을 바꾸면 이 값만 수정하면 됨.
  const ARCHIVE_URL = "/bella-travel/";

  const TAG_LABEL = { normal: "일정", food: "맛집", onsen: "온천", shop: "쇼핑" };

  let currentDay = 1;
  let currentItem = null; // 현재 모달에 열려있는 item
  const objectUrls = []; // 생성된 blob object URL 추적 (해제용)

  function revokeObjectUrls() {
    while (objectUrls.length) {
      URL.revokeObjectURL(objectUrls.pop());
    }
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
    } else if (id === "ref-visit-japan-qr") {
      renderQrAttachments();
      document.getElementById("qrCardBackdrop").hidden = false;
    } else if (id === "ref-japanese-phrases") {
      renderPhraseTable();
      document.getElementById("phraseCardBackdrop").hidden = false;
    }
  }
  document.getElementById("transitCardClose").addEventListener("click", () => {
    document.getElementById("transitCardBackdrop").hidden = true;
  });
  document.getElementById("transitCardCloseBottom").addEventListener("click", () => {
    document.getElementById("transitCardBackdrop").hidden = true;
  });
  document.getElementById("transitCardBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "transitCardBackdrop") {
      document.getElementById("transitCardBackdrop").hidden = true;
    }
  });

  // ---------------- Visit Japan Web QR 카드 ----------------
  const QR_ITEM_ID = "ref-visit-japan-qr";
  const qrObjectUrls = [];
  function revokeQrObjectUrls() {
    while (qrObjectUrls.length) {
      URL.revokeObjectURL(qrObjectUrls.pop());
    }
  }
  async function renderQrAttachments() {
    const grid = document.getElementById("qrAttachGrid");
    const attachments = await DB.getAttachments(QR_ITEM_ID);
    grid.innerHTML = "";
    revokeQrObjectUrls();
    attachments.forEach(att => {
      const url = URL.createObjectURL(att.blob);
      qrObjectUrls.push(url);
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
        renderQrAttachments();
      });
      div.appendChild(del);
      div.addEventListener("click", () => openViewer(att, url));
      grid.appendChild(div);
    });
  }
  document.getElementById("qrFileInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      await DB.addAttachment(QR_ITEM_ID, f);
    }
    e.target.value = "";
    renderQrAttachments();
  });
  document.getElementById("qrCardClose").addEventListener("click", () => {
    document.getElementById("qrCardBackdrop").hidden = true;
  });
  document.getElementById("qrCardCloseBottom").addEventListener("click", () => {
    document.getElementById("qrCardBackdrop").hidden = true;
  });
  document.getElementById("qrCardBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "qrCardBackdrop") {
      document.getElementById("qrCardBackdrop").hidden = true;
    }
  });

  // ---------------- 자주쓰는 일본어 카드 ----------------
  function renderPhraseTable() {
    const body = document.getElementById("phraseTableBody");
    body.innerHTML = JAPANESE_PHRASES.map(p => `
      <tr>
        <td>${p.ko}</td>
        <td>${p.ja}</td>
        <td>${p.pron}</td>
      </tr>`).join("");
  }
  document.getElementById("phraseCardClose").addEventListener("click", () => {
    document.getElementById("phraseCardBackdrop").hidden = true;
  });
  document.getElementById("phraseCardCloseBottom").addEventListener("click", () => {
    document.getElementById("phraseCardBackdrop").hidden = true;
  });
  document.getElementById("phraseCardBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "phraseCardBackdrop") {
      document.getElementById("phraseCardBackdrop").hidden = true;
    }
  });

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

  function closeModal() {
    document.getElementById("modalBackdrop").hidden = true;
    currentItem = null;
  }
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCloseBottom").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });

  // 메모 자동저장 (debounce)
  let noteTimer = null;
  document.getElementById("modalNote").addEventListener("input", (e) => {
    if (!currentItem) return;
    const id = currentItem.id;
    const val = e.target.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => DB.setNote(id, val), 400);
  });

  async function renderAttachments(itemId) {
    const grid = document.getElementById("modalAttachGrid");
    const attachments = await DB.getAttachments(itemId);
    grid.innerHTML = "";
    revokeObjectUrls();
    attachments.forEach(att => {
      const url = URL.createObjectURL(att.blob);
      objectUrls.push(url);
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
        renderAttachments(itemId);
      });
      div.appendChild(del);
      div.addEventListener("click", () => openViewer(att, url));
      grid.appendChild(div);
    });
  }

  document.getElementById("modalFileInput").addEventListener("change", async (e) => {
    if (!currentItem) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      await DB.addAttachment(currentItem.id, f);
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
  document.getElementById("viewerClose").addEventListener("click", () => {
    document.getElementById("viewerBackdrop").hidden = true;
  });
  document.getElementById("viewerBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "viewerBackdrop") document.getElementById("viewerBackdrop").hidden = true;
  });

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

  // ---------------- 초기화 ----------------
  renderTimeline();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
