// Declarações de tipos globais para o renderer
interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

interface Window {
  api: ElectronAPI;
}