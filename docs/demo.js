// docs/demo.js

// Grab DOM elements
const container = document.getElementById('graph-container');
const infoEl = document.getElementById('selectedInfo');

// A very small sample lattice (so demo works instantly)
const sample = {
  nodes: [
    { id: 1, label: "Intent { } Extent {o1,o2,o3}" },
    { id: 2, label: "Intent {b} Extent {o1,o2}" },
    { id: 3, label: "Intent {a,b} Extent {o1}" },
    { id: 4, label: "Intent {a,b,c} Extent { }" }
  ],
  links: [
    { source: 1, target: 2 },
    { source: 2, target: 3 },
    { source: 3, target: 4 }
  ]
};

// Deep clone utility (structuredClone fallback)
const deepClone = (o) =>
  (typeof structuredClone === 'function'
    ? structuredClone(o)
    : JSON.parse(JSON.stringify(o)));

// Update sidebar metrics using your library
function updateMetrics(graphData) {
  if (!window.lattice?.calculateMetrics) return;

  try {
    const metrics = window.lattice.calculateMetrics(graphData);
    const safeSet = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? "-";
    };
    safeSet("m-concepts", metrics.totalConcepts);
    safeSet("m-objects", metrics.totalObjects);
    safeSet("m-attributes", metrics.totalAttributes);
    safeSet("m-density", metrics.density);
    safeSet("m-stability", metrics.averageStability);
  } catch (err) {
    console.warn("Metrics calculation failed:", err);
  }
}

// Render function
function render(graphData) {
  if (!window.lattice?.createLattice) {
    console.error("⚠️ lattice.umd.js not loaded or Rollup `name` mismatch.");
    return;
  }

  // Clear old SVG
  container.innerHTML = "";

  // Width/height from container (with fallbacks)
  const width = container.clientWidth || 1000;
  const height = container.clientHeight || 600;

  // Call your library
  window.lattice.createLattice(graphData, {
    container: "#graph-container",
    width,
    height,
    // If you later add an onSelect hook, you can wire it here:
    // onSelect: (concept) => {
    //   infoEl.textContent = JSON.stringify(concept, null, 2);
    // }
  });

  updateMetrics(graphData);
}

// --- Event bindings ---

// Reload sample button
document.getElementById("loadSample")?.addEventListener("click", () => {
  render(deepClone(sample));
});

// File upload
document.getElementById("fileInput")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Support both {graph:{nodes,links}} and {nodes,links}
    const graphData =
      data?.graph && Array.isArray(data.graph.nodes) ? data.graph : data;

    render(graphData);
  } catch (err) {
    console.error("File parsing error:", err);
    alert("Could not parse JSON file.");
  }
});

// Auto-render sample lattice on first open
render(deepClone(sample));

// Optional: resize handler so demo redraws responsively
window.addEventListener("resize", () => {
  render(deepClone(sample));
});
