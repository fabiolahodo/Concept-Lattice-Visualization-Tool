// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('py', {
  /**
   * Call Python compute (stdin/stdout JSON).
   * @param {{objects: string[], properties: string[], context: number[][]}} payload
   * @returns {Promise<any>}  // Whatever your for_concepts.py returns
   */
  computeLattice(payload) {
    return ipcRenderer.invoke('compute-lattice', payload);
  }
});
