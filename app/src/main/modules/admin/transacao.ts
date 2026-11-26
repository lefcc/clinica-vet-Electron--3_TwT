import type { BancoSql } from '../../db/banco-sql';

/** A conexão SQLite executa esta função em BEGIN IMMEDIATE. Não use callbacks async. */
export function runInTransaction<T>(banco: BancoSql, executar: () => T): T {
  return banco.transacao(executar);
}

export function agoraEmSegundos(): number {
  return Math.floor(Date.now() / 1000);
}

export function dataUtc(segundos: number): string {
  return new Date(segundos * 1000).toISOString();
}

const calendarioSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function diaSaoPaulo(data: Date): string {
  return calendarioSaoPaulo.format(data);
}
