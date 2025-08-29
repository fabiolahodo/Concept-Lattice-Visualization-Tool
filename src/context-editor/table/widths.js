// src/context-editor/table/widths.js
// Sizing + <colgroup> utilities for Grid.js tables.
// Focus: better readability for header labels & object names.

// ------- Tunable profile (Comfort) -------
const COMFORT = {
  // Attribute header cells (text-only, body cells are checkboxes)
  attrMin: 112,   // was 44
  attrPad: 28,   // was 24
  attrMax: 560,  // was 360

  // First column (object names) can be long; give it more room
  objMin: 140,   // was 90
  objPad: 36,    // was 28
  objMax: 560    // was 280
};

const ATTR_BUTTON_PAD = 26;

// Character-based width hint (used only in Grid.js column defs)
export function widthForLabel(label) {
  const len = Math.max(2, String(label ?? "").length);
  // Use the same comfort profile for hints as well
  return `clamp(${COMFORT.attrMin}px, calc(${len}ch + ${COMFORT.attrPad}px), ${COMFORT.attrMax}px)`;
}

// Compute width hint for a column (Grid.js-level)
export function computeColumnWidth(index, columns, data) {
  if (index === 0) {
    const maxNameLen = data.length
      ? Math.max(...data.map(r => String(r?.[0] ?? "").length))
      : String(columns?.[0] ?? "").length || 6;
    const ch = Math.min(maxNameLen, 40); // keep hint reasonable
    return `clamp(${COMFORT.objMin}px, calc(${ch}ch + ${COMFORT.objPad}px), ${COMFORT.objMax}px)`;
  }
  return widthForLabel(columns?.[index] ?? "");
}

/* ---------- Pixel measuring (Electron-friendly, stable) ---------- */
export function measureTextPx(text, refEl) {
  const probe =
    refEl ||
    document.querySelector(".gridjs-thead .gridjs-th .gridjs-th-content") ||
    document.querySelector(".gridjs-thead .gridjs-th input") ||
    document.querySelector(".gridjs-thead .gridjs-th");

  const font = probe ? getComputedStyle(probe).font : "14px system-ui, sans-serif";
  const canvas = measureTextPx._canvas || (measureTextPx._canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  return Math.ceil(ctx.measureText(String(text || "")).width);
}

export function desiredAttrPx(label) {
  const textPx = measureTextPx(label);
  const { attrMin: min, attrPad: pad, attrMax: max } = COMFORT;
  //return Math.max(min, Math.min(textPx + pad, max));
  return Math.max(min, Math.min(textPx + pad + ATTR_BUTTON_PAD, max));
}

export function desiredObjectColPx(columns, data) {
  // first col = object name
  const names = data.map(r => String(r?.[0] ?? ""));
  const longest = names.reduce((m, s) => Math.max(m, measureTextPx(s)), 0);
  const { objMin: min, objPad: pad, objMax: max } = COMFORT;
  return Math.max(min, Math.min(longest + pad, max));
}

/* ---------- Apply exact pixel widths to cells (fallback) ---------- */
function applyColumnPixelWidth(tableSelector, colIndex, px) {
  const container = document.querySelector(tableSelector);
  if (!container) return;
  const ths = container.querySelectorAll(".gridjs-thead .gridjs-th");
  const trsBody = container.querySelectorAll(".gridjs-tbody tr");

  const setCellWidth = (cell) => {
    cell.style.width = px + "px";
    cell.style.minWidth = px + "px";
    const content = cell.querySelector(".gridjs-th-content");
    if (content) {
      content.style.width = px + "px";
      content.style.minWidth = px + "px";
      content.style.maxWidth = px + "px";
    }
  };

  if (ths[colIndex]) setCellWidth(ths[colIndex]);
  trsBody.forEach(tr => {
    const td = tr.querySelector(`:scope > td:nth-child(${colIndex + 1})`);
    if (td) setCellWidth(td);
  });

  container.querySelector(".gridjs-wrapper")?.getBoundingClientRect(); // force paint
}

export function scheduleColumnWidthPx(tableSelector, colIndex, px) {
  if (scheduleColumnWidthPx._raf) cancelAnimationFrame(scheduleColumnWidthPx._raf);
  scheduleColumnWidthPx._raf = requestAnimationFrame(() => {
    applyColumnPixelWidth(tableSelector, colIndex, px);
    window.dispatchEvent(new Event("resize")); // nudges Electron paints
  });
}

export function snapshotColumnWidths(tableSelector) {
  const container = document.querySelector(tableSelector);
  const ths = container?.querySelectorAll(".gridjs-thead .gridjs-th");
  return ths ? Array.from(ths, th => th.getBoundingClientRect().width) : [];
}

export function applyColumnWidths(tableSelector, widths, removedIndex = null) {
  const container = document.querySelector(tableSelector);
  const ths = container?.querySelectorAll(".gridjs-thead .gridjs-th");
  if (!ths || !widths.length) return;
  Array.from(ths).forEach((th, i) => {
    let src = i;
    if (removedIndex !== null && i >= removedIndex) src = i + 1;
    const w = widths[src];
    if (w) {
      const px = Math.round(w);
      th.style.width = px + "px";
      th.style.minWidth = px + "px";
    }
  });
}

export const nextFrame = (cb) => requestAnimationFrame(() => requestAnimationFrame(cb));
export const forceReflow = (el) => { if (el) el.getBoundingClientRect(); };

/* ---------- <colgroup> “sticky” widths (the main mechanism) ---------- */
export function computeColumnWidthsPx(columns, data) {
  const { objMin, objPad, objMax, attrMin, attrPad, attrMax } = COMFORT;

  // Measure all object names for accuracy (cheap even for 1–2k rows)
  const objText = Math.max(...data.map(r => measureTextPx(r?.[0] ?? "")), 0);
  const widths = [Math.max(objMin, Math.min(objText + objPad, objMax))];

  for (let i = 1; i < columns.length; i++) {
    const label = columns[i];
    //const w = Math.max(attrMin, Math.min(measureTextPx(label) + attrPad, attrMax));
    const w = Math.max(attrMin, Math.min(measureTextPx(label) + attrPad + ATTR_BUTTON_PAD, attrMax));
    widths.push(w);
  }
  return widths;
}

function installColgroup(tableRoot, widthsPx) {
  const table = tableRoot.querySelector(".gridjs-table");
  if (!table) return;

  // remove any previous colgroup we added
  const old = table.querySelector("colgroup[data-owned='1']");
  if (old) old.remove();

  const cg = document.createElement("colgroup");
  cg.setAttribute("data-owned", "1");
  widthsPx.forEach(px => {
    const col = document.createElement("col");
    col.style.width = px + "px";
    cg.appendChild(col);
  });
  table.insertBefore(cg, table.firstChild);
}

// Wait until Grid.js actually put the header in the DOM & measured things
export function whenGridStable(tableSelector, expectedCols, cb) {
  const root = document.querySelector(tableSelector);
  if (!root) return;
  let tries = 0;
  (function tick() {
    const ths = root.querySelectorAll(".gridjs-thead .gridjs-th");
    const table = root.querySelector(".gridjs-table");
    const ready = table && ths.length === expectedCols;
    if (ready || tries > 20) { cb(); return; }
    tries++; requestAnimationFrame(tick);
  })();
}

// One-call API we call after each render
export function applyInitialColumnWidths(tableSelector, columns, data) {
  whenGridStable(tableSelector, columns.length, () => {
    const root = document.querySelector(tableSelector);
    if (!root) return;
    const widths = computeColumnWidthsPx(columns, data);
    installColgroup(root, widths);

    // light fallback to help some themes
    const ths = root.querySelectorAll(".gridjs-thead .gridjs-th");
    const rows = root.querySelectorAll(".gridjs-tbody tr");
    ths.forEach((th, i) => th.style.minWidth = widths[i] + "px");
    rows.forEach(tr => {
      [...tr.children].forEach((td, i) => td.style.minWidth = widths[i] + "px");
    });
  });
}

// Update a single <col> width in the installed colgroup (no full reinstall)
export function setColgroupWidth(tableSelector, colIndex, px) {
  const root = document.querySelector(tableSelector);
  const table = root?.querySelector(".gridjs-table");
  const cg = table?.querySelector('colgroup[data-owned="1"]');
  if (!cg) return;
  const col = cg.children?.[colIndex];
  if (col) col.style.width = px + "px";
}

// Recompute and apply the optimal width for the Object column (col 0)
export function recomputeObjectColWidth(tableSelector, columns, data) {
  const px = desiredObjectColPx(columns, data);
  setColgroupWidth(tableSelector, 0, px);               // updates <colgroup>
  scheduleColumnWidthPx(tableSelector, 0, px);          // fallback per-cell widths
  return px;
}

// Recompute & apply width for an ATTRIBUTE column (>=1) based on its header label
export function recomputeAttrColWidth(tableSelector, colIndex, label) {
  const px = desiredAttrPx(label);
  setColgroupWidth(tableSelector, colIndex, px);   // update <colgroup>
  scheduleColumnWidthPx(tableSelector, colIndex, px); // fallback per-cell widths
  return px;
}

