// Registry de handlers IPC com verificação de perfil
import { ipcMain, IpcMainInvokeEvent } from 'electron';

export type PerfilPermitido = 'MASTER' | 'VETERINARIO' | 'ATENDENTE';

export interface Sessao {
  usuarioId: string;
  perfil: PerfilPermitido;
  expiraEm: number;
}

let sessaoAtual: Sessao | null = null;

export function definirSessao(sessao: Sessao | null) {
  sessaoAtual = sessao;
}

export function obterSessao(): Sessao | null {
  return sessaoAtual;
}

export function registrarHandler<TEntrada, TSaida>(
  canal: string,
  perfisPermitidos: PerfilPermitido[],
  handler: (event: IpcMainInvokeEvent, dados: TEntrada) => Promise<TSaida>
) {
  ipcMain.handle(canal, async (event, dados: TEntrada) => {
    // Verificar sessão
    if (!sessaoAtual) {
      return {
        ok: false,
        erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada ou inválida. Faça login novamente.' }
      };
    }

    // Verificar expiração
    if (Date.now() > sessaoAtual.expiraEm) {
      sessaoAtual = null;
      return {
        ok: false,
        erro: { codigo: 'SESSAO_EXPIRADA', mensagem: 'Sessão expirada. Faça login novamente.' }
      };
    }

    // Verificar perfil
    if (!perfisPermitidos.includes(sessaoAtual.perfil)) {
      return {
        ok: false,
        erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Você não tem permissão para realizar esta ação.' }
      };
    }

    try {
      const resultado = await handler(event, dados);
      return { ok: true, dados: resultado };
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor';
      return { ok: false, erro: { codigo: 'ERRO_INTERNO', mensagem } };
    }
  });
}

export function registrarHandlerPublico<TEntrada, TSaida>(
  canal: string,
  handler: (event: IpcMainInvokeEvent, dados: TEntrada) => Promise<TSaida>
) {
  ipcMain.handle(canal, async (event, dados: TEntrada) => {
    try {
      const resultado = await handler(event, dados);
      return { ok: true, dados: resultado };
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor';
      return { ok: false, erro: { codigo: 'ERRO_INTERNO', mensagem } };
    }
  });
}