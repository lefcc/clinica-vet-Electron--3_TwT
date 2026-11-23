// o mínimo que as classes precisam de um banco SQL.
// assim elas não ficam amarradas no better-sqlite3 e dá pra testar com um banco falso.
export interface ResultadoExecucao {
  changes: number | bigint;
}

export interface ComandoSql {
  get(...parametros: unknown[]): unknown;
  run(...parametros: unknown[]): ResultadoExecucao;
  all(...parametros: unknown[]): unknown[];
}

export interface BancoSql {
  exec(sql: string): void;
  prepare(sql: string): ComandoSql;
  /** roda tudo junto: se der erro no meio, desfaz tudo (transação) */
  transacao<T>(funcao: () => T): T;
}
