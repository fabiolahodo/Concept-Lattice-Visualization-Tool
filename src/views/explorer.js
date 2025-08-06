// src/views/explorer.js

import { setupFileUpload } from '../features/fileUpload.js';
import { handleContextExportSelection } from '../features/export.js';
import { setupFilterControls } from '../features/setupFilters.js';
import { createLattice } from '../lattice/lattice.js';
import { calculateMetrics } from '../lattice/metrics.js';

import { Grid, html, h } from "gridjs";
import { parseSerializedData } from '../lattice/latticeParser.js';

// === Utility: Update metrics in sidebar ===
function updateSidebarMetrics(metrics) {
  document.getElementById('total-concepts').textContent = metrics.totalConcepts;
  document.getElementById('total-objects').textContent = metrics.totalObjects;
  document.getElementById('total-attributes').textContent = metrics.totalAttributes;
  document.getElementById('lattice-density').textContent = metrics.density;
  document.getElementById('lattice-stability').textContent = metrics.averageStability;
}

// === Wait until the DOM is ready ===
document.addEventListener('DOMContentLoaded', () => {
  // Setup event listeners and controls
  setupFileUpload();
  handleContextExportSelection();
  setupFilterControls();

  // Handle Labeling Mode Change
  document.getElementById('labeling-mode')?.addEventListener('change', (e) => {
    if (typeof window.updateLabels === 'function') {
      window.updateLabels(e.target.value);
    }
  });

  // Handle Load JSON button click
  document.getElementById('load-json-file')?.addEventListener('click', () => {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput?.files[0];

    if (!file) {
      alert('Please select a JSON file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const json = JSON.parse(event.target.result);
        const graphData = json?.graph && Array.isArray(json.graph.nodes) ? json.graph : json;

        // Clear existing graph
        const container = document.getElementById('graph-container');
        container.innerHTML = '';
        const width = container.offsetWidth || 1000;
        const height = container.offsetHeight || 600;

        // Render lattice and update metrics
        createLattice(graphData, { container: '#graph-container', width, height });
        const metrics = calculateMetrics(graphData);
        updateSidebarMetrics(metrics);
      } catch (err) {
        console.error('Invalid JSON format:', err);
        alert('The selected file does not contain valid JSON.');
      }
    };
    reader.readAsText(file);
  });

  // Optional: Show modal on load (can be removed if undesired)
  setTimeout(() => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'block';
  }, 1000);

  // Modal close handler
  document.getElementById('modal-close')?.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
  });

  // Maximize/minimize panel toggle logic
  document.querySelectorAll('.panel-header button').forEach(button => {
    button.addEventListener('click', (event) => {
      const panel = event.target.closest('.panel-area');
      const isFull = panel.classList.contains('fullscreen-panel');

      document.querySelectorAll('.panel-area').forEach(p => {
        p.classList.remove('fullscreen-panel');
        const btn = p.querySelector('button');
        if (btn) btn.textContent = '🗖';
      });

      if (!isFull) {
        panel.classList.add('fullscreen-panel');
        event.target.textContent = '🗕';
      }
    });
  });

/*FORMAL CONTEXT SECTION JS CODE*/

// --- Grid.js ---

// Default table data and columns
let defaultData = [
    ["Object 1", true, false, true],
    ["Object 2", false, true, false],
    ["Object 3", true, true, false],
    ["Object 4", true, false, true],
    ["Object 5", false, true, false],
    ["Object 6", true, true, false],
];
let defaultColumns = ["Object", "Attribute 1", "Attribute 2", "Attribute 3"];

let data = [];
let columns = [];
let gridInstance = null;

let uploadedData = null;
let uploadedColumns = null;


// Initialize and render the table with given data and columns
function initTable(d, c, { focus = false } = {}) {
    data = JSON.parse(JSON.stringify(d));
    columns = JSON.parse(JSON.stringify(c));

    if (gridInstance) {
        gridInstance.destroy();
        gridInstance = null;
    }

    const container = document.getElementById("table-content");
    container.innerHTML = "";

    gridInstance = new Grid({
        columns: getColumns(),
        data: generateGridData(),
        search: true,
        sort: true,
        pagination: { limit: 10 }
    });

    gridInstance.render(container);
    document.getElementById("table-actions").classList.remove("hidden");

    if (focus) {
        focusWhenReady(container);
    }
}

