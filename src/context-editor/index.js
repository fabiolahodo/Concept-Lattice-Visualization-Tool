import { parseSerializedData } from "../lattice/latticeParser.js";
import * as store from "./state/store.js";
import { initTable } from "./table/grid.js";
import { watchPagination, watchResize } from "./table/observe.js";
import { applyInitialColumnWidths, desiredObjectColPx, scheduleColumnWidthPx } from "./table/widths.js";
import { parseCSVFile, parseXLSXFile, parseCXTFile, normalizeCell } from "./io/parsers.js";

/**
 * Initialize the Formal Context editor and wire the surrounding UI.
 *
 * Lazy-mount behavior:
 *  - No table is rendered on load.
 *  - Table mounts the first time the user performs an action (Show/Create/Add/…).
 */
export function initContextEditor(opts = {}) {
  const {
    tableContainer = "#table-content",
    actionsBar = "#table-actions",
    uploadInput = "#upload-json",
    showBtn = "#show-formal-context",
    createBtn = "#create-formal-context",
    addRowBtn = "#add-row",
    addColBtn = "#add-column",
    exportDropdown = "#context-export-dropdown",
    visualizeBtn = "#visualize-lattice",
    onGraphReady = () => {}
  } = opts;

  /* ---------- Defaults (used only when the user clicks "Show") ---------- */
  const defaultData = [
    ["boy",   false, false, true,  true ],
    ["girl",  false, true,  true,  false],
    ["man",   true,  false, false, true ],
    ["woman", true,  true,  false, false],
  ];
  const defaultColumns = ["Object", "adult", "female", "juvenile", "male"];

  // Remember last uploaded things (until cleared via Create)
  let uploadedData = null;      // [[obj, ..bools], ...]
  let uploadedColumns = null;   // ["Object", ...attrs]
  let uploadedGraph = null;     // precomputed lattice JSON
  let uploadedContext = null;   // {objects, properties, context}

  // Boot empty; nothing to render yet
  store.init({ data: [], columns: [] });

  // Hide UI parts on load (also add class="hidden" in HTML for no-flash)
  const actionsEl = document.querySelector(actionsBar);
  const exportEl  = document.querySelector(exportDropdown);
  const tableEl   = document.querySelector(tableContainer);
  actionsEl?.classList.add("hidden");
  exportEl?.classList.add("hidden");
  tableEl?.classList.add("hidden");

  // Grid instance is created lazily
  let gridApi = null;
  let observersBound = false;

  /**
   * Ensure the Grid.js table is mounted. No-op if already mounted.
   * Also unhides controls and binds observers (once).
   */
  function ensureTableMounted() {
    if (gridApi) return;

    gridApi = initTable({
      tableSelector: tableContainer,
      getState: () => store.get(),
      setState: (next) => store.set(next)
    });

    tableEl?.classList.remove("hidden");
    actionsEl?.classList.remove("hidden");
    exportEl?.classList.remove("hidden");

    if (!observersBound) {
      const reapply = () => {
        const { data, columns } = store.get();
        if (!columns.length) return; // nothing to size yet
        applyInitialColumnWidths(tableContainer, columns, data);
      };
      watchPagination(tableContainer, reapply);
      watchResize(tableContainer, reapply);
      observersBound = true;
    }
  }

  /* ---------- Create blank context modal ---------- */
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function buildBlankContext(rows, cols) {
    const attrs = Array.from({ length: cols }, (_, j) => `attr_${j + 1}`);
    const columnsNew = ["Object", ...attrs];
    const dataNew = Array.from({ length: rows }, (_, i) => {
      const name = `obj_${i + 1}`;
      return [name, ...Array(cols).fill(false)];
    });
    return { columnsNew, dataNew };
  }

  function makeCreateContextModal() {
    const modal   = document.getElementById("create-context-modal");
    if (!modal) return { open: () => {} };

    const rowsInp = modal.querySelector("#ccm-rows");
    const colsInp = modal.querySelector("#ccm-cols");
    const okBtn   = modal.querySelector("#ccm-confirm");
    const cancel  = modal.querySelector("#ccm-cancel");

    const open = () => {
      const { data, columns } = store.get();
      rowsInp.value = String(data.length || 4);
      colsInp.value = String(Math.max(0, (columns.length - 1)) || 4);
      modal.classList.remove("hidden");
      setTimeout(() => rowsInp.focus(), 0);
    };
    const close = () => modal.classList.add("hidden");

    okBtn.addEventListener("click", () => {
      const r = clamp(parseInt(rowsInp.value, 10) || 0, 1, 500);
      const c = clamp(parseInt(colsInp.value, 10) || 0, 1, 500);

      // Reset any uploaded state when creating a new blank context
      uploadedData = uploadedColumns = uploadedContext = uploadedGraph = null;

      const { columnsNew, dataNew } = buildBlankContext(r, c);
      store.set({ data: dataNew, columns: columnsNew });

      // Mount now (first visible action)
      ensureTableMounted();
      gridApi.update();

      // Keep object col width in sync while empty
      const px = desiredObjectColPx(columnsNew, dataNew);
      scheduleColumnWidthPx(tableContainer, 0, px);

      close();
    });

    cancel.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

    return { open, close };
  }
  const createCtxModal = makeCreateContextModal();

  /* ---------- Buttons: Show / Create / Add Row / Add Column ---------- */
  document.querySelector(showBtn)?.addEventListener("click", () => {
    // Nothing visible yet; user explicitly asks to show something now
    ensureTableMounted();
    const tableD = Array.isArray(uploadedData) ? uploadedData : defaultData;
    const tableC = Array.isArray(uploadedColumns) ? uploadedColumns : defaultColumns;
    store.set({ data: tableD, columns: tableC });
    gridApi.update();
  });

  document.querySelector(createBtn)?.addEventListener("click", (e) => {
    e.preventDefault();
    createCtxModal.open();
  });

  document.getElementById(stripHash(addRowBtn))?.addEventListener("click", () => {
    ensureTableMounted();
    const { data, columns } = store.get();
    const next = { data: [...data, ["New Object", ...Array(Math.max(0, columns.length - 1)).fill(false)]], columns };
    store.set(next);
    gridApi.update();
  });

  document.getElementById(stripHash(addColBtn))?.addEventListener("click", () => {
    ensureTableMounted();
    const { data, columns } = store.get();
    const newName = `New Attribute ${columns.length}`;
    const next = {
      columns: [...columns, newName],
      data: data.map(r => [...r, false])
    };
    store.set(next);
    gridApi.update();
  });

  /* ---------- Upload handling (lazy: do NOT mount immediately) ---------- */
  document.querySelector(uploadInput)?.addEventListener("change", async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const name = (file.name || "").toLowerCase();
    try {
      if (name.endsWith(".csv")) {
        const { objects, attributes, matrix } = await parseCSVFile(file);
        uploadedColumns = ["Object", ...attributes];
        uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
        uploadedContext = { objects, properties: attributes, context: matrix };
        uploadedGraph = null;
        alert("✅ CSV context loaded. Click 'Show Formal Context' to display it.");
        return;
      }
      if (name.endsWith(".xlsx")) {
        const { objects, attributes, matrix } = await parseXLSXFile(file);
        uploadedColumns = ["Object", ...attributes];
        uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
        uploadedContext = { objects, properties: attributes, context: matrix };
        uploadedGraph = null;
        alert("✅ XLSX context loaded. Click 'Show Formal Context' to display it.");
        return;
      }
      if (name.endsWith(".cxt")) {
        const { objects, attributes, matrix } = await parseCXTFile(file);
        uploadedColumns = ["Object", ...attributes];
        uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
        uploadedContext = { objects, properties: attributes, context: matrix };
        uploadedGraph = null;
        alert("✅ CXT context loaded. Click 'Show Formal Context' to display it.");
        return;
      }
      // JSON fallback
      const text = await file.text();
      const imported = JSON.parse(text);
      if (imported.nodes && imported.links) {
        uploadedGraph = imported;
        uploadedContext = null;
        alert("✅ Lattice JSON loaded. Click 'Visualize Lattice'.");
      } else if (imported.objects && imported.properties && imported.context) {
        uploadedColumns = ["Object", ...imported.properties];
        uploadedData = imported.objects.map((obj, rowIdx) => [obj, ...imported.context[rowIdx].map(normalizeCell)]);
        uploadedContext = { objects: imported.objects, properties: imported.properties, context: imported.context };
        uploadedGraph = null;
        alert("✅ Formal context JSON loaded. Click 'Show Formal Context' or 'Visualize Lattice'.");
      } else if (Array.isArray(imported.data) && Array.isArray(imported.columns)) {
        uploadedColumns = imported.columns.slice();
        uploadedData = imported.data.map(row => [row[0], ...row.slice(1).map(normalizeCell)]);
        uploadedContext = {
          objects: uploadedData.map(r => r[0]),
          properties: uploadedColumns.slice(1),
          context: uploadedData.map(r => r.slice(1))
        };
        uploadedGraph = null;
        alert("✅ Formal context JSON loaded. Click 'Show Formal Context' or 'Visualize Lattice'.");
      } else {
        alert("Invalid JSON format!");
      }
    } catch (err) {
      alert("Error parsing file: " + err.message);
    }
  });

  /* ---------- Export ---------- */
  document.querySelector(exportDropdown)?.addEventListener("change", (event) => {
    const value = event.target?.value;
    if (!value) return;

    const { objects, properties, contextMatrix } = store.currentContext();
    if (!objects?.length || !properties?.length) {
      alert("Nothing to export yet. Load or create a context first.");
      event.target.value = "";
      return;
    }

    if (value === "export-context-json") {
      const serialized = { objects, properties, context: contextMatrix };
      downloadBlob(JSON.stringify(serialized, null, 2), "formal_context.json", "application/json");
    }
    if (value === "export-context-csv") {
      const { data, columns } = store.get();
      const header = columns.join(",");
      const rows = data.map(row => row.join(",")).join("\n");
      downloadBlob(header + "\n" + rows, "formal_context.csv", "text/csv");
    }
    if (value === "export-context-cxt") {
      const lines = [];
      lines.push("B");
      lines.push(String(objects.length));
      lines.push(String(properties.length));
      lines.push("");
      objects.forEach(o => lines.push(o));
      properties.forEach(p => lines.push(p));
      lines.push("");
      contextMatrix.forEach(row => lines.push(row.map(v => (v ? "X" : ".")).join("")));
      downloadBlob(lines.join("\n"), "formal_context.cxt", "text/plain");
    }
    event.target.value = "";
  });

  /* ---------- Visualize ---------- */
  function resolveContextForVisualization() {
    const grid = store.currentContext(); // {objects, properties, contextMatrix}
    if (grid.objects?.length && grid.properties?.length) {
      return { objects: grid.objects, properties: grid.properties, context: grid.contextMatrix };
    }
    if (uploadedContext && uploadedContext.objects?.length && uploadedContext.properties?.length) {
      return { objects: uploadedContext.objects, properties: uploadedContext.properties, context: uploadedContext.context };
    }
    // No implicit defaults here; visualization is an explicit action
    throw new Error("No context available. Load a file or click 'Show/Create Formal Context' first.");
  }

  function validateContext(ctx) {
    const { objects, properties, context } = ctx;
    if (!objects.length || !properties.length) throw new Error("Context is empty (no objects or attributes).");
    if (!Array.isArray(context) || context.length !== objects.length) throw new Error("Context row count must equal number of objects.");
    for (const row of context) {
      if (!Array.isArray(row) || row.length !== properties.length) {
        throw new Error("Each row must have a value for every attribute.");
      }
    }
  }

  document.querySelector(visualizeBtn)?.addEventListener("click", async () => {
    try {
      if (uploadedGraph) { onGraphReady(uploadedGraph); return; }

      const ctx = resolveContextForVisualization();
      validateContext(ctx);

      const response = await fetch("http://localhost:3000/compute-lattice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objects: ctx.objects,
          properties: ctx.properties,
          context: ctx.context
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const backendResult = await response.json();
      const graphData = parseSerializedData(backendResult);
      onGraphReady(graphData);
    } catch (err) {
      alert("Lattice computation failed: " + err.message);
      console.error(err);
    }
  });

  /* ---------- Small helpers ---------- */
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  function stripHash(sel) { return sel && sel.charAt(0) === "#" ? sel.slice(1) : sel; }

  // Public API if you need to feed an external context programmatically
  return {
    getContext: () => store.currentContext(),
    setContext: ({ objects, properties, context }) => {
      uploadedColumns = ["Object", ...properties];
      uploadedData = objects.map((obj, i) => [obj, ...context[i]]);
      store.set({ data: uploadedData, columns: uploadedColumns });
      ensureTableMounted();
      gridApi.update();
    }
  };
}
