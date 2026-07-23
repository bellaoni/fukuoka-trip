(() => {
  "use strict";

  // Bella Travel 아카이브(허브)의 절대경로.
  // GitHub Pages 프로젝트 사이트 기준 "/레포명/" 형태 (도메인 루트 기준이라 사용자명과 무관하게 동작).
  // 허브 레포 이름을 바꾸면 이 값만 수정하면 됨.
  const ARCHIVE_URL = "/bella-travel/";

  const TAG_LABEL = { normal: "일정", food: "맛집", shop: "쇼핑", sight: "관광", theme: "테마/체험" };

  let currentDay = 1;
  let currentItem = null; // 현재 모달에 열려있는 item
  const objectUrls = []; // 상세 모달 첨부용 blob object URL 추적 (해제용)
  let isArchiveEntry = false; // Bella Travel을 거쳐 들어왔는지 여부 (나만 보기 전용 기능 노출 판단용)

  // 가계부 데이터: 기본값은 data.js의 EXPENSES(시드). CSV로 한 번이라도 업데이트하면
  // 이후로는 IndexedDB에 저장된 값을 우선 사용한다. (백업 JSON에도 이 값이 포함됨)
  let currentExpenses = EXPENSES;
  async function loadExpenses() {
    try {
      const stored = await DB.getExpenses();
      if (Array.isArray(stored)) currentExpenses = stored;
    } catch (e) {
      // DB 접근 실패 시 data.js 기본값을 그대로 사용
    }
  }

  // ---------------- 공용: HTML 이스케이프 ----------------
  // 사용자가 직접 타이핑한 값(체크리스트, 메모 등)을 innerHTML에 꽂기 전에 반드시 거쳐서
  // 마크업이 깨지거나 스크립트가 삽입되는 것을 막는다. (data.js의 고정 콘텐츠는 대상 아님)
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  // ---------------- 공용: 팝업 카드 열기/닫기 포커스 관리 ----------------
  // bella-travel 허브의 통계 모달과 동일한 방식: 열 때 닫기버튼(X)으로 포커스를 옮기고,
  // 닫을 때 팝업을 열기 전 포커스가 있던 요소로 되돌린다(lastFocusedEl).
  // 한 번에 하나의 팝업만 열린다는 전제로 전역 변수 하나로 관리한다.
  let lastFocusedEl = null;

  // "{prefix}Backdrop" / "{prefix}Close"라는 id 규칙만 지키면 어떤 팝업이든
  // 열기 전 포커스 저장 → 배경 노출 → 닫기 버튼 포커스까지 한 줄로 처리해준다.
  function openCard(prefix) {
    lastFocusedEl = document.activeElement;
    const backdrop = document.getElementById(prefix + "Backdrop");
    if (!backdrop) return;
    backdrop.hidden = false;
    const closeBtn = document.getElementById(prefix + "Close");
    if (closeBtn) closeBtn.focus();
  }

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
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus(); // 팝업을 열기 전 포커스가 있던 요소로 되돌림
      }
      lastFocusedEl = null;
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
    else if (leafletMap) { closeMapSheet(); cancelPicking(); }
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
        <span>${escapeHtml(it.text)}</span>
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
      openCard("transitCard");
    } else if (id === "ref-japanese-phrases") {
      renderPhraseTable();
      openCard("phraseCard");
    } else if (id === "ref-shopping-stores") {
      renderStoreTable();
      openCard("storeCard");
    } else if (id === "ref-shopping-list") {
      renderShoppingList();
      openCard("shoppingCard");
    } else if (id === "ref-food-list") {
      renderFoodList();
      openCard("foodCard");
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
    openCard("qrCard");
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

  // ---------------- 가계부 (나만 보기 전용) ----------------
  // 분류 로직: splitWith 인원수 > 1 → 공동경비(내 몫 = 금액/인원수)
  //           splitWith 인원수 = 1 & 그 사람이 나 → 개인경비(전액)
  //           splitWith 인원수 = 1 & 그 사람이 내가 아님 → 내 가계부에서 제외
  function classifyExpense(e) {
    const n = e.splitWith.length;
    if (n > 1) return "shared";
    if (n === 1 && e.splitWith[0] === ME_NAME) return "personal";
    return "excluded";
  }
  function myShare(e, type) {
    const krw = e.amount * e.krwRate;
    if (type === "shared") return krw / e.splitWith.length;
    if (type === "personal") return krw;
    return 0;
  }
  // 통화 표시 규칙: 기호가 있는 통화는 기호+숫자(₩1,000), 기호가 없는 통화는 숫자+코드(1,000 VND)
  // 다른 여행(다른 통화)에서도 그대로 재사용 가능하도록 맵만 채워서 씀
  const CURRENCY_SYMBOLS = { KRW: "₩", USD: "$", JPY: "¥", EUR: "€", GBP: "£", CNY: "¥" };
  function formatMoney(amount, currency) {
    const symbol = CURRENCY_SYMBOLS[currency];
    const numStr = amount.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
    return symbol ? `${symbol}${numStr}` : `${numStr} ${currency}`;
  }
  function fmtKRW(n) { return formatMoney(Math.round(n), "KRW"); }
  function fmtOriginal(e) { return formatMoney(e.amount, e.currency); }
  function renderExpenses() {
    const rows = currentExpenses
      .map(e => ({ ...e, type: classifyExpense(e) }))
      .filter(e => e.type !== "excluded")
      .map(e => ({ ...e, krw: e.amount * e.krwRate, share: myShare(e, e.type) }));

    const totalMine = rows.reduce((sum, e) => sum + e.share, 0);
    const totalShared = rows.filter(e => e.type === "shared").reduce((sum, e) => sum + e.krw, 0);
    const mineEl = document.getElementById("expenseTotal");
    const sharedEl = document.getElementById("expenseSharedTotal");
    if (mineEl) mineEl.textContent = fmtKRW(totalMine);
    if (sharedEl) sharedEl.textContent = fmtKRW(totalShared);

    // 카테고리별로 묶고, 카테고리 안에서는 일차 순서를 유지한 채 그룹핑
    const categories = {};
    rows.forEach(e => {
      if (!categories[e.category]) categories[e.category] = { total: 0, currencyTotals: {}, rows: [] };
      categories[e.category].total += e.share;
      if (e.currency !== "KRW") {
        const shareOriginal = e.type === "shared" ? e.amount / e.splitWith.length : e.amount;
        categories[e.category].currencyTotals[e.currency] = (categories[e.category].currencyTotals[e.currency] || 0) + shareOriginal;
      }
      categories[e.category].rows.push(e);
    });

    const listEl = document.getElementById("expenseCategoryList");
    if (listEl) {
      listEl.innerHTML = Object.entries(categories).map(([cat, data]) => {
        let lastDay = null;
        const bodyRows = data.rows.map(e => {
          let dayHeader = "";
          if (e.day !== lastDay) {
            dayHeader = `<tr class="phrase-cat"><td colspan="3">${e.day}</td></tr>`;
            lastDay = e.day;
          }
          const shareNote = e.type === "shared" ? `<br><span class="expense-share-note">내 몫 ${fmtKRW(e.share)}</span>` : "";
          return `${dayHeader}
            <tr>
              <td>${e.item}</td>
              <td>${fmtOriginal(e)}${e.currency !== "KRW" ? `<br>(${fmtKRW(e.krw)})` : ""}</td>
              <td><span class="expense-badge expense-badge-${e.type}">${e.type === "shared" ? "공동" : "개인"}</span>${shareNote}</td>
            </tr>`;
        }).join("");
        const currencyNote = Object.entries(data.currencyTotals)
          .map(([cur, sum]) => formatMoney(sum, cur))
          .join(" · ");
        return `
          <details class="accordion accordion-nested">
            <summary><span>${cat}</span><span class="expense-cat-total">${fmtKRW(data.total)}${currencyNote ? `<br><span class="expense-currency-note">(${currencyNote})</span>` : ""}</span></summary>
            <div class="accordion-body">
              <table class="phrase-table expense-table">
                <thead><tr><th>항목명</th><th>금액</th><th>구분</th></tr></thead>
                <tbody>${bodyRows}</tbody>
              </table>
            </div>
          </details>`;
      }).join("");
    }
  }
  document.getElementById("expenseDetailBtn")?.addEventListener("click", () => {
    renderExpenses();
    openCard("expenseCard");
  });

  // ---------------- 가계부 CSV 업로드 (전체 교체) ----------------
  // 아래 두 헤더 형식을 모두 인식한다 (컬럼 순서는 상관없음):
  //  - 기본 형식: day,item,category,amount,currency,krwRate,splitWith
  //  - 가계부 앱 내보내기 형식: 일차,항목명,카테고리,금액,통화,통화 당 원화,원화 환산,
  //    장소,나만보기 비용,결제한 사람,결제한 사람 수,나눠 낼 사람,나눠 낼 사람 수
  // splitWith(나눠 낼 사람)는 세미콜론(;) 또는 쉼표(,)로 여러 명을 구분해도 된다.
  // 분류(공동/개인/제외) 로직인 classifyExpense/myShare는 splitWith만 보고 판단하므로
  // 그 외 컬럼(장소, 나만보기 비용, 결제한 사람 등)은 있어도 그냥 무시된다.
  // "▼"로 시작하는 줄이나 빈 줄을 만나면 그 아래는 요약 합계 구간으로 보고 읽기를 멈춘다.
  const EXPENSE_HEADER_ALIASES = {
    day: ["day", "일차"],
    item: ["item", "항목명"],
    category: ["category", "카테고리"],
    amount: ["amount", "금액"],
    currency: ["currency", "통화"],
    krwRate: ["krwRate", "통화 당 원화"],
    splitWith: ["splitWith", "나눠 낼 사람"],
  };
  const EXPENSE_FIELD_LABEL = {
    day: "day(일차)", item: "item(항목명)", category: "category(카테고리)",
    amount: "amount(금액)", currency: "currency(통화)", krwRate: "krwRate(통화 당 원화)",
    splitWith: "splitWith(나눠 낼 사람)",
  };

  // 큰따옴표로 감싼 필드 안의 쉼표(예: "1,093,600")를 지켜가며 한 줄을 셀 배열로 쪼갠다.
  function parseCsvLine(line) {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  }

  function toNumber(raw) {
    if (raw == null) return NaN;
    const cleaned = String(raw).replace(/,/g, "").trim();
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function parseExpenseCsv(text) {
    const allLines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    let start = 0;
    while (start < allLines.length && allLines[start].trim() === "") start++;
    if (start >= allLines.length) throw new Error("빈 CSV예요.");

    const header = parseCsvLine(allLines[start]);
    const fieldIndex = {};
    Object.entries(EXPENSE_HEADER_ALIASES).forEach(([field, aliases]) => {
      const idx = header.findIndex(h => aliases.includes(h));
      if (idx !== -1) fieldIndex[field] = idx;
    });
    const missing = Object.keys(EXPENSE_HEADER_ALIASES).filter(f => !(f in fieldIndex));
    if (missing.length) {
      throw new Error(`컬럼 누락: ${missing.map(f => EXPENSE_FIELD_LABEL[f]).join(", ")}`);
    }

    const rows = [];
    for (let i = start + 1; i < allLines.length; i++) {
      const line = allLines[i];
      if (line.trim() === "" || line.trim().startsWith("▼")) break; // 요약 합계 구간 시작
      const cells = parseCsvLine(line);
      const get = (field) => cells[fieldIndex[field]] ?? "";

      const amount = toNumber(get("amount"));
      const krwRate = toNumber(get("krwRate"));
      const item = get("item");
      if (!item || Number.isNaN(amount) || Number.isNaN(krwRate)) {
        throw new Error(`${i + 1}번째 줄 형식이 올바르지 않아요.`);
      }
      const splitWith = get("splitWith").split(/[,;]/).map(s => s.trim()).filter(Boolean);
      rows.push({
        day: get("day"),
        item,
        category: get("category"),
        amount,
        currency: get("currency") || "KRW",
        krwRate,
        splitWith,
      });
    }
    if (!rows.length) throw new Error("가져올 항목이 없어요.");
    return rows;
  }

  // 가계부 앱들이 CSV를 UTF-8이 아니라 EUC-KR(CP949)로 내보내는 경우가 흔해서,
  // file.text()(항상 UTF-8로만 해석)로 읽으면 한글 헤더("일차" 등)가 깨져 컬럼을 못 찾는다.
  // UTF-8로 디코딩했을 때 깨진 문자(치환 문자 U+FFFD)가 섞여 있으면 EUC-KR로 다시 읽어본다.
  async function readCsvFileAsText(file) {
    const buffer = await file.arrayBuffer();
    const utf8Text = new TextDecoder("utf-8").decode(buffer);
    if (!utf8Text.includes("\uFFFD")) return utf8Text; // 정상 UTF-8
    try {
      const eucKrText = new TextDecoder("euc-kr").decode(buffer);
      // EUC-KR로도 깨졌으면(치환 문자 존재) 그래도 UTF-8 결과보단 EUC-KR을 우선 신뢰
      return eucKrText;
    } catch (err) {
      // 브라우저가 euc-kr 디코더를 지원하지 않는 극히 드문 경우 UTF-8 결과라도 사용
      return utf8Text;
    }
  }

  document.getElementById("expenseCsvInput")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const statusEl = document.getElementById("expenseCsvStatus");
    const showCsvStatus = (msg) => { if (statusEl) { statusEl.textContent = msg; statusEl.hidden = false; } };

    if (!confirm("CSV를 올리면 현재 가계부 내역 전체가 새 내용으로 교체돼요. 계속할까요?")) return;
    try {
      const text = await readCsvFileAsText(file);
      const rows = parseExpenseCsv(text);
      await DB.replaceExpenses(rows);
      currentExpenses = rows;
      renderExpenses();
      showCsvStatus(`✅ ${rows.length}건으로 교체 완료 (${new Date().toLocaleString("ko-KR")})`);
    } catch (err) {
      showCsvStatus(`⚠️ 가져오기 실패: ${err.message || "CSV 형식을 확인해 주세요."}`);
    }
  });

  // ---------------- 지도 (Leaflet + OpenStreetMap) ----------------
  // 흐름: GEO_COORDS(확정 좌표, data.js)에 있으면 그걸 바로 사용 → 없으면 mapQuery(+영문 검색어)로
  // Nominatim 지오코딩 시도 → 성공하면 기기에 캐시. 실패한 장소는 지도에서 빼지 않고 "위치 확인 필요"
  // 목록에 남겨, 지도를 탭해서 직접 위치를 찍어 저장할 수 있게 한다(좌표 입력 없이).
  const TAG_COLOR_VAR = { normal: "var(--tape)", food: "var(--pink)", shop: "var(--sight)", sight: "var(--moss)", theme: "var(--indigo)" };
  function tagColorVar(tag) { return TAG_COLOR_VAR[tag] || "var(--tape)"; }

  let leafletMap = null;
  let mapMarkerLayers = null; // { 1: layerGroup, 2: layerGroup, 3: layerGroup }
  let currentMapDay = "all";
  let mapInitialized = false;
  let geocodeQueueRunning = false;

  function makePinIcon(tag) {
    return L.divIcon({
      className: "map-pin-wrap",
      html: `<span class="map-pin" style="background:${tagColorVar(tag)}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8]
    });
  }

  function addMarkerForItem(item, coords) {
    const marker = L.marker([coords.lat, coords.lng], { icon: makePinIcon(item.tag) });
    marker.on("click", () => {
      if (pickingItem) {
        // 위치찍기 모드 중 이미 있는 마커를 탭하면, 그 위치로 현재 찍는 중인 핀을 옮긴다
        onMapTapWhilePicking(coords);
        return;
      }
      showMapSheet(item, coords);
    });
    marker.addTo(mapMarkerLayers[item.day]);
  }

  // ---------------- 마커 탭 → 하단 시트(바텀시트) ----------------
  function showMapSheet(item, coords) {
    const sheet = document.getElementById("mapSheet");
    if (!sheet) return;
    sheet.innerHTML = `
      <div class="map-sheet-tape" style="background:${tagColorVar(item.tag)}"></div>
      <div class="map-sheet-head">
        <span class="tl-tag">${TAG_LABEL[item.tag] || ""}</span>
        <span class="map-sheet-time">${item.time || ""}</span>
        <button class="map-sheet-close" type="button" aria-label="닫기">✕</button>
      </div>
      <h3 class="map-sheet-title">${item.title}</h3>
      ${item.desc ? `<p class="map-sheet-desc">${item.desc}</p>` : ""}
      <button class="btn-primary small map-sheet-detail" type="button">자세히 보기</button>
    `;
    sheet.classList.add("open");
    sheet.querySelector(".map-sheet-close").addEventListener("click", closeMapSheet);
    sheet.querySelector(".map-sheet-detail").addEventListener("click", () => {
      closeMapSheet();
      openModal(item.id);
    });
    if (coords) panMapForSheet(coords);
  }

  function closeMapSheet() {
    document.getElementById("mapSheet")?.classList.remove("open");
  }

  // 바텀시트가 열리면서 마커를 가리는 경우, 마커가 시트 위쪽 보이는 영역에 들어오도록 지도를 살짝 위로 이동
  function panMapForSheet(coords) {
    if (!leafletMap) return;
    const sheet = document.getElementById("mapSheet");
    if (!sheet) return;
    const sheetHeight = sheet.offsetHeight;
    if (!sheetHeight) return;
    const margin = 24; // 시트 위쪽 여유 여백
    const point = leafletMap.latLngToContainerPoint([coords.lat, coords.lng]);
    const mapSize = leafletMap.getSize();
    const visibleBottom = mapSize.y - sheetHeight - margin;
    if (point.y > visibleBottom) {
      leafletMap.panBy([0, point.y - visibleBottom], { animate: true });
    }
  }

  // ---------------- 위치 확인 필요 → 지도 탭해서 직접 찍기 ----------------
  let pickingItem = null;   // 현재 위치를 찍는 중인 항목
  let pickingMarker = null; // 확정 전 임시 마커(드래그로 미세조정 가능)

  function startPicking(item) {
    closeMapSheet();
    pickingItem = item;
    if (pickingMarker) { leafletMap.removeLayer(pickingMarker); pickingMarker = null; }
    const bar = document.getElementById("mapPickerBar");
    document.getElementById("mapPickerText").textContent = `"${item.title}" 위치를 지도에서 탭해주세요`;
    document.getElementById("mapPickerSave").disabled = true;
    bar.hidden = false;
    leafletMap.getContainer().classList.add("picking");
  }

  function cancelPicking() {
    if (pickingMarker) { leafletMap.removeLayer(pickingMarker); pickingMarker = null; }
    pickingItem = null;
    document.getElementById("mapPickerBar").hidden = true;
    leafletMap.getContainer().classList.remove("picking");
  }

  async function confirmPicking() {
    if (!pickingItem || !pickingMarker) return;
    const { lat, lng } = pickingMarker.getLatLng();
    await DB.setGeocode(pickingItem.mapQuery, { lat, lng, manual: true, failed: false, ts: Date.now() });
    cancelPicking();
    renderMap();
  }

  function onMapTapWhilePicking(latlng) {
    if (pickingMarker) {
      pickingMarker.setLatLng(latlng);
    } else {
      pickingMarker = L.marker(latlng, { icon: makePinIcon(pickingItem.tag), draggable: true }).addTo(leafletMap);
    }
    document.getElementById("mapPickerSave").disabled = false;
  }

  function renderMapLegend() {
    const el = document.getElementById("mapLegend");
    if (!el) return;
    const present = new Set(ITEMS.filter((i) => i.mapQuery).map((i) => i.tag));
    const order = ["normal", "food", "sight", "shop", "theme"];
    const tags = order.filter((t) => present.has(t)).concat([...present].filter((t) => !order.includes(t)));
    el.innerHTML = tags.map((tag) => `
      <span class="map-legend-item"><span class="map-legend-dot" style="background:${tagColorVar(tag)}"></span>${TAG_LABEL[tag] || tag}</span>
    `).join("");
  }

  function ensureLeafletMap() {
    if (leafletMap) return;
    leafletMap = L.map("leafletMap", { zoomControl: true }).setView([33.7, 130.2], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(leafletMap);
    mapMarkerLayers = {
      1: L.layerGroup().addTo(leafletMap),
      2: L.layerGroup().addTo(leafletMap),
      3: L.layerGroup().addTo(leafletMap)
    };
    document.querySelectorAll("#mapDayFilter .day-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyMapDayFilter(btn.dataset.mapday, true);
      });
    });
    leafletMap.on("click", (e) => {
      if (pickingItem) onMapTapWhilePicking(e.latlng);
      else closeMapSheet();
    });
    document.getElementById("mapPickerCancel").addEventListener("click", cancelPicking);
    document.getElementById("mapPickerSave").addEventListener("click", confirmPicking);
    renderMapLegend();
  }

  function fitToVisibleMarkers() {
    const visibleLayers = [1, 2, 3]
      .filter((d) => currentMapDay === "all" || String(d) === currentMapDay)
      .map((d) => mapMarkerLayers[d]);
    const markers = visibleLayers.flatMap((g) => g.getLayers());
    if (!markers.length) return;
    const group = L.featureGroup(markers);
    leafletMap.fitBounds(group.getBounds().pad(0.2));
  }

  function applyMapDayFilter(day, refit) {
    currentMapDay = day;
    document.querySelectorAll("#mapDayFilter .day-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mapday === day);
    });
    [1, 2, 3].forEach((d) => {
      const layer = mapMarkerLayers[d];
      const show = day === "all" || String(d) === day;
      if (show && !leafletMap.hasLayer(layer)) layer.addTo(leafletMap);
      if (!show && leafletMap.hasLayer(layer)) leafletMap.removeLayer(layer);
    });
    if (refit) fitToVisibleMarkers();
  }

  function renderPendingList(pendingItems) {
    const wrap = document.getElementById("mapPending");
    const list = document.getElementById("mapPendingList");
    // 공유자에게는 의미 없는 기능이라 Bella Travel을 거쳐 들어왔을 때만 노출
    if (!isArchiveEntry || !pendingItems.length) { wrap.hidden = true; list.innerHTML = ""; return; }
    wrap.hidden = false;
    list.innerHTML = pendingItems.map((item) => `
      <li class="map-pending-item" data-id="${item.id}">
        <div class="map-pending-head">
          <span>${item.title}</span>
          <div class="map-pending-actions">
            <button class="btn-ghost small map-retry-btn" type="button" data-query="${item.mapQuery.replace(/"/g, "&quot;")}">다시 시도</button>
            <a class="btn-ghost small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapQuery)}" target="_blank" rel="noopener">구글 지도</a>
          </div>
        </div>
        <button class="btn-primary small map-pick-btn" type="button" data-id="${item.id}">📍 지도에서 위치 찍기</button>
      </li>`).join("");

    list.querySelectorAll(".map-retry-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "확인 중...";
        const query = btn.dataset.query;
        const result = await geocodeNominatim(query).catch(() => null);
        if (result) {
          await DB.setGeocode(query, { lat: result.lat, lng: result.lng, manual: false, failed: false, ts: Date.now() });
        } else {
          await DB.setGeocode(query, { manual: false, failed: true, ts: Date.now() });
          btn.disabled = false;
          btn.textContent = "다시 시도";
        }
        renderMap();
      });
    });

    list.querySelectorAll(".map-pick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = ITEMS.find((i) => i.id === btn.dataset.id);
        if (item) startPicking(item);
      });
    });
  }

  async function geocodeNominatim(query) {
    const searchText = GEO_SEARCH_QUERY[query] || query;
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=" + encodeURIComponent(searchText);
    const res = await fetch(url);
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }

  // 아직 캐시에 없는 장소들만 순서대로, Nominatim 정책(초당 1건)에 맞춰 천천히 지오코딩한다.
  async function runGeocodeQueue(queryGroups) {
    if (geocodeQueueRunning) return;
    geocodeQueueRunning = true;
    try {
      for (const [query, items] of queryGroups) {
        const result = await geocodeNominatim(query).catch(() => null);
        if (result) {
          await DB.setGeocode(query, { lat: result.lat, lng: result.lng, manual: false, failed: false, ts: Date.now() });
          items.forEach((item) => addMarkerForItem(item, result));
        } else {
          await DB.setGeocode(query, { manual: false, failed: true, ts: Date.now() });
        }
        await new Promise((r) => setTimeout(r, 1100)); // Nominatim 사용 정책: 초당 1건 이하
      }
    } finally {
      geocodeQueueRunning = false;
      renderMap();
    }
  }

  async function renderMap() {
    ensureLeafletMap();
    leafletMap.invalidateSize();

    const withQuery = ITEMS.filter((i) => i.mapQuery && !i.noPin);
    const byQuery = new Map();
    withQuery.forEach((item) => {
      if (!byQuery.has(item.mapQuery)) byQuery.set(item.mapQuery, []);
      byQuery.get(item.mapQuery).push(item);
    });

    [1, 2, 3].forEach((d) => mapMarkerLayers[d].clearLayers());
    const pendingItems = [];
    const toGeocode = [];

    for (const [query, items] of byQuery.entries()) {
      const fixed = GEO_COORDS[query];
      if (fixed) {
        items.forEach((item) => addMarkerForItem(item, fixed));
        continue;
      }
      const cached = await DB.getGeocode(query);
      if (cached && !cached.failed) {
        items.forEach((item) => addMarkerForItem(item, cached));
      } else if (cached && cached.failed) {
        pendingItems.push(items[0]);
      } else {
        toGeocode.push([query, items]);
      }
    }

    renderPendingList(pendingItems);

    if (!mapInitialized) {
      mapInitialized = true;
      applyMapDayFilter(currentMapDay, true);
    } else {
      applyMapDayFilter(currentMapDay, false);
    }

    if (toGeocode.length) runGeocodeQueue(toGeocode);
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

    openCard("modal");
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
    openCard("viewer");
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
  const THEME_KEY = (window.TRIP_ID || "fukuoka-trip") + "-theme";
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
      await loadExpenses();
      const [notes, checklist, rawAttachments, geocodes] = await Promise.all([
        DB.getAllNotes(),
        DB.getChecklist(),
        DB.getAllAttachments(),
        DB.getAllGeocodes()
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
        app: (window.TRIP_ID || "fukuoka-trip") + "-pwa",
        version: 3,
        exportedAt: new Date().toISOString(),
        notes, checklist, attachments, geocodes,
        expenses: currentExpenses
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${window.TRIP_ID || "fukuoka-trip"}-backup-${dateStr}.json`;
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

    if (!confirm("백업 파일을 불러오면 현재 저장된 메모·사진·체크리스트·가계부 위에 덮어써요. 계속할까요?")) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || payload.app !== (window.TRIP_ID || "fukuoka-trip") + "-pwa") {
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
      for (const [query, record] of Object.entries(payload.geocodes || {})) {
        await DB.setGeocode(query, record);
      }
      if (Array.isArray(payload.expenses)) {
        await DB.replaceExpenses(payload.expenses);
        currentExpenses = payload.expenses;
        renderExpenses();
      }

      showBackupStatus(`✅ 가져오기 완료 (${new Date().toLocaleString("ko-KR")})`);
      renderChecklist();
      if (leafletMap) renderMap();
      if (currentItem) await renderAttachments(currentItem.id);
    } catch (err) {
      showBackupStatus("⚠️ 가져오기에 실패했어요. 올바른 백업 파일인지 확인해 주세요.");
    }
  });

  document.getElementById("exportGeoBtn")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("geoExportStatus");
    const all = await DB.getAllGeocodes();
    const lines = Object.entries(all)
      .filter(([query, rec]) => rec && !rec.failed && !(query in GEO_COORDS))
      .map(([query, rec]) => `  "${query.replace(/"/g, "\\\"")}": { lat: ${rec.lat}, lng: ${rec.lng} },`);

    if (!lines.length) {
      statusEl.textContent = "새로 추가할 좌표가 없어요. (이미 다 GEO_COORDS에 있거나, 아직 확인된 곳이 없어요)";
      statusEl.hidden = false;
      return;
    }
    const snippet = lines.join("\n");
    try {
      await navigator.clipboard.writeText(snippet);
      statusEl.textContent = `✅ ${lines.length}곳 좌표를 복사했어요. Claude에게 붙여넣어서 GEO_COORDS에 반영해달라고 하면 돼요.`;
    } catch (e) {
      statusEl.textContent = snippet; // 클립보드 접근 실패 시 화면에 직접 표시해서 수동으로 복사 가능하게
    }
    statusEl.hidden = false;
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
    isArchiveEntry = entrySource === "archive";
    const homeBtn = document.getElementById("homeBtn");
    if (isArchiveEntry) {
      homeBtn.hidden = false;
      homeBtn.addEventListener("click", () => { location.href = ARCHIVE_URL; });
      // 가계부는 나만 보기 전용 - Bella Travel을 거쳐 들어왔을 때만 노출
      const expenseAccordion = document.getElementById("expenseAccordion");
      if (expenseAccordion) {
        expenseAccordion.hidden = false;
        loadExpenses().then(renderExpenses);
      }
      // 지도 좌표 복사도 나만 보기 전용 - 공유자에게는 의미 없는 개발용 기능
      const geoCopySection = document.getElementById("geoCopySection");
      if (geoCopySection) geoCopySection.hidden = false;
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
  bindCardClose("expenseCard");

  // ---------------- 아코디언 열림/닫힘 상태 기억 ----------------
  // 사용자가 마지막으로 펼치거나 접어둔 상태를 기기에 저장해두고, 다음 접속(새로고침 포함) 시 그대로 복원한다.
  // 저장된 상태가 없는 아코디언은 기본값(닫힘)으로 시작한다.
  const ACCORDION_STATE_KEY = (window.TRIP_ID || "fukuoka-trip") + "-accordion-state";
  (function initAccordionMemory() {
    let states = {};
    try { states = JSON.parse(localStorage.getItem(ACCORDION_STATE_KEY)) || {}; } catch (e) {}

    document.querySelectorAll(".checklist-panel > details.accordion[id]").forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(states, el.id)) {
        el.open = states[el.id];
      }
      el.addEventListener("toggle", () => {
        states[el.id] = el.open;
        try { localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(states)); } catch (e) {}
      });
    });
  })();

  // ---------------- 초기화 ----------------
  renderTimeline();

  // ---------------- 서비스워커 업데이트 알림 ----------------
  // 새 버전의 sw.js가 설치되어 "대기 중" 상태가 되면 하단에 토스트로 알리고,
  // 사용자가 탭하면 그때만 새 버전을 활성화 + 새로고침한다 (임의로 화면이 바뀌지 않게).
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

  // ---------------- 안드로이드 "앱 설치" 배너 ----------------
  // 안드로이드 크롬은 PWA 설치 조건을 만족하면 beforeinstallprompt 이벤트를 쏘는데,
  // 기본 동작(브라우저 자체 미니 인포바)을 막고 이 이벤트를 저장해뒀다가
  // 우리 쪽 UI(하단 배너)의 "설치하기" 버튼을 눌렀을 때만 표준 설치창을 띄운다.
  // iOS Safari는 이 API 자체가 없어서 배너가 뜨지 않으며, 기존처럼 "홈 화면에 추가"를 수동 안내해야 한다.
  let deferredInstallPrompt = null;
  let installBannerDismissed = false;

  function showInstallBanner() {
    if (installBannerDismissed || !deferredInstallPrompt) return;
    let banner = document.getElementById("installBanner");
    if (banner) { banner.hidden = false; return; }
    banner = document.createElement("div");
    banner.id = "installBanner";
    banner.className = "install-banner";
    banner.innerHTML = `
      <span>홈 화면에 앱으로 설치할 수 있어요</span>
      <div class="install-banner-actions">
        <button type="button" id="installBannerDismiss" aria-label="닫기">✕</button>
        <button type="button" id="installBannerBtn">설치하기</button>
      </div>`;
    document.body.appendChild(banner);
    banner.querySelector("#installBannerDismiss").addEventListener("click", () => {
      installBannerDismissed = true; // 이번 방문에서는 다시 띄우지 않음
      banner.hidden = true;
    });
    banner.querySelector("#installBannerBtn").addEventListener("click", async () => {
      banner.hidden = true;
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt(); // 표준 설치 확인창 (브라우저 제공)
      await deferredInstallPrompt.userChoice; // 수락/거절 여부와 무관하게 프롬프트는 1회용
      deferredInstallPrompt = null;
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    const banner = document.getElementById("installBanner");
    if (banner) banner.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
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
})();
