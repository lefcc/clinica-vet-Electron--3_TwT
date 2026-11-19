// Preload script - contextBridge para expor window.api ao renderer
import { contextBridge, ipcRenderer } from 'electron';

// Tipos serão importados de @clinica-vet/shared
interface ElectronAPI {
  // Métodos IPC serão definidos conforme desenvolvimento
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

const electronAPI: ElectronAPI = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
};

contextBridge.exposeInMainWorld('api', electronAPI);