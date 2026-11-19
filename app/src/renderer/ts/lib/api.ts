// Wrapper tipado para window.api - consumido pelo renderer
// Tipos serão importados de @clinica-vet/shared conforme desenvolvimento

type IPCResponse<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: { codigo: string; mensagem: string } };

interface ApiClient {
  invoke<T>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>>;
}

const api: ApiClient = {
  async invoke<T>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>> {
    try {
      const resultado = await window.api.invoke(channel, ...args);
      return resultado as IPCResponse<T>;
    } catch (error) {
      return {
        ok: false,
        erro: {
          codigo: 'IPC_ERROR',
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido na comunicação IPC'
        }
      };
    }
  }
};

export { api, type IPCResponse };