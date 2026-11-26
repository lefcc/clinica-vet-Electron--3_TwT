import { randomUUID } from 'node:crypto';
import type { ItemOrcamento, Orcamento } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { dataUtc } from '../admin/transacao';

export interface NovoOrcamento {
  numero: number;
  cliente_id: string;
  animal_id?: string;
  desconto_centavos: number;
  total_centavos: number;
  forma_pagamento: string;
}

type LinhaOrcamento = {
  id: string; numero: number; cliente_nome: string; animal_nome: string | null; criado_em: number;
  desconto_centavos: number; total_centavos: number; forma_pagamento: string;
};

const ORIGEM = `FROM orcamentos o
  JOIN clientes c ON c.id = o.cliente_id
  LEFT JOIN animais a ON a.id = o.animal_id`;
const CONSULTA = `SELECT o.id, o.numero, c.nome AS cliente_nome, a.nome AS animal_nome, o.criado_em,
  o.desconto_centavos, o.total_centavos, o.forma_pagamento ${ORIGEM}`;

export class OrcamentosRepository {
  constructor(private readonly banco: BancoSql) {}

  private completar(linha: LinhaOrcamento): Orcamento {
    const itens = this.banco.prepare(
      `SELECT tipo, item_id, descricao, quantidade, valor_unitario_centavos
       FROM orcamentos_itens WHERE orcamento_id = ? AND ativo = 1 ORDER BY rowid`
    ).all(linha.id) as ItemOrcamento[];
    return { ...linha, animal_nome: linha.animal_nome ?? undefined, criado_em: dataUtc(linha.criado_em), itens };
  }

  // esta função busca os orçamentos
  listar(busca: string, pagina: number, tamanho: number) {
    const filtro = `WHERE o.ativo = 1 AND (instr(lower(c.nome), lower(?)) > 0 OR instr(lower(coalesce(a.nome, '')), lower(?)) > 0)`;
    const { total } = this.banco.prepare(`SELECT count(*) AS total ${ORIGEM} ${filtro}`).get(busca, busca) as { total: number };
    const linhas = this.banco.prepare(`${CONSULTA} ${filtro} ORDER BY o.numero DESC LIMIT ? OFFSET ?`)
      .all(busca, busca, tamanho, (pagina - 1) * tamanho) as LinhaOrcamento[];
    return { itens: linhas.map((l) => this.completar(l)), total, pagina, tamanho };
  }

  obter(id: string): Orcamento | undefined {
    const linha = this.banco.prepare(`${CONSULTA} WHERE o.id = ? AND o.ativo = 1`).get(id) as LinhaOrcamento | undefined;
    return linha && this.completar(linha);
  }

  // esta função pega o próximo número
  proximoNumero(): number {
    const linha = this.banco.prepare('SELECT coalesce(max(numero), 0) + 1 AS numero FROM orcamentos').get() as { numero: number };
    return linha.numero;
  }

  clienteAtivo(id: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM clientes WHERE id = ? AND ativo = 1').get(id));
  }

  animalDoCliente(animalId: string, clienteId: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM animais WHERE id = ? AND cliente_id = ? AND ativo = 1').get(animalId, clienteId));
  }

  // esta função busca o nome do serviço ou medicamento
  nomeDoItem(tipo: ItemOrcamento['tipo'], id: string): string | undefined {
    const tabela = tipo === 'SERVICO' ? 'servicos' : 'medicamentos';
    const linha = this.banco.prepare(`SELECT nome FROM ${tabela} WHERE id = ? AND ativo = 1`).get(id) as { nome: string } | undefined;
    return linha?.nome;
  }

  criar(dados: NovoOrcamento): string {
    const id = randomUUID();
    this.banco.prepare(
      `INSERT INTO orcamentos (id, numero, cliente_id, animal_id, desconto_centavos, total_centavos, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, dados.numero, dados.cliente_id, dados.animal_id ?? null, dados.desconto_centavos, dados.total_centavos, dados.forma_pagamento);
    return id;
  }

  criarItem(orcamentoId: string, item: ItemOrcamento): string {
    const id = randomUUID();
    this.banco.prepare(
      `INSERT INTO orcamentos_itens (id, orcamento_id, tipo, item_id, descricao, quantidade, valor_unitario_centavos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, orcamentoId, item.tipo, item.item_id, item.descricao, item.quantidade, item.valor_unitario_centavos);
    return id;
  }

  linha(tabela: 'orcamentos' | 'orcamentos_itens', id: string): object {
    return this.banco.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(id) as object;
  }
}
