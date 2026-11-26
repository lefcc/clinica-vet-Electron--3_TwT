import { afterEach, expect, it, vi } from 'vitest';
import { api, definirAoSessaoExpirada, type IPCResponse } from './api.js';
import { definirSessao } from './sessao.js';
import type { Sessao } from './tipos.js';

const primeira: Sessao = { usuarioId: 'primeira', nome: 'Primeira', perfil: 'MASTER', expiraEm: 9999999999999 };
const segunda: Sessao = { ...primeira, usuarioId: 'segunda', nome: 'Segunda' };
const expirada = { ok: false, erro: { codigo: 'SESSAO_EXPIRADA', mensagem: 'Entre novamente.' } } as const;

afterEach(() => {
  definirSessao(null);
  definirAoSessaoExpirada(() => undefined);
  vi.unstubAllGlobals();
});

it('ignora o vencimento de uma consulta iniciada antes do login atual', async () => {
  let responder!: (resposta: IPCResponse<never>) => void;
  const pendente = new Promise<IPCResponse<never>>((resolve) => { responder = resolve; });
  vi.stubGlobal('window', { api: { 'sync:estado': () => pendente } });
  const mostrarLogin = vi.fn();
  definirAoSessaoExpirada(mostrarLogin);
  definirSessao(primeira);
  const chamada = api.invoke('sync:estado');
  definirSessao(segunda);
  responder(expirada);
  expect(await chamada).toEqual(expirada);
  expect(mostrarLogin).not.toHaveBeenCalled();
});

it('redireciona apenas uma vez quando várias consultas devolvem a expiração atual', async () => {
  vi.stubGlobal('window', { api: { 'sync:estado': async () => expirada } });
  const mostrarLogin = vi.fn(() => definirSessao(null));
  definirAoSessaoExpirada(mostrarLogin);
  definirSessao(primeira);
  await Promise.all([api.invoke('sync:estado'), api.invoke('sync:estado')]);
  expect(mostrarLogin).toHaveBeenCalledTimes(1);
});
