import { expect, it, vi } from 'vitest';
import { ConexaoLocal } from '../db/local/conexao-local';
import { EsquemaLocal } from '../db/local/esquema-local';
import { OutboxRepository } from '../modules/admin/outbox.repository';
import { executarPush, getSyncStatus } from './index';

const adaptadores = vi.hoisted(() => ({
  getLocalDb: vi.fn(),
  obterConexaoLocal: vi.fn(),
  runInTransaction: vi.fn()
}));
vi.mock('../db/local/client', () => adaptadores);
vi.mock('../db/central/client', () => adaptadores);
vi.mock('../config/env', () => ({ config: { sync: { batchSize: 100 } } }));

it('mantém operações em ordem ao ficar offline e confirma a fila após recuperar a conexão', async () => {
  const banco = new ConexaoLocal(':memory:');
  banco.abrir();
  try {
    new EsquemaLocal(banco).aplicar();
    const fila = new OutboxRepository(banco);
    fila.enfileirar('colaboradores', 'registro', 'atualizar', { nome: 'Primeira edição' });
    fila.enfileirar('colaboradores', 'registro', 'atualizar', { nome: 'Segunda edição' });
    adaptadores.getLocalDb.mockReturnValue(banco.bruto());
    adaptadores.obterConexaoLocal.mockReturnValue(banco);

    adaptadores.runInTransaction.mockRejectedValueOnce(new Error('Conexão indisponível'));
    expect(await executarPush()).toEqual({ enviados: 0, erros: 1 });
    expect(fila.contarPendencias()).toBe(2);
    expect(adaptadores.runInTransaction).toHaveBeenCalledTimes(1);
    expect(getSyncStatus()).toMatchObject({ pendentes: 2, ultimaSync: null, erro: expect.any(String) });

    const edicoes: unknown[] = [];
    adaptadores.runInTransaction.mockImplementation(async (transacao) => {
      await transacao({
        execute: async (sql: string, valores: unknown[]) => {
          if (sql.startsWith('SELECT')) return [[{ id: 'registro' }]];
          edicoes.push(valores[0]);
          return [];
        }
      });
    });
    expect(await executarPush()).toEqual({ enviados: 2, erros: 0 });
    expect(edicoes).toEqual(['Primeira edição', 'Segunda edição']);
    expect(getSyncStatus()).toMatchObject({ pendentes: 0, ultimaSync: expect.any(Number), erro: null });
    expect(await executarPush()).toEqual({ enviados: 0, erros: 0 });
    expect(banco.prepare('SELECT ultimo_erro FROM sync_outbox ORDER BY id').all()).toEqual([
      { ultimo_erro: null }, { ultimo_erro: null }
    ]);
  } finally {
    banco.fechar();
  }
});
