// src/context-editor/formalContext.js
import { Grid, html, h } from "gridjs";
import { parseSerializedData } from "../lattice/latticeParser.js";

/**
 * Initialize the Formal Context editor (Grid.js)
 * @param {Object} opts
 * @param {string} opts.tableContainer
 * @param {string} opts.actionsBar
 * @param {string} opts.uploadInput
 * @param {string} opts.showBtn
 * @param {string} opts.createBtn
 * @param {string} opts.addRowBtn
 * @param {string} opts.addColBtn
 * @param {string} opts.exportDropdown
 * @param {string} opts.visualizeBtn
 * @param {(graphData:Object)=>void} opts.onGraphReady
 */

// ------------------ Parsers ------------------

function normalizeCell(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (s === "" || s === "." || s === "0" || /^false$/i.test(s) || /^no$/i.test(s)) return false;
  return true; // treat "X", "1", "true", "yes" as true
}

async function parseCSVFile(file) {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(",").map(x => x.trim()));

  if (rows.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const attributes = rows[0].slice(1);
  const objects = rows.slice(1).map(r => r[0]);
  const matrix = rows.slice(1).map(r => r.slice(1).map(normalizeCell));
  return { objects, attributes, matrix };
}

async function parseXLSXFile(file) {
  const data = await file.arrayBuffer();
  const wb = window.XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 }).map(r => (Array.isArray(r) ? r : []));
  if (rows.length < 2) throw new Error("XLSX must have a header row and at least one data row.");
  const attributes = (rows[0] || []).slice(1).map(c => (c ?? "").toString());
  const objects = rows.slice(1).map(r => (r[0] ?? "").toString());
  const matrix = rows.slice(1).map(r => attributes.map((_, j) => normalizeCell(r.slice(1)[j])));
  return { objects, attributes, matrix };
}

async function parseCXTFile(file) {
  const text = await file.text();

  // DO NOT filter out blank lines; they are meaningful in .cxt
  const lines = text.split(/\r?\n/).map(l => l.replace(/\r/g, "")); // keep empties

  let idx = 0;

  // header (usually "B")
  const header = (lines[idx++] ?? "").trim();

  // context name: may be empty line
  const contextName = (lines[idx++] ?? ""); // keep as-is; can be ""

  // counts
  let objCount = parseInt((lines[idx++] ?? "").trim(), 10);
  let attrCount = parseInt((lines[idx++] ?? "").trim(), 10);
  if (isNaN(objCount) || isNaN(attrCount)) {
    throw new Error("Invalid CXT header (object/attribute counts).");
  }

  // optional blank separator before object names
  if (((lines[idx] ?? "").trim()) === "") idx++;

  // read object names (skip accidental extra blanks)
  const objects = [];
  for (let i = 0; i < objCount; i++) {
    let s = (lines[idx++] ?? "");
    while (s.trim() === "" && idx < lines.length) s = (lines[idx++] ?? "");
    objects.push(s.trim());
  }

  // read attribute names (skip accidental extra blanks)
  const attributes = [];
  for (let j = 0; j < attrCount; j++) {
    let s = (lines[idx++] ?? "");
    while (s.trim() === "" && idx < lines.length) s = (lines[idx++] ?? "");
    attributes.push(s.trim());
  }

  // optional blank separator before incidence matrix
  if (((lines[idx] ?? "").trim()) === "") idx++;

  // incidence rows: exactly attrCount chars per row; skip stray blanks
  const matrix = [];
  for (let r = 0; r < objCount; r++) {
    let row = (lines[idx++] ?? "");
    while (row.trim() === "" && idx < lines.length) row = (lines[idx++] ?? "");
    row = row.trim();

    if (row.length !== attrCount) {
      throw new Error(`CXT row ${r} length ${row.length} != ${attrCount}`);
    }
    matrix.push([...row].map(c => (c === "X" || c === "x" ? true : false)));
  }

  return { objects, attributes, matrix };
}

