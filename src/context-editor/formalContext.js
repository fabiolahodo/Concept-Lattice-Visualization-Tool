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

  // --- Demo defaults ---
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

  // uploaded (lazy)
  let uploadedData = null;
  let uploadedColumns = null;

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
    return html(`
      <input type="checkbox" ${value ? "checked" : ""} 
             data-row="${rowIndex}" data-col="${colIndex}" />
    `);
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

  // --- Upload context (two shapes supported) ---
  const uploadEl = document.querySelector(uploadInput);
  if (uploadEl) {
    uploadEl.addEventListener("change", (event) => {
      const input = event.target;
      const file = input && input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(String(e.target.result));

          if (imported.objects && imported.properties && imported.context) {
            // Shape A
            uploadedColumns = ["Object", ...imported.properties];
            uploadedData = imported.objects.map((obj, rowIdx) => ([
              obj,
              ...imported.context[rowIdx].map(v => v === true || v === "true" || v === 1)
            ]));
          } else if (Array.isArray(imported.data) && Array.isArray(imported.columns)) {
            // Shape B
            uploadedColumns = imported.columns.slice();
            uploadedData = imported.data.map(row => ([
              row[0],
              ...row.slice(1).map(v => v === true || v === "true" || v === 1)
            ]));
          } else {
            alert("Invalid JSON format! Expected {objects, properties, context} or {data, columns}.");
            return;
          }
          alert("✅ Formal context uploaded. Click 'Show Formal Context' to view.");
        } catch (err) {
          alert("Error parsing JSON: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Show / Create buttons ---
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

  // --- Row/col actions (delegation) ---
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
      data[rowIndex][0] = /** @type {HTMLInputElement} */(el).value;
      updateTableData();
    }
    if (el.classList.contains("rename-attribute") && event.key === "Enter") {
      const colIndex = Number(el.getAttribute("data-col"));
      columns[colIndex] = /** @type {HTMLInputElement} */(el).value;
      updateTableData();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches('input[type="checkbox"]')) {
      const rowIndex = Number(el.getAttribute("data-row"));
      const colIndex = Number(el.getAttribute("data-col"));
      const checked = /** @type {HTMLInputElement} */(el).checked;
      data[rowIndex][colIndex] = checked;
    }
  });

  // --- Export dropdown ---
  const exportEl = document.querySelector(exportDropdown);
  if (exportEl) {
    exportEl.addEventListener("change", (event) => {
      const value = event.target && event.target.value;
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

  // --- Visualize Lattice ---
  const visBtnEl = document.querySelector(visualizeBtn);
  if (visBtnEl) {
    visBtnEl.addEventListener("click", async () => {
      const { objects, properties, contextMatrix } = currentContext();
      const payload = { objects, properties, context: contextMatrix };

      try {
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
        console.error(err);
      }
    });
  }

  // --- helpers ---
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
    return sel && sel.charAt(0) === "#"
      ? sel.slice(1)
      : sel;
  }

  // small public API if you need it later
  return {
    getContext: () => currentContext(),
    setContext: ({ objects, properties, context }) => {
      uploadedColumns = ["Object", ...properties];
      uploadedData = objects.map((obj, i) => [obj, ...context[i]]);
      initTable(uploadedData, uploadedColumns, { focus: true });
    }
  };
}