// --- Table rendering & helpers ---

// Render object name cell with editable input and delete button
function renderObjectName(value, rowIndex) {
    return html(`
        <div style="display: flex; align-items: center;">
            <input type="text" value="${value}" data-row="${rowIndex}" class="rename-object" />
            <button class="delete-row" data-row="${rowIndex}" style="margin-left: 5px; color: red;">🗑️</button>
        </div>
    `);
}

// Render checkbox cell or object name cell based on column index
function renderCheckbox(value, rowIndex, colIndex) {
    if (colIndex === 0) return renderObjectName(value, rowIndex);
    return html(`
        <input type="checkbox" ${value ? "checked" : ""} 
               data-row="${rowIndex}" data-col="${colIndex}" />
    `);
}

// Generate checkbox-rendered data from raw data array
function generateGridData() {
    return data.map((row, rowIndex) =>
        row.map((value, colIndex) => renderCheckbox(value, rowIndex, colIndex))
    );
}


// Generate column definitions including attribute rename and delete
function getColumns() {
    return columns.map((col, index) => ({
        id: `col-${index}`,
        name: index === 0 
            ? col 
            : h("div", { style: "display: flex; align-items: center;" }, [
              h("input", {
                type: "text",
                value: col,
                "data-col": index,
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
                  "data-col": index,
                  style: "margin-left: 5px; color: red;",
                  onclick: (event) => handleDeleteColumn(event, index) 
              }, "🗑️")
            ])
    }));
}

// Re-render the table with current data and column configurations
function updateTableData({ focus = false } = {}) {
    if (gridInstance) {
        gridInstance.updateConfig({
            columns: getColumns(),
            data: generateGridData(),
            search: true,
            sort: true,
            pagination: { limit: 10 }
        }).forceRender();

        if (focus) {
            const container = document.getElementById("table-content");
            focusWhenReady(container);
        }
    }
}

// Add a new row to the table
function addRow() {
    let newRow = ["New Object", ...Array(columns.length - 1).fill(false)];
    data.push(newRow);
    updateTableData();
}

// Add a new column to the table
function addColumn() {
    let newAttributeName = `New Attribute ${columns.length}`;
    columns.push(newAttributeName);
    data.forEach(row => row.push(false));
    updateTableData();
}

// Handle delete column based on index
function handleDeleteColumn(event, colIndex) {
    if (colIndex > 0 && colIndex < columns.length) {
        columns.splice(colIndex, 1);
        data = data.map(row => row.filter((_, i) => i !== colIndex));
        updateTableData();
    }
}

// --- Event Listeners ---

// for "Show-Formal-Context" Button - Dsiplays uploaded data - Gets data from uploadeData and uploadedColumns
document.getElementById("show-formal-context").addEventListener("click", () => {
    if (!uploadedData || !uploadedColumns) {
        alert("Please upload a formal context file first.");
        return;
    }
    initTable(uploadedData, uploadedColumns, { focus: true });
});

// for "Create-formal-context" Button - Opens default table template
document.getElementById("create-formal-context").addEventListener("click", () => {
    initTable(defaultData, defaultColumns, { focus: true });
});

// Handle file input and convert uploaded JSON, if of format:{objects, properties, context}
// Supports two formats: {objects, properties, context} and {data, columns}
document.getElementById("upload-json").addEventListener("change", function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        try {
            let importedData = JSON.parse(e.target.result);

     if (importedData.objects && importedData.properties && importedData.context) {
    uploadedColumns = ["Object", ...importedData.properties];
    uploadedData = importedData.objects.map((obj, rowIdx) => {
        return [
            obj,
            ...importedData.context[rowIdx].map(val => val === true || val === "true" || val === 1)
        ];
    });
} else if (Array.isArray(importedData.data) && Array.isArray(importedData.columns)) {
    uploadedColumns = importedData.columns.slice();
    uploadedData = importedData.data.map(row => [
        row[0],
        ...row.slice(1).map(val => val === true || val === "true" || val === 1)
    ]);
}

            
            else {
                alert("Invalid JSON format! Must include either {objects, properties, context} or {data, columns}.");
                return;
            }
            alert("✅ Formal context uploaded successfully. Click 'Show Formal Context' to view.");
        } catch (error) {
            alert("Error parsing JSON: " + error.message);
        }
    };
    reader.readAsText(file);
});

