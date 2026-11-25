import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { SQLiteTable, getTableConfig as getSQLiteConfig } from 'drizzle-orm/sqlite-core';
import { MySqlTable, getTableConfig as getMySQLConfig } from 'drizzle-orm/mysql-core';
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
    expect(tabelasCentrais.delete('sync_mudancas')).toBe(true);
    expect(tabelasCentrais.delete('sync_relogio')).toBe(true);
    const tabelasSoLocais = ['sync_outbox', 'sync_estado', 'sync_conflitos'];
    expect(tabelas).toHaveLength(25);
    expect(tabelasCentrais.size).toBe(22);
    for (const tabela of tabelas) {
      const nome = getTableName(tabela);
      const localConfig = getSQLiteConfig(tabela);
      const colunas = Object.values(getTableColumns(tabela)).map((coluna) => coluna.name).sort();
      const colunasBoot = banco.prepare('SELECT name FROM pragma_table_info(?)').all(nome) as { name: string }[];
      expect(colunasBoot.map((coluna) => coluna.name).sort(), nome).toEqual(colunas);
      const refsBoot = banco.prepare(`SELECT "from" || ':' || "table" || ':' || "to" AS chave
        FROM pragma_foreign_key_list(?) ORDER BY chave`).all(nome) as { chave: string }[];
      const refsLocais = localConfig.foreignKeys.map((fk) => {
        const ref = fk.reference();
        return ref.columns.map((coluna, i) => [coluna.name, getTableName(ref.foreignTable), ref.foreignColumns[i].name].join(':'));
      }).flat().sort();
      expect(refsBoot.map((linha) => linha.chave), nome).toEqual(refsLocais);
      const indicesBoot = banco.prepare(`SELECT name, "unique" AS unico FROM pragma_index_list(?) WHERE origin = 'c' ORDER BY name`).all(nome);
      const indicesLocais = localConfig.indexes.map(({ config }) => ({ name: config.name, unico: Number(config.unique) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      expect(indicesBoot, nome).toEqual(indicesLocais);
      if (tabelasSoLocais.includes(nome)) {
        expect(tabelasCentrais.has(nome)).toBe(false);
      } else {
        const equivalente = tabelasCentrais.get(nome);
        expect(equivalente, nome).toBeDefined();
        if (!equivalente) throw new Error('Tabela central ausente: ' + nome);
        const centralConfig = getMySQLConfig(equivalente);
        const centralPorNome = new Map(centralConfig.columns.map((coluna) => [coluna.name, coluna]));
        expect([...centralPorNome.keys()].sort(), nome).toEqual(colunas);
        for (const coluna of localConfig.columns) {
          const mysql = centralPorNome.get(coluna.name);
          expect(mysql?.primary, nome + '.' + coluna.name).toBe(coluna.primary);
          expect(Boolean(mysql?.notNull || mysql?.primary), nome + '.' + coluna.name)
            .toBe(Boolean(coluna.notNull || coluna.primary));
          if (coluna.enumValues?.length) {
            expect(mysql?.columnType, nome + '.' + coluna.name).toBe('MySqlEnumColumn');
            expect(mysql?.enumValues).toEqual(coluna.enumValues);
            expect(localConfig.checks.map((regra) => regra.name)).toContain('ck_' + nome + '_' + coluna.name);
          }
        }
        const refsCentrais = centralConfig.foreignKeys.map((fk) => {
          const ref = fk.reference();
          return ref.columns.map((coluna, i) => [coluna.name, getTableName(ref.foreignTable), ref.foreignColumns[i].name].join(':'));
        }).flat().sort();
        expect(refsCentrais, nome).toEqual(refsLocais);
        expect(centralConfig.indexes.map(({ config }) => ({ name: config.name, unico: Number(config.unique) }))
          .sort((a, b) => a.name.localeCompare(b.name)), nome).toEqual(indicesLocais);
      }
    }
    expect(banco.bruto().pragma('foreign_key_check')).toEqual([]);
  });

  it('rejeita valores fora das opções do schema no SQLite', () => {
    new EsquemaLocal(banco).aplicar();
    expect(() => banco.prepare("INSERT INTO fornecedores (id, nome, tipo) VALUES ('id', 'Teste', 'DESCONHECIDO')").run())
      .toThrow(/CHECK constraint/);
    expect(() => banco.prepare(`INSERT INTO auditoria
      (id, ocorrido_em, usuario_nome, perfil, acao, entidade, descricao)
      VALUES ('id', 1, 'Teste', 'DESCONHECIDO', 'LOGIN', 'auth', 'Teste')`).run()).toThrow(/CHECK constraint/);
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
