import { getTableColumns, getTableName, type Column } from 'drizzle-orm';
import * as schema from './schema';

// A mesma lista controla os identificadores SQL aceitos no push e na resolução de conflitos.
const tabelas = [
  schema.colaboradores, schema.usuarios, schema.clientes, schema.animais, schema.medicamentos, schema.fornecedores,
  schema.agendamentos, schema.consultas, schema.prescricoesConsulta, schema.lotesEstoque, schema.movimentacoesEstoque,
  schema.alertasEstoque, schema.fornecedoresPrecos, schema.cotacoesDolar, schema.vacinasCatalogo, schema.vacinasAplicacoes,
  schema.lembretesVacina, schema.servicos, schema.orcamentos, schema.orcamentosItens, schema.auditoria, schema.configuracoes
];

export const colunasSincronizaveis = new Map<string, ReadonlyMap<string, Column>>(tabelas.map((tabela) => [
  getTableName(tabela),
  new Map(Object.values(getTableColumns(tabela)).map((coluna) => [coluna.name, coluna]))
]));
