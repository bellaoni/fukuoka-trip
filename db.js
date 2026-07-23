// 간단한 IndexedDB 래퍼. 오프라인에서도 동작하며 사진/PDF는 Blob으로 저장한다.
const DB = (() => {
  const DB_NAME = "fukuoka-trip-db";
  const DB_VERSION = 2;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes"); // key: itemId, value: string
        }
        if (!db.objectStoreNames.contains("attachments")) {
          const store = db.createObjectStore("attachments", { keyPath: "id" });
          store.createIndex("byItem", "itemId", { unique: false });
        }
        if (!db.objectStoreNames.contains("checklist")) {
          db.createObjectStore("checklist"); // key: 'list', value: array
        }
        if (!db.objectStoreNames.contains("geocache")) {
          db.createObjectStore("geocache"); // key: mapQuery 문자열, value: {lat,lng,manual,failed,ts}
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(storeName, mode) {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  return {
    async getNote(itemId) {
      const store = await tx("notes", "readonly");
      return new Promise((res, rej) => {
        const r = store.get(itemId);
        r.onsuccess = () => res(r.result || "");
        r.onerror = () => rej(r.error);
      });
    },
    async setNote(itemId, text) {
      const store = await tx("notes", "readwrite");
      return new Promise((res, rej) => {
        const r = store.put(text, itemId);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    async addAttachment(itemId, file) {
      const store = await tx("attachments", "readwrite");
      const record = {
        id: itemId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        itemId,
        name: file.name,
        type: file.type,
        blob: file,
        createdAt: Date.now()
      };
      return new Promise((res, rej) => {
        const r = store.add(record);
        r.onsuccess = () => res(record);
        r.onerror = () => rej(r.error);
      });
    },
    async getAttachments(itemId) {
      const store = await tx("attachments", "readonly");
      const idx = store.index("byItem");
      return new Promise((res, rej) => {
        const results = [];
        const cursorReq = idx.openCursor(IDBKeyRange.only(itemId));
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            results.sort((a, b) => a.createdAt - b.createdAt);
            res(results);
          }
        };
        cursorReq.onerror = () => rej(cursorReq.error);
      });
    },
    async deleteAttachment(id) {
      const store = await tx("attachments", "readwrite");
      return new Promise((res, rej) => {
        const r = store.delete(id);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    async getChecklist() {
      const store = await tx("checklist", "readonly");
      return new Promise((res, rej) => {
        const r = store.get("list");
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    },
    async setChecklist(list) {
      const store = await tx("checklist", "readwrite");
      return new Promise((res, rej) => {
        const r = store.put(list, "list");
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    // ---- 백업/복원용 ----
    async getAllNotes() {
      const store = await tx("notes", "readonly");
      return new Promise((res, rej) => {
        const result = {};
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            result[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            res(result);
          }
        };
        cursorReq.onerror = () => rej(cursorReq.error);
      });
    },
    async getAllAttachments() {
      const store = await tx("attachments", "readonly");
      return new Promise((res, rej) => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async putAttachmentRaw(record) {
      const store = await tx("attachments", "readwrite");
      return new Promise((res, rej) => {
        const r = store.put(record);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    // ---- 지도 지오코딩 캐시 ----
    async getGeocode(query) {
      const store = await tx("geocache", "readonly");
      return new Promise((res, rej) => {
        const r = store.get(query);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
    },
    async setGeocode(query, record) {
      const store = await tx("geocache", "readwrite");
      return new Promise((res, rej) => {
        const r = store.put(record, query);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      });
    },
    async getAllGeocodes() {
      const store = await tx("geocache", "readonly");
      return new Promise((res, rej) => {
        const result = {};
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            result[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            res(result);
          }
        };
        cursorReq.onerror = () => rej(cursorReq.error);
      });
    }
  };
})();
