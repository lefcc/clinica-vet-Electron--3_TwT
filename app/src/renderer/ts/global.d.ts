// avisa o typescript que existe window.api (criado pelo preload)
interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

interface Window {
  api: ElectronAPI;
}