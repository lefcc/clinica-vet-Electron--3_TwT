import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { MySqlTable } from 'drizzle-orm/mysql-core';
import * as local from './schema';
import * as central from '../central/schema';
import { ConexaoLocal } from './conexao-local';
import { EsquemaLocal } from './esquema-local';

describe('EsquemaLocal', () => {
  let banco: ConexaoLocal;

  beforeEach(() => {
    banco = new ConexaoLocal(':memory:');
    banco.abrir();
  });

  afterEach(() => banco.fechar());

  it('cria todas as tabelas e mantém as colunas em paridade com o Drizzle e o MySQL', () => {
    const boot = new EsquemaLocal(banco);
    boot.aplicar();
    const tabelas = Object.values(local).filter((tabela) => is(tabela, SQLiteTable));
    const tabelasCentrais = new Map(Object.values(central).filter((tabela) => is(tabela, MySqlTable))
      .map((tabela) => [String(getTableName(tabela)), tabela]));
    const tabelasSoLocais = ['sync_outbox', 'sync_estado', 'sync_conflitos'];
    expect(tabelas).toHaveLength(25);
    expect(tabelasCentrais.size).toBe(22);
    for (const tabela of tabelas) {
      const nome = getTableName(tabela);
      const colunas = Object.values(getTableColumns(tabela)).map((coluna) => coluna.name).sort();
      const colunasBoot = banco.prepare('SELECT name FROM pragma_table_info(?)').all(nome) as { name: string }[];
      expect(colunasBoot.map((coluna) => coluna.name).sort(), nome).toEqual(colunas);
      if (tabelasSoLocais.includes(nome)) {
        expect(tabelasCentrais.has(nome)).toBe(false);
      } else {
        const equivalente = tabelasCentrais.get(nome);
        expect(equivalente, nome).toBeDefined();
        if (!equivalente) throw new Error('Tabela central ausente: ' + nome);
        expect(Object.values(getTableColumns(equivalente)).map((coluna) => coluna.name).sort(), nome)
          .toEqual(colunas);
      }
    }
    expect(banco.bruto().pragma('foreign_key_check')).toEqual([]);
  });

  it('repete o boot com registros existentes e mantém as chaves estrangeiras', () => {
    const boot = new EsquemaLocal(banco);
    boot.aplicar();
    banco.prepare("INSERT INTO clientes (id, nome, cpf) VALUES ('cliente-1', 'Ana', '12345678900')").run();
    boot.aplicar();
    expect(banco.prepare('SELECT nome FROM clientes WHERE id = ?').get('cliente-1')).toEqual({ nome: 'Ana' });
    expect(() => banco.prepare(
      "INSERT INTO animais (id, cliente_id, nome, especie, sexo) VALUES ('animal','ausente','Lua','Canina','F')"
    ).run()).toThrow(/FOREIGN KEY/);
    expect(banco.bruto().pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
