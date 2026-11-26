import { z } from 'zod';
import { colunasSincronizaveis } from '../db/local/tabelas-sincronizaveis';
import type { DadosRegistro, Valor } from './tipos';

const valorSchema = z.union([z.string(), z.number().finite(), z.null()]);
const entradaSchema = z.record(z.unknown());

export function colunasDaTabela(tabela: string) {
  const colunas = colunasSincronizaveis.get(tabela);
  if (!colunas) throw new Error('Tabela de sincronização inválida.');
  return colunas;
}

export function identificador(nome: string): string {
  // Usado apenas após verificar a tabela e as colunas no schema do projeto.
  return '`' + nome + '`';
}

export function normalizar(tabela: string, bruto: unknown): DadosRegistro {
  const colunas = colunasDaTabela(tabela);
  return Object.fromEntries(
    Object.entries(entradaSchema.parse(bruto)).map(([campo, valor]) => {
      const coluna = colunas.get(campo);
      if (!coluna) throw new Error('Coluna de sincronização inválida.');
      let normalizado: unknown = valor;
      if (valor !== null) {
        if (coluna.columnType === 'SQLiteTimestamp' && valor instanceof Date) {
          normalizado = Math.floor(valor.getTime() / 1000);
        } else if (coluna.columnType === 'SQLiteBoolean' && typeof valor === 'boolean') {
          normalizado = Number(valor);
        } else if (coluna.columnType === 'SQLiteReal' && typeof valor === 'string') {
          normalizado = Number(valor);
        } else if (coluna.columnType === 'SQLiteTextJson' && typeof valor === 'object') {
          normalizado = JSON.stringify(valor);
        }
      }
      return [campo, valorSchema.parse(normalizado)];
    })
  );
}

export function valorMysql(tabela: string, campo: string, valor: Valor): Valor | Date {
  if (typeof valor === 'number' && colunasDaTabela(tabela).get(campo)?.columnType === 'SQLiteTimestamp') {
    return new Date(valor * 1000);
  }
  return valor;
}
