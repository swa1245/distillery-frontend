export function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function loadSheetStore(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (!raw) return { sheets: {} };
    if (raw.sheets && typeof raw.sheets === "object" && !Array.isArray(raw.sheets)) {
      return { sheets: raw.sheets };
    }
    if (Array.isArray(raw)) {
      const sheets = {};
      for (const row of raw) {
        const d = String(row?.date || "").slice(0, 10) || todayIso();
        if (!sheets[d]) sheets[d] = [];
        sheets[d].push(row);
      }
      return { sheets };
    }
  } catch {
    /* ignore */
  }
  return { sheets: {} };
}

export function saveSheetStore(key, store) {
  localStorage.setItem(key, JSON.stringify({ sheets: store.sheets || {} }));
}

export function listSheetDates(store) {
  return Object.keys(store.sheets || {}).sort((a, b) => b.localeCompare(a));
}

export function readSheetRows(store, date) {
  const rows = store.sheets?.[date];
  return Array.isArray(rows) ? rows : [];
}
