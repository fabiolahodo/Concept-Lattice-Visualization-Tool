// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('py', {
  computeLattice(payload) {
    return ipcRenderer.invoke('compute-lattice', payload);
  },
});