// ------------------ Editor Init ------------------

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

  // Demo defaults
  let defaultData = [
    ["boy", false, false, true, true],
    ["girl", false, true, true, false],
    ["man", true, false, false, true],
    ["woman", true, true, false, false],
  ];
  let defaultColumns = ["Object", "adult", "female", "juvenile", "male"];

  // --- State ---
  let data = [];
  let columns = [];
  let gridInstance = null;

  // uploaded
  let uploadedData = null;
  let uploadedColumns = null;
  let uploadedGraph = null;     // if user uploads a lattice JSON
  let uploadedContext = null;   // if user uploads a context

  // -------- Grid.js table helpers --------
  function initTable(d, c, opts2 = {}) {
    data = JSON.parse(JSON.stringify(d));
    columns = JSON.parse(JSON.stringify(c));

    if (gridInstance) {
      gridInstance.destroy();
      gridInstance = null;
    }

    const container = document.querySelector(tableContainer);
    if (!container) return;
    container.innerHTML = "";

    gridInstance = new Grid({
      columns: getColumns(),
      data: generateGridData(),
      search: true,
      sort: true,
      pagination: { limit: 10 }
    });

    gridInstance.render(container);
    const bar = document.querySelector(actionsBar);
    if (bar) bar.classList.remove("hidden");

    if (opts2.focus) setTimeout(() => {
      const input = container.querySelector("input");
      if (input) input.focus();
    }, 0);
  }

  function renderObjectName(value, rowIndex) {
    return html(`
      <div style="display:flex;align-items:center;">
        <input type="text" value="${value}" data-row="${rowIndex}" class="rename-object" />
        <button class="delete-row" data-row="${rowIndex}" style="margin-left:6px;color:red;">🗑️</button>
      </div>
    `);
  }

  function renderCheckbox(value, rowIndex, colIndex) {
    if (colIndex === 0) return renderObjectName(value, rowIndex);
    return html(`<input type="checkbox" ${value ? "checked" : ""} data-row="${rowIndex}" data-col="${colIndex}" />`);
  }

  function generateGridData() {
    return data.map((row, rowIndex) =>
      row.map((value, colIndex) => renderCheckbox(value, rowIndex, colIndex))
    );
  }

  function getColumns() {
    return columns.map((col, index) => ({
      id: `col-${index}`,
      name: index === 0
        ? col
        : h("div", { style: "display:flex;align-items:center;" }, [
            h("input", {
              type: "text",
              value: col,
              "data-col": String(index),
              className: "rename-attribute",
              onkeydown: (event) => {
                if (event.key === "Enter") {
                  columns[index] = event.target.value;
                  updateTableData();
                }
              }
            }),
            h("button", {
              className: "delete-column",
              "data-col": String(index),
              style: "margin-left:6px;color:red;",
              onclick: (event) => handleDeleteColumn(event, index)
            }, "🗑️")
          ])
    }));
  }

  function updateTableData(opts2 = {}) {
    if (!gridInstance) return;
    gridInstance.updateConfig({
      columns: getColumns(),
      data: generateGridData(),
      search: true,
      sort: true,
      pagination: { limit: 10 }
    }).forceRender();

    if (opts2.focus) {
      const container = document.querySelector(tableContainer);
      if (!container) return;
      setTimeout(() => {
        const input = container.querySelector("input");
        if (input) input.focus();
      }, 0);
    }
  }

  function addRow() {
    const newRow = ["New Object", ...Array(columns.length - 1).fill(false)];
    data.push(newRow);
    updateTableData({ focus: true });
  }

  function addColumn() {
    const newAttributeName = `New Attribute ${columns.length}`;
    columns.push(newAttributeName);
    data.forEach(row => row.push(false));
    updateTableData({ focus: true });
  }

  function handleDeleteColumn(_event, colIndex) {
    if (colIndex > 0 && colIndex < columns.length) {
      columns.splice(colIndex, 1);
      data = data.map(row => row.filter((_, i) => i !== colIndex));
      updateTableData();
    }
  }

  // -------- Upload handling --------
  const uploadEl = document.querySelector(uploadInput);
  if (uploadEl) {
    uploadEl.addEventListener("change", async (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;

      const name = (file.name || "").toLowerCase();
      try {
        // CSV
        if (name.endsWith(".csv")) {
          const { objects, attributes, matrix } = await parseCSVFile(file);
          uploadedColumns = ["Object", ...attributes];
          uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
          uploadedContext = { objects, properties: attributes, context: matrix };
          uploadedGraph = null;
          alert("✅ CSV context loaded. Show or visualize it.");
          return;
        }
        // XLSX
        if (name.endsWith(".xlsx")) {
          const { objects, attributes, matrix } = await parseXLSXFile(file);
          uploadedColumns = ["Object", ...attributes];
          uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
          uploadedContext = { objects, properties: attributes, context: matrix };
          uploadedGraph = null;
          alert("✅ XLSX context loaded. Show or visualize it.");
          return;
        }
        // CXT
        if (name.endsWith(".cxt")) {
          const { objects, attributes, matrix } = await parseCXTFile(file);
          uploadedColumns = ["Object", ...attributes];
          uploadedData = objects.map((obj, i) => [obj, ...matrix[i]]);
          uploadedContext = { objects, properties: attributes, context: matrix };
          uploadedGraph = null;
          alert("✅ CXT context loaded. Show or visualize it.");
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
          uploadedData = imported.objects.map((obj, rowIdx) => ([obj, ...imported.context[rowIdx].map(normalizeCell)]));
          uploadedContext = { objects: imported.objects, properties: imported.properties, context: imported.context };
          uploadedGraph = null;
          alert("✅ Formal context JSON loaded. Show or visualize it.");
        } else if (Array.isArray(imported.data) && Array.isArray(imported.columns)) {
          uploadedColumns = imported.columns.slice();
          uploadedData = imported.data.map(row => [row[0], ...row.slice(1).map(normalizeCell)]);
          uploadedContext = { objects: imported.data.map(r => r[0]), properties: imported.columns.slice(1), context: imported.data.map(r => r.slice(1)) };
          uploadedGraph = null;
          alert("✅ Formal context JSON loaded. Show or visualize it.");
        } else {
          alert("Invalid JSON format!");
        }
      } catch (err) {
        alert("Error parsing file: " + err.message);
      }
    });
  }

  // -------- Show / Create --------
  const showBtnEl = document.querySelector(showBtn);
  if (showBtnEl) {
    showBtnEl.addEventListener("click", () => {
      if (!uploadedData || !uploadedColumns) {
        alert("Please upload a formal context file first.");
        return;
      }
      initTable(uploadedData, uploadedColumns, { focus: true });
    });
  }

  const createBtnEl = document.querySelector(createBtn);
  if (createBtnEl) {
    createBtnEl.addEventListener("click", () => {
      initTable(defaultData, defaultColumns, { focus: true });
    });
  }

  // -------- Row/col actions --------
  document.addEventListener("click", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.id === stripHash(addRowBtn)) addRow();
    if (el.id === stripHash(addColBtn)) addColumn();
    if (el.classList.contains("delete-row")) {
      const rowIndex = Number(el.getAttribute("data-row"));
      data.splice(rowIndex, 1);
      updateTableData();
    }
    if (el.classList.contains("delete-column")) {
      const colIndex = Number(el.getAttribute("data-col"));
      handleDeleteColumn(event, colIndex);
    }
  });

  document.addEventListener("keydown", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.classList.contains("rename-object") && event.key === "Enter") {
      const rowIndex = Number(el.getAttribute("data-row"));
      data[rowIndex][0] = el.value;
      updateTableData();
    }
    if (el.classList.contains("rename-attribute") && event.key === "Enter") {
      const colIndex = Number(el.getAttribute("data-col"));
      columns[colIndex] = el.value;
      updateTableData();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches('input[type="checkbox"]')) {
      const rowIndex = Number(el.getAttribute("data-row"));
      const colIndex = Number(el.getAttribute("data-col"));
      const checked = el.checked;
      data[rowIndex][colIndex] = checked;
    }
  });

  // -------- Export --------
  const exportEl = document.querySelector(exportDropdown);
  if (exportEl) {
    exportEl.addEventListener("change", (event) => {
      const value = event.target?.value;
      if (!value) return;
      const { objects, properties, contextMatrix } = currentContext();
      if (value === "export-context-json") {
        const serialized = { objects, properties, context: contextMatrix };
        downloadBlob(JSON.stringify(serialized, null, 2), "formal_context.json", "application/json");
      }
      if (value === "export-context-csv") {
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
  }

  // -------- Visualize --------
  const visBtnEl = document.querySelector(visualizeBtn);
  if (visBtnEl) {
    visBtnEl.addEventListener("click", async () => {
      try {
        if (uploadedGraph) {
          // directly visualize a lattice JSON
          onGraphReady(uploadedGraph);
          return;
        }
        const { objects, properties, contextMatrix } = currentContext();
        const payload = { objects, properties, context: contextMatrix };
        const response = await fetch("http://localhost:3000/compute-lattice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(await response.text());
        const backendResult = await response.json();
        const graphData = parseSerializedData(backendResult);
        onGraphReady(graphData);
      } catch (err) {
        alert("Lattice computation failed: " + err.message);
      }
    });
  }

  // -------- helpers --------
  function currentContext() {
    const objects = data.map(row => row[0]);
    const properties = columns.slice(1);
    const contextMatrix = data.map(row => row.slice(1));
    return { objects, properties, contextMatrix };
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function stripHash(sel) {
    return sel && sel.charAt(0) === "#" ? sel.slice(1) : sel;
  }

  return {
    getContext: () => currentContext(),
    setContext: ({ objects, properties, context }) => {
      uploadedColumns = ["Object", ...properties];
      uploadedData = objects.map((obj, i) => [obj, ...context[i]]);
      initTable(uploadedData, uploadedColumns, { focus: true });
    }
  };
}
