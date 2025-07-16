// src/views/explorer.js

import { setupFileUpload } from '../features/fileUpload.js';
import { handleContextExportSelection } from '../features/export.js';
import { setupFilterControls } from '../features/setupFilters.js';
import { createLattice } from '../lattice/lattice.js';
import { calculateMetrics } from '../lattice/metrics.js';

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
});
