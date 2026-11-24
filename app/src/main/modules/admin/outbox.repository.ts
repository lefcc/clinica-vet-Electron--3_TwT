import type { BancoSql } from '../../db/banco-sql';

export type OperacaoOutbox = 'inserir' | 'atualizar' | 'inativar';

export class OutboxRepository {
  constructor(private readonly banco: BancoSql) {}

  enfileirar(tabela: string, id: string, operacao: OperacaoOutbox, dados: object): void {
    this.banco.prepare(
      'INSERT INTO sync_outbox (tabela, registro_id, operacao, dados) VALUES (?, ?, ?, ?)'
    ).run(tabela, id, operacao, JSON.stringify(dados));
  }

  substituirPendencias(tabela: string, id: string): void {
    this.banco.prepare(
      'DELETE FROM sync_outbox WHERE tabela = ? AND registro_id = ? AND enviado_em IS NULL'
    ).run(tabela, id);
  }
}
