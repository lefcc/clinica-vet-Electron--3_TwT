import type { BancoSql } from '../../db/banco-sql';

export type OperacaoOutbox = 'inserir' | 'atualizar' | 'inativar';

export interface ItemOutbox {
  id: number;
  tabela: string;
  registro_id: string;
  operacao: OperacaoOutbox;
  dados: string;
}

export class OutboxRepository {
  constructor(private readonly banco: BancoSql) {}

  contarPendencias(): number {
    const linha = this.banco.prepare('SELECT COUNT(*) AS total FROM sync_outbox WHERE enviado_em IS NULL')
      .get() as { total: number };
    return linha.total;
  }

  selecionarParaEnvio(limite: number): ItemOutbox[] {
    return this.banco.prepare(`
      SELECT o.id, o.tabela, o.registro_id, o.operacao, o.dados FROM sync_outbox o
      WHERE o.enviado_em IS NULL AND NOT EXISTS (
        SELECT 1 FROM sync_conflitos c WHERE c.tabela = o.tabela AND c.registro_id = o.registro_id AND c.status = 'aberto'
      )
      ORDER BY o.id LIMIT ?
    `).all(limite) as ItemOutbox[];
  }

  temPendencia(tabela: string, id: string): boolean {
    return Boolean(this.banco.prepare(
      'SELECT 1 FROM sync_outbox WHERE tabela = ? AND registro_id = ? AND enviado_em IS NULL LIMIT 1'
    ).get(tabela, id));
  }

  confirmar(id: number, confirmadoEm: number): void {
    this.banco.prepare(
      'UPDATE sync_outbox SET enviado_em = ?, tentativas = tentativas + 1, ultimo_erro = NULL WHERE id = ?'
    ).run(confirmadoEm, id);
  }

  falhar(id: number, mensagem: string): void {
    this.banco.prepare(
      'UPDATE sync_outbox SET tentativas = tentativas + 1, ultimo_erro = ? WHERE id = ?'
    ).run(mensagem, id);
  }

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
