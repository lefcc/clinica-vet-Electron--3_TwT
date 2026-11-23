// registry de handlers IPC: confere sessão e perfil antes de chamar a função
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ErroNegocio } from '../erros/erro-negocio';
import { SessaoEmMemoria } from '../modules/auth/sessao-em-memoria';
import type { Perfil, SessaoAtiva } from '../modules/auth/tipos';

export type PerfilPermitido = Perfil;
export type Sessao = SessaoAtiva;

// a sessão fica só na memória do main (some quando o app fecha)
export const sessoes = new SessaoEmMemoria();

export function definirSessao(sessao: Sessao | null) {
  sessoes.definir(sessao);
}

export function obterSessao(): Sessao | null {
  return sessoes.obter();
}

// transforma o erro no formato { ok: false, erro } que o front espera
function erroParaResposta(error: unknown) {
  if (error instanceof ErroNegocio) {
    return { ok: false, erro: { codigo: error.codigo, mensagem: error.message } };
  }
  const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor';
  return { ok: false, erro: { codigo: 'ERRO_INTERNO', mensagem } };
}

export function registrarHandler<TEntrada, TSaida>(
  canal: string,
  perfisPermitidos: PerfilPermitido[],
  handler: (event: IpcMainInvokeEvent, dados: TEntrada) => Promise<TSaida>
) {
  ipcMain.handle(canal, async (event, dados: TEntrada) => {
    const sessao = obterSessao();

    // tem alguém logado?
    if (!sessao) {
      return {
        ok: false,
        erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada ou inválida. Faça login novamente.' }
      };
    }

    // a sessão já venceu?
    if (Date.now() > sessao.expiraEm) {
      definirSessao(null);
      return {
        ok: false,
        erro: { codigo: 'SESSAO_EXPIRADA', mensagem: 'Sessão expirada. Faça login novamente.' }
      };
    }

    // o perfil dessa pessoa pode usar esse canal?
    if (!perfisPermitidos.includes(sessao.perfil)) {
      return {
        ok: false,
        erro: { codigo: 'SEM_PERMISSAO', mensagem: 'Você não tem permissão para realizar esta ação.' }
      };
    }

    try {
      const resultado = await handler(event, dados);
      return { ok: true, dados: resultado };
    } catch (error) {
      return erroParaResposta(error);
    }
  });
}

// canal que não exige login (ex.: o próprio login)
export function registrarHandlerPublico<TEntrada, TSaida>(
  canal: string,
  handler: (event: IpcMainInvokeEvent, dados: TEntrada) => Promise<TSaida>
) {
  ipcMain.handle(canal, async (event, dados: TEntrada) => {
    try {
      const resultado = await handler(event, dados);
      return { ok: true, dados: resultado };
    } catch (error) {
      return erroParaResposta(error);
    }
  });
}