// Add or Delete row or column when respective button is clicked
document.addEventListener("click", function (event) {
    if (event.target.id === "add-row") addRow();
    if (event.target.id === "add-column") addColumn();

    if (event.target.classList.contains("delete-row")) {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        data.splice(rowIndex, 1);
        updateTableData();
    }
    if (event.target.classList.contains("delete-column")) {
        let colIndex = Number(event.target.getAttribute("data-col"));
        handleDeleteColumn(event, colIndex);
    }
});

// Save renamed object/attribute when Enter is pressed
document.addEventListener("keydown", function (event) {
    if (event.target.classList.contains("rename-object") && event.key === "Enter") {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        data[rowIndex][0] = event.target.value;
        updateTableData();
    }
    if (event.target.classList.contains("rename-attribute") && event.key === "Enter") {
        let colIndex = Number(event.target.getAttribute("data-col"));
        columns[colIndex] = event.target.value;
        updateTableData();
    }
});

// Toggle cell value when checkbox is changed
document.addEventListener("change", function (event) {
    if (event.target.type === "checkbox") {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        let colIndex = Number(event.target.getAttribute("data-col"));
        data[rowIndex][colIndex] = event.target.checked;
    }
});

// --- Context Export Dropdown Choice ---
document.getElementById("context-export-dropdown").addEventListener("change", function (event) {
    const value = event.target.value;

    const objects = data.map(row => row[0]);
    const properties = columns.slice(1);
    const contextMatrix = data.map(row => row.slice(1));

    if (!value) return; // if no option selected
 
    // Export JSON
    if (value === "export-context-json") {
        const serialized = { objects, properties, context: contextMatrix };
        const jsonBlob = new Blob([JSON.stringify(serialized, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(jsonBlob);
        a.download = "formal_context.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Export CSV
    if (value === "export-context-csv") {
        const csvContent = columns.join(",") + "\n" + data.map(row => row.join(",")).join("\n");
        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(csvBlob);
        a.download = "formal_context.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    //Export CXT
    if (value === "export-context-cxt") {
        const cxtLines = [];
        cxtLines.push("B"); // CXT header
        cxtLines.push(`${objects.length}`);
        cxtLines.push(`${properties.length}`);
        cxtLines.push("");
        objects.forEach(o => cxtLines.push(o));
        properties.forEach(p => cxtLines.push(p));
        cxtLines.push("");
        contextMatrix.forEach(row => {
            cxtLines.push(row.map(v => (v ? "X" : ".")).join(""));
        });
        const cxtBlob = new Blob([cxtLines.join("\n")], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(cxtBlob);
        a.download = "formal_context.cxt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Reset dropdown to placeholder
    event.target.value = "";
});

//"Visualize Lattice" Button - send current formal context to backend, render returned graph

document.getElementById("visualize-lattice").addEventListener("click", async () => {
      console.log("Visualize Lattice clicked"); // <--- for testing
  // Gather amd prepare formal context payload from current table state
  const objects = data.map(row => row[0]);
  const properties = columns.slice(1);
  const contextMatrix = data.map(row => row.slice(1));
  const payload = { objects, properties, context: contextMatrix };

  try {
    // POST to backend endpoint for lattice computation
    const response = await fetch("http://localhost:3000/compute-lattice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Get lattice result
    const backendResult = await response.json();

    // Parse nodes/links
    const graphData = parseSerializedData(backendResult);
      console.log('graphData for lattice:', graphData); // <--- Adding this to test output of nodes and  links


    // Clear and draw lattice
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    const width = container.offsetWidth || 1000;
    const height = container.offsetHeight || 600;

    // Render lattice
    createLattice(graphData, { container: '#graph-container', width, height });

    // Update metrics:
    const metrics = calculateMetrics(graphData);
    updateSidebarMetrics(metrics);

  } catch (error) {
    alert("Lattice computation failed: " + error.message);
    console.error(error);
  }
});

});
