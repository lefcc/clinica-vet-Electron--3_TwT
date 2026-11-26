import { randomUUID } from 'node:crypto';
import type { Agendamento } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { dataUtc } from '../admin/transacao';

type LinhaAgenda = Omit<Agendamento, 'inicio' | 'motivo' | 'confirmado'> & { inicio: number; motivo: string | null; confirmado: number };

export type LinhaCsv = Record<string, string | number | null>;

export class RelatoriosRepository {
  constructor(private readonly banco: BancoSql) {}

  // esta função busca a agenda do período
  agenda(de: number, ate: number, usuarioId?: string): Agendamento[] {
    const filtro = usuarioId ? 'AND g.veterinario_id = (SELECT colaborador_id FROM usuarios WHERE id = ?)' : '';
    const linhas = this.banco.prepare(
      `SELECT g.id, g.animal_id, an.cliente_id, g.veterinario_id, g.inicio, g.duracao_min, g.motivo, g.status, g.confirmado,
         an.nome AS animal_nome, c.nome AS cliente_nome, v.nome AS veterinario_nome
       FROM agendamentos g
       JOIN animais an ON an.id = g.animal_id
       JOIN clientes c ON c.id = an.cliente_id
       JOIN colaboradores v ON v.id = g.veterinario_id
       WHERE g.ativo = 1 AND g.status <> 'CANCELADO' AND g.inicio >= ? AND g.inicio < ? ${filtro}
       ORDER BY g.inicio`
    ).all(...(usuarioId ? [de, ate, usuarioId] : [de, ate])) as LinhaAgenda[];
    return linhas.map((l) => ({ ...l, inicio: dataUtc(l.inicio), motivo: l.motivo ?? undefined, confirmado: Boolean(l.confirmado) }));
  }

  cobrancas() {
    const linhas = this.banco.prepare(
      `SELECT o.numero, o.criado_em, c.nome AS cliente_nome, o.forma_pagamento, o.total_centavos
       FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id
       WHERE o.ativo = 1 ORDER BY o.numero DESC`
    ).all() as { numero: number; criado_em: number; cliente_nome: string; forma_pagamento: string; total_centavos: number }[];
    return linhas.map(({ criado_em, ...l }) => ({ ...l, data: dataUtc(criado_em) }));
  }

  clientesParaCsv(): LinhaCsv[] {
    return this.banco.prepare(
      `SELECT nome, cpf, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf
       FROM clientes WHERE ativo = 1 ORDER BY nome COLLATE NOCASE`
    ).all() as LinhaCsv[];
  }

  animaisParaCsv(): LinhaCsv[] {
    return this.banco.prepare(
      `SELECT c.cpf AS cliente_cpf, a.nome, a.especie, a.raca, a.sexo,
         date(a.data_nascimento, 'unixepoch') AS data_nascimento, a.peso_kg, a.observacoes
       FROM animais a JOIN clientes c ON c.id = a.cliente_id
       WHERE a.ativo = 1 ORDER BY a.nome COLLATE NOCASE`
    ).all() as LinhaCsv[];
  }

  cpfCadastrado(cpf: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM clientes WHERE cpf = ?').get(cpf));
  }

  clientePorCpf(cpf: string): string | undefined {
    const linha = this.banco.prepare('SELECT id FROM clientes WHERE cpf = ? AND ativo = 1').get(cpf) as { id: string } | undefined;
    return linha?.id;
  }

  animalExiste(clienteId: string, nome: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM animais WHERE cliente_id = ? AND lower(nome) = lower(?) AND ativo = 1').get(clienteId, nome));
  }

  // esta função grava um cliente ou animal importado
  inserir(tabela: 'clientes' | 'animais', dados: Record<string, string | number | null>): { id: string; linha: object } {
    const id = randomUUID();
    const colunas = ['id', ...Object.keys(dados)];
    this.banco.prepare(`INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`)
      .run(id, ...Object.values(dados));
    return { id, linha: this.banco.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(id) as object };
  }
}
