import { randomUUID } from 'node:crypto';
import type { BancoSql } from '../db/banco-sql';

export class EstadoSyncRepository {
  constructor(private readonly banco: BancoSql) {}

  private ler(chave: string): string | undefined {
    const linha = this.banco.prepare('SELECT valor FROM sync_estado WHERE chave = ?').get(chave) as
      { valor: string } | undefined;
    return linha?.valor;
  }

  private salvar(chave: string, valor: string): void {
    this.banco
      .prepare(
        `INSERT INTO sync_estado (chave, valor) VALUES (?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`
      )
      .run(chave, valor);
  }

  instalacao(): string {
    const existente = this.ler('sync:instalacao');
    if (existente) return existente;
    const id = randomUUID();
    this.salvar('sync:instalacao', id);
    return id;
  }

  cursor(): number {
    return Number(this.ler('sync:cursor') ?? 0);
  }

  salvarCursor(versao: number): void {
    this.salvar('sync:cursor', String(versao));
  }

  versao(tabela: string, id: string): number {
    return Number(this.ler(`sync:versao:${tabela}:${id}`) ?? 0);
  }

  salvarVersao(tabela: string, id: string, versao: number): void {
    if (versao > this.versao(tabela, id)) this.salvar(`sync:versao:${tabela}:${id}`, String(versao));
  }

  guardarVersaoConflito(id: number, versao: number): void {
    this.salvar(`sync:conflito:${id}`, String(versao));
  }

  versaoConflito(id: number): number {
    return Number(this.ler(`sync:conflito:${id}`) ?? 0);
  }
}
