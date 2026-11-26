// avisa o typescript que existe window.api (criado pelo preload)
type ElectronAPI = Readonly<Record<string, ((dados?: unknown) => Promise<unknown>) | undefined>>;

interface Window {
  api: ElectronAPI;
}
