import { mostrarToast } from '../components/ui/toast.js';

export type IPCResponse<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: { codigo: string; mensagem: string } };

type Invocador = (canal: string, dados?: unknown) => Promise<unknown>;

let aoSessaoExpirada: (() => void) | null = null;

/** função chamada quando a sessão expira (volta pro login) */
export function definirAoSessaoExpirada(funcao: () => void): void {
  aoSessaoExpirada = funcao;
}

// pega o window.api (do preload), se existir
function obterInvocador(): Invocador | null {
  const real = window.api;
  return real ? (canal, dados) => {
    const chamar = Object.hasOwn(real, canal) ? real[canal] : undefined;
    if (!chamar) return Promise.reject(new Error('Canal não permitido: ' + canal));
    return chamar(dados);
  } : null;
}

// nesses canais "não autenticado" é normal (ainda sem login)
const CANAIS_DE_LOGIN = new Set(['auth:login', 'auth:sessao', 'auth:sair']);

const api = {
  // nunca lança erro: devolve { ok: false, ... } se der problema
  async invoke<T>(canal: string, dados?: unknown): Promise<IPCResponse<T>> {
    // sem back-end conectado, devolve um erro claro
    const invocar = obterInvocador();
    if (!invocar) {
      return { ok: false, erro: { codigo: 'SEM_BACKEND', mensagem: 'O sistema ainda não está conectado ao back-end. Abra pelo aplicativo (Electron).' } };
    }
    try {
      const resposta = (await invocar(canal, dados)) as IPCResponse<T>;
      if (!resposta.ok && !CANAIS_DE_LOGIN.has(canal) && ['NAO_AUTENTICADO', 'SESSAO_EXPIRADA'].includes(resposta.erro.codigo)) {
        aoSessaoExpirada?.();
      }
      return resposta;
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : '';
      // o electron diz isso (em inglês) quando o canal não foi registrado
      if (texto.includes('No handler registered')) {
        return { ok: false, erro: { codigo: 'CANAL_NAO_IMPLEMENTADO', mensagem: `O back-end ainda não implementou esta função (${canal}).` } };
      }
      return { ok: false, erro: { codigo: 'IPC_ERROR', mensagem: texto || 'Erro desconhecido na comunicação com o sistema.' } };
    }
  },
};

/** atalho: devolve o dado ou mostra um aviso e devolve null */
export async function executar<T>(canal: string, dados?: unknown): Promise<T | null> {
  const resposta = await api.invoke<T>(canal, dados);
  if (resposta.ok) return resposta.dados;
  mostrarToast('erro', resposta.erro.mensagem);
  return null;
}

export { api };
