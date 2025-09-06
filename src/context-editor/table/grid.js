// src/context-editor/table/grid.js
import { Grid, html, h } from "gridjs";
import {
  // no computeColumnWidth, no desiredAttrPx, no scheduleColumnWidthPx
  applyInitialColumnWidths,
  snapshotColumnWidths,
  applyColumnWidths,
  nextFrame,
  forceReflow,
  recomputeObjectColWidth,
  recomputeAttrColWidth
} from "./widths.js";

/**
 * Create and manage the Grid.js table.
 *
 * Public API (unchanged):
 *   const api = initTable({ tableSelector, getState, setState });
 *   api.update();   // re-render & re-apply widths
 *   api.destroy();  // clean up
 */
export function initTable({ tableSelector, getState, setState }) {
  let gridInstance = null;

    // Selection state
  let selectedRow = -1;
  let selectedCol = -1;

  function clearSelection() {
    selectedRow = -1;
    selectedCol = -1;
    paintSelection();
  }

  function paintSelection() {
    const root = document.querySelector(tableSelector);
    if (!root) return;

    // clear old
    root.querySelectorAll(".gridjs-tr").forEach(tr => tr.classList.remove("selected-row"));
    root.querySelectorAll(".gridjs-th, .gridjs-td").forEach(td => td.classList.remove("selected-col"));

    // paint new
    if (selectedRow >= 0) {
      const tr = root.querySelector(`.gridjs-tbody .gridjs-tr:nth-child(${selectedRow + 1})`);
      if (tr) tr.classList.add("selected-row");
    }
    if (selectedCol >= 0) {
      // header cell
      const th = root.querySelector(`.gridjs-thead .gridjs-tr .gridjs-th:nth-child(${selectedCol + 1})`);
      if (th) th.classList.add("selected-col");
      // all body td in that col
      root.querySelectorAll(`.gridjs-tbody .gridjs-tr`).forEach(tr => {
        const td = tr.querySelector(`:scope > td:nth-child(${selectedCol + 1})`);
        if (td) td.classList.add("selected-col");
      });
    }
  }

  // Helper: set selection and repaint
  function setSelection(rowIdx, colIdx) {
    selectedRow = rowIdx;
    selectedCol = colIdx;
    paintSelection();
  }

  /* ------------------------------ Renderers ------------------------------ */

  function renderObjectName(value, rowIndex) {
    // First column: editable object name + delete row button
    return html(`
      <div class="rename-object-container">
        <input type="text"
               value="${escapeAttr(value)}"
               title="${escapeAttr(value)}"
               data-row="${rowIndex}"
               class="rename-object" />
        <button class="delete-row" data-row="${rowIndex}" title="Delete row">🗑️</button>
      </div>
    `);
  }

  function renderCheckbox(value, rowIndex, colIndex) {
    if (colIndex === 0) return renderObjectName(value, rowIndex);
    return html(
      `<input type="checkbox"
              ${value ? "checked" : ""}
              data-row="${rowIndex}"
              data-col="${colIndex}" />`
    );
  }

  function generateGridData(data) {
    return data.map((row, rowIndex) =>
      row.map((value, colIndex) => renderCheckbox(value, rowIndex, colIndex))
    );
  }

  function getColumns(columns, data) {
    // debounce so header typing doesn’t thrash widths
    const debounce = (fn, ms = 120) => {
      let t = null;
      return (...args) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    };
    const debouncedApply = debounce((colIndex, label) => {
      // single authority for width changes
      recomputeAttrColWidth(tableSelector, colIndex, label);
    }, 120);

    return columns.map((col, index) => ({
      id: `col-${index}`,
      // ❌ Removed inline width: computeColumnWidth(...) to avoid conflicts
      name:
        index === 0
          ? col
          : h("div", { className: "rename-attribute-container" }, [
              h("input", {
                type: "text",
                value: col,
                title: col,
                size: Math.max(2, Math.min(30, String(col).length)),
                "data-col": String(index),
                className: "rename-attribute",
                style: "flex:1 1 auto;", // allow flex growth; actual width via <colgroup>
                onmousedown: (e) => e.stopPropagation(),
                onclick: (e) => e.stopPropagation(),
                onpointerdown: (e) => e.stopPropagation(),
                oninput: (e) => {
                  const val = e.target.value;
                  e.target.size = Math.max(2, Math.min(30, val.length));
                  e.target.title = val;
                  debouncedApply(index, val); // <— single path for width update
                }
              }),
              h(
                "button",
                {
                  className: "delete-column",
                  "data-col": String(index),
                  title: "Delete column",
                  onmousedown: (e) => e.stopPropagation(),
                  onpointerdown: (e) => e.stopPropagation(),
                  onclick: (e) => {
                    e.stopPropagation();
                    handleDeleteColumn(index);
                  }
                },
                "🗑️"
              )
            ])
    }));
  }

  /* ------------------------------ Mount & Update ------------------------------ */

  function mount() {
    const root = document.querySelector(tableSelector);
    if (!root) return;
    root.innerHTML = "";

    const { data, columns } = getState();

    gridInstance = new Grid({
      columns: getColumns(columns, data),
      data: generateGridData(data),
      search: { enabled: true, placeholder: "Type a keyword..." },
      sort: false,
      //pagination: { limit: 14 }, // paged rows so headers have room
      pagination: false,
      fixedHeader: true,
      height: "70vh"
    });

    gridInstance.render(root);

    // Initial widths + follow-up passes
    applyInitialColumnWidths(tableSelector, columns, data);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() =>
        applyInitialColumnWidths(tableSelector, columns, data)
      );
    }
    setTimeout(() => applyInitialColumnWidths(tableSelector, columns, data), 180);

    // ---------------- Delegated UI handlers (survive re-renders) ----------------
