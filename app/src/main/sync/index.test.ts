import { expect, it, vi } from 'vitest';
import { ConexaoLocal } from '../db/local/conexao-local';
import { EsquemaLocal } from '../db/local/esquema-local';
import { OutboxRepository } from '../modules/admin/outbox.repository';
import { MotorSync } from './motor';
import { iniciarAgendadorSync } from './agendador';
import type { CentralSync } from './tipos';

vi.mock('node-cron', () => ({
  default: {
    schedule: (_expressao: string, verificar: () => void) => {
      const relogio = setInterval(verificar, 500);
      return { stop: () => clearInterval(relogio) };
    }
  }
}));

it('mantém operações em ordem ao ficar offline e confirma a fila após recuperar a conexão', async () => {
  const banco = new ConexaoLocal(':memory:');
  banco.abrir();
  try {
    new EsquemaLocal(banco).aplicar();
    const fila = new OutboxRepository(banco);
    fila.enfileirar('colaboradores', 'registro', 'atualizar', { nome: 'Primeira edição' });
    fila.enfileirar('colaboradores', 'registro', 'atualizar', { nome: 'Segunda edição' });
    const enviados: string[] = [];
    let versao = 0;
    const enviar = vi
      .fn<CentralSync['enviar']>(async (item) => {
        const dados = JSON.parse(item.dados);
        enviados.push(dados.nome);
        return { ok: true, mudanca: { ...item, dados, versao: ++versao } };
      })
      .mockRejectedValueOnce(new Error('Conexão indisponível'));
    const motor = new MotorSync(banco, { preparar: async () => {}, enviar, puxar: async () => [] }, 100);

    expect(await motor.executarPush()).toEqual({ enviados: 0, erros: 1 });
    expect(fila.contarPendencias()).toBe(2);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(motor.obterStatus()).toMatchObject({ pendentes: 2, ultimaSync: null, erro: expect.any(String) });

    expect(await motor.executarCiclo()).toEqual({ enviados: 2, erros: 0, atualizados: 0 });
    expect(enviados).toEqual(['Primeira edição', 'Segunda edição']);
    expect(enviar.mock.calls.map((chamada) => chamada[2])).toEqual([0, 0, 1]);
    expect(motor.obterStatus()).toMatchObject({ pendentes: 0, ultimaSync: expect.any(Number), erro: null });
    expect(await motor.executarPush()).toEqual({ enviados: 0, erros: 0 });
    expect(banco.prepare('SELECT ultimo_erro FROM sync_outbox ORDER BY id').all()).toEqual([
      { ultimo_erro: null },
      { ultimo_erro: null }
    ]);
  } finally {
    banco.fechar();
  }
});

it('executa no boot e na reconexão, sem sobrepor tentativas e respeitando o encerramento', async () => {
  vi.useFakeTimers();
  let online = false;
  let encerrar: (() => void) | undefined;
  const executar = vi.fn(async () => {
    await new Promise<void>((resolve) => {
      encerrar = resolve;
    });
  });
  const parar = iniciarAgendadorSync({ online: () => online, executar, intervaloMs: 60000, aoErro: vi.fn() });
  try {
    await vi.advanceTimersByTimeAsync(2000);
    expect(executar).not.toHaveBeenCalled();
    online = true;
    await vi.advanceTimersByTimeAsync(500);
    expect(executar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(61000);
    expect(executar).toHaveBeenCalledTimes(1);
    online = false;
    encerrar?.();
    await vi.advanceTimersByTimeAsync(500);
    online = true;
    await vi.advanceTimersByTimeAsync(500);
    expect(executar).toHaveBeenCalledTimes(2);
    parar();
    encerrar?.();
    await vi.advanceTimersByTimeAsync(120000);
    expect(executar).toHaveBeenCalledTimes(2);
  } finally {
    parar();
    vi.useRealTimers();
  }
});
