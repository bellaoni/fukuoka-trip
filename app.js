(() => {
  "use strict";

  const TAG_LABEL = { normal: "일정", food: "맛집", onsen: "온천", shop: "쇼핑" };

  let currentDay = 1;
  let currentItem = null; // 현재 모달에 열려있는 item
  const objectUrls = []; // 정리용

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
          <div class="meta-row"><span>⏰ ${item.time}</span></div>
        </button>
      </div>`;
  }

  // ---------------- 예약함 ----------------
  function renderBook() {
    const el = document.getElementById("bookPanel");
    let html = "";

    html += `<div class="book-card"><h3>🏨 숙소</h3>
      <div class="book-row"><span class="k">숙소명</span><span class="v">${TRIP.hotel}</span></div>
      <div class="book-row"><span class="k">체크인</span><span class="v">2026-08-02</span></div>
      <div class="book-row"><span class="k">체크아웃</span><span class="v">2026-08-04</span></div>
      <button class="btn-ghost small" data-open="ref-hotel">바우처 · 메모 보기</button>
    </div>`;

    TRIP.flights.forEach((f, idx) => {
      html += `<div class="book-card"><h3>✈️ ${f.route}</h3>
        <div class="book-row"><span class="k">날짜</span><span class="v">${f.date}</span></div>
        <div class="book-row"><span class="k">출발</span><span class="v">${f.dep}</span></div>
        <div class="book-row"><span class="k">도착</span><span class="v">${f.arr}</span></div>
        <div class="book-row"><span class="k">편명</span><span class="v">${f.code}</span></div>
        <button class="btn-ghost small" data-open="ref-flight-${idx}">예약확인서 · 메모 보기</button>
      </div>`;
    });

    html += `<div class="book-card"><h3>📎 참고 정보</h3>`;
    REFERENCE_ITEMS.forEach(r => {
      html += `<div class="book-row"><span class="k">${r.title}</span>
        <button class="btn-ghost small" data-open="${r.id}">보기</button></div>`;
    });
    html += `</div>`;

    el.innerHTML = html;
    el.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => openModal(btn.dataset.open));
    });
  }

  // 예약함 전용 가상 item 생성 (ITEMS에 없는 id 처리)
  function resolveItem(id) {
    const found = ITEMS.find(i => i.id === id);
    if (found) return found;
    if (id === "ref-hotel") {
      return { id, title: TRIP.hotel, desc: "숙소 바우처, 체크인 정보 등을 메모/첨부해두세요.", mapQuery: TRIP.hotel, time: "" };
    }
    const flightIdx = id.startsWith("ref-flight-") ? Number(id.split("-")[2]) : -1;
    if (flightIdx >= 0 && TRIP.flights[flightIdx]) {
      const f = TRIP.flights[flightIdx];
      return { id, title: f.route + " · " + f.code, desc: `${f.date} / ${f.dep} → ${f.arr}`, mapQuery: "", time: "" };
    }
    const ref = REFERENCE_ITEMS.find(r => r.id === id);
    if (ref) return { id, title: ref.title, desc: "메모와 캡처 이미지를 자유롭게 남겨두세요.", mapQuery: ref.mapQuery, time: "" };
    return { id, title: "메모", desc: "", mapQuery: "", time: "" };
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

  // ---------------- 지도 ----------------
  async function renderMap() {
    const url = await DB.getSetting("mapEmbedUrl");
    const iframe = document.getElementById("mapIframe");
    const empty = document.getElementById("mapEmpty");
    const editBtn = document.getElementById("btnEditMap");
    if (url) {
      iframe.src = url;
      iframe.hidden = false;
      empty.hidden = true;
      editBtn.hidden = false;
    } else {
      iframe.hidden = true;
      empty.hidden = false;
      editBtn.hidden = true;
    }
  }

  document.getElementById("btnSetMap").addEventListener("click", async () => {
    const current = (await DB.getSetting("mapEmbedUrl")) || "";
    const val = window.prompt("구글 마이맵 → 공유 → \"웹에 게시\" embed 링크를 붙여넣어줘", current);
    if (val === null) return;
    await DB.setSetting("mapEmbedUrl", val.trim());
    renderMap();
  });
  document.getElementById("btnEditMap").addEventListener("click", async () => {
    const current = (await DB.getSetting("mapEmbedUrl")) || "";
    const val = window.prompt("구글 마이맵 embed 링크 수정", current);
    if (val === null) return;
    await DB.setSetting("mapEmbedUrl", val.trim());
    renderMap();
  });

  // ---------------- 상세 모달 ----------------
  async function openModal(id) {
    const item = resolveItem(id);
    currentItem = item;

    document.getElementById("modalTime").textContent = item.time || "메모";
    document.getElementById("modalTime").style.display = item.time ? "" : "none";
    document.getElementById("modalTitle").textContent = item.title;
    document.getElementById("modalSubtitle").textContent = item.desc || "";

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

  // ---------------- 초기화 ----------------
  renderTimeline();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