/*
    // Delete row / delete column
    root.addEventListener("click", (event) => {
      const el = event.target;
      if (!(el instanceof Element)) return;

      if (el.classList.contains("delete-row")) {
        const rowIndex = Number(el.getAttribute("data-row"));
        const next = getState();
        if (Number.isInteger(rowIndex) && next.data[rowIndex]) {
          next.data.splice(rowIndex, 1);
          setState(next);
          update();
          const { columns: cols, data: rows } = getState();
          recomputeObjectColWidth(tableSelector, cols, rows);
        }
      }

      if (el.classList.contains("delete-column")) {
        const colIndex = Number(el.getAttribute("data-col"));
        handleDeleteColumn(colIndex);
      }
    });
*/

// ---- NEW: selection handlers (delegated) ----
    // 1) Clicking body cells selects row+col
    root.addEventListener("click", (event) => {
      const el = event.target;
      if (!(el instanceof Element)) return;

      // header attribute inputs select the column
      if (el.classList.contains("rename-attribute")) {
        const ci = Number(el.getAttribute("data-col"));
        if (Number.isInteger(ci)) setSelection(-1, ci);
        return;
      }
      // clicking the object-name editor selects its row & col 0
      if (el.classList.contains("rename-object")) {
        const ri = Number(el.getAttribute("data-row"));
        if (Number.isInteger(ri)) setSelection(ri, 0);
        return;
      }
      // clicking a checkbox selects its row/col
      if (el.matches('input[type="checkbox"]')) {
        const ri = Number(el.getAttribute("data-row"));
        const ci = Number(el.getAttribute("data-col"));
        if (Number.isInteger(ri) && Number.isInteger(ci)) setSelection(ri, ci);
        return;
      }

      // fallback: if they click inside a table cell
      const td = el.closest(".gridjs-td");
      if (td) {
        const tr = td.parentElement;
        const ri = Array.from(tr.parentElement.children).indexOf(tr); // 0-based
        const ci = Array.from(tr.children).indexOf(td);               // 0-based
        setSelection(ri, ci);
      }
    });

    // Optional: clicking empty space clears selection
    root.addEventListener("click", (e) => {
      if (e.target === root) clearSelection();
    });


    // Toggle checkbox (change)
    root.addEventListener("change", (event) => {
      const el = event.target;
      if (!(el instanceof Element)) return;
      if (el.matches('input[type="checkbox"]')) {
        const rowIndex = Number(el.getAttribute("data-row"));
        const colIndex = Number(el.getAttribute("data-col"));
        const checked = el.checked;
        const next = getState();
        if (next.data[rowIndex] && colIndex > 0) {
          next.data[rowIndex][colIndex] = checked;
          setState(next);
        }
      }
    });

    // Live rename: ATTRIBUTE (header) — state only; width handled by inline debounced handler
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (!el.classList.contains("rename-attribute")) return;

      const colIndex = Number(el.getAttribute("data-col"));
      const val = el.value;

      const next = getState();
      if (next.columns[colIndex] !== val) {
        next.columns[colIndex] = val;
        setState(next);
      }
      // ❌ Removed duplicate width calls here (no desiredAttrPx / scheduleColumnWidthPx)
    });

    // Commit attribute rename on Enter/blur (refresh header DOM)
    root.addEventListener(
      "keydown",
      (e) => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        if (!el.classList.contains("rename-attribute")) return;
        if (e.key !== "Enter") return;
        e.stopPropagation();
        gridApiUpdate();
      }
    );
    root.addEventListener(
      "blur",
      (e) => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        if (!el.classList.contains("rename-attribute")) return;
        gridApiUpdate();
      },
      true
    );

    // Live rename: OBJECT (first column)
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (!el.classList.contains("rename-object")) return;

      const rowIndex = Number(el.getAttribute("data-row"));
      const val = el.value;

      const next = getState();
      if (next.data[rowIndex] && next.data[rowIndex][0] !== val) {
        next.data[rowIndex][0] = val;
        setState(next);
      }

      // live-resize first column while typing
      const { columns: cols, data: rows } = getState();
      recomputeObjectColWidth(tableSelector, cols, rows);
    });

    // Commit object rename on Enter/blur
    root.addEventListener(
      "keydown",
      (e) => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        if (!el.classList.contains("rename-object")) return;
        if (e.key !== "Enter") return;
        e.stopPropagation();
        gridApiUpdate();
        const { columns: cols, data: rows } = getState();
        recomputeObjectColWidth(tableSelector, cols, rows);
      }
    );
    root.addEventListener(
      "blur",
      (e) => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        if (!el.classList.contains("rename-object")) return;
        gridApiUpdate();
        const { columns: cols, data: rows } = getState();
        recomputeObjectColWidth(tableSelector, cols, rows);
      },
      true
    );
  }

  function handleDeleteColumn(colIndex) {
    if (!Number.isInteger(colIndex) || colIndex <= 0) return; // protect "Object" column
    const prevWidths = snapshotColumnWidths(tableSelector);
    const next = getState();
    if (colIndex >= next.columns.length) return;

    next.columns.splice(colIndex, 1);
    next.data = next.data.map((row) => row.filter((_, i) => i !== colIndex));
    setState(next);

    update();

    // Restore perceived widths so the layout doesn’t jump
    nextFrame(() => {
      applyColumnWidths(tableSelector, prevWidths, colIndex);
      const container = document.querySelector(tableSelector);
      forceReflow(container?.querySelector(".gridjs-wrapper"));
      // recompute first column as it may have shifted visually
      const { columns: cols, data: rows } = getState();
      recomputeObjectColWidth(tableSelector, cols, rows);
      // adjust selection
      if (selectedCol === colIndex) selectedCol = -1;
      else if (selectedCol > colIndex) selectedCol--;
      paintSelection();
    });
  }

   // NEW: delete via current selection
  function deleteSelectedRow() {
    if (selectedRow < 0) return;
    const next = getState();
    if (!next.data[selectedRow]) return;
    next.data.splice(selectedRow, 1);
    setState(next);
    update();
    // bump selection
    selectedRow = Math.min(selectedRow, next.data.length - 1);
    if (next.data.length === 0) selectedRow = -1;
    paintSelection();
    // resize first col (names may shift)
    const { columns: cols, data: rows } = getState();
    recomputeObjectColWidth(tableSelector, cols, rows);
  }

  function deleteSelectedColumn() {
    if (selectedCol <= 0) return; // col 0 is "Object" — protected
    handleDeleteColumn(selectedCol);
  }

  // Rebuild grid with current store data and re-apply widths
  function update() {
    if (!gridInstance) {
      mount();
      return;
    }
    const { data, columns } = getState();
    gridInstance
      .updateConfig({
        columns: getColumns(columns, data),
        data: generateGridData(data),
        search: { enabled: true, placeholder: "Type a keyword..." },
        sort: false,
        pagination: { limit: 14 },
        fixedHeader: true,
        height: "70vh"
      })
      .forceRender();
/*
    applyInitialColumnWidths(tableSelector, columns, data);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() =>
        applyInitialColumnWidths(tableSelector, columns, data);
          // repaint selection overlays
        nextFrame(paintSelection);
    }
    setTimeout(() => applyInitialColumnWidths(tableSelector, columns, data), 150);
  }
*/

applyInitialColumnWidths(tableSelector, columns, data);

// If fonts are still loading, re-apply widths once they’re ready, then repaint selection.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    applyInitialColumnWidths(tableSelector, columns, data);
    nextFrame(paintSelection);
  });
}

// Fallback pass a bit later, also repaint selection after that pass.
setTimeout(() => {
  applyInitialColumnWidths(tableSelector, columns, data);
  nextFrame(paintSelection);
}, 150);

}
  // Internal helper used by delegated rename commits
  function gridApiUpdate() {
    const { data, columns } = getState();
    gridInstance
      .updateConfig({
        columns: getColumns(columns, data),
        data: generateGridData(data),
        search: { enabled: true, placeholder: "Type a keyword..." },
        sort: false,
        pagination: { limit: 14 },
        fixedHeader: true,
        height: "70vh"
      })
      .forceRender();
    applyInitialColumnWidths(tableSelector, columns, data);
    nextFrame(paintSelection);
  }

  function destroy() {
    const root = document.querySelector(tableSelector);
    gridInstance?.destroy?.();
    gridInstance = null;
    if (root) root.innerHTML = "";
  }

  // First mount immediately (container is created lazily by index.js)
  mount();

  return { 
    update, 
    destroy, 
    getSelection: () => ({ row: selectedRow, col: selectedCol }),
    deleteSelectedRow,
    deleteSelectedColumn };
}

/* ------------------------------ Small utils ------------------------------ */

function escapeAttr(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
