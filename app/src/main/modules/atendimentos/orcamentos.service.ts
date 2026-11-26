// regras do orçamento: o total é sempre calculado aqui no main, em centavos
import type { ItemOrcamento, Orcamento } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OutboxRepository } from '../admin/outbox.repository';
import { runInTransaction } from '../admin/transacao';
import type { OrcamentosRepository } from './orcamentos.repository';

export interface EntradaOrcamento {
  cliente_id: string;
  animal_id?: string;
  itens: ItemOrcamento[];
  desconto_centavos: number;
  forma_pagamento: string;
}

const MAXIMO_CENTAVOS = 2147483647;

/** soma dos itens menos o desconto, nunca negativo */
export function calcularTotal(itens: Pick<ItemOrcamento, 'quantidade' | 'valor_unitario_centavos'>[], desconto: number): number {
  const soma = itens.reduce((total, i) => total + i.quantidade * i.valor_unitario_centavos, 0);
  return Math.max(0, soma - desconto);
}

export class OrcamentosService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: OrcamentosRepository,
    private readonly outbox: OutboxRepository
  ) {}

  listar(entrada: { pagina: number; tamanho: number; busca?: string }) {
    return this.repository.listar(entrada.busca ?? '', entrada.pagina, entrada.tamanho);
  }

  obter(id: string): Orcamento {
    const orcamento = this.repository.obter(id);
    if (!orcamento) throw new ErroNegocio('NAO_ENCONTRADO', 'Orçamento não encontrado.');
    return orcamento;
  }

  criar(entrada: EntradaOrcamento): Orcamento {
    const total = calcularTotal(entrada.itens, entrada.desconto_centavos);
    if (total > MAXIMO_CENTAVOS) throw new ErroNegocio('DADOS_INVALIDOS', 'O valor do orçamento é alto demais.');

    // número, orçamento, itens e fila de sync na mesma transação
    return runInTransaction(this.banco, () => {
      if (!this.repository.clienteAtivo(entrada.cliente_id)) throw new ErroNegocio('NAO_ENCONTRADO', 'Cliente não encontrado.');
      if (entrada.animal_id && !this.repository.animalDoCliente(entrada.animal_id, entrada.cliente_id)) {
        throw new ErroNegocio('DADOS_INVALIDOS', 'Esse animal não é desse cliente.');
      }
      const id = this.repository.criar({ ...entrada, numero: this.repository.proximoNumero(), total_centavos: total });
      this.outbox.enfileirar('orcamentos', id, 'inserir', this.repository.linha('orcamentos', id));

      for (const item of entrada.itens) {
        const descricao = this.repository.nomeDoItem(item.tipo, item.item_id);
        if (!descricao) throw new ErroNegocio('NAO_ENCONTRADO', 'Um dos itens não existe mais no catálogo.');
        const itemId = this.repository.criarItem(id, { ...item, descricao });
        this.outbox.enfileirar('orcamentos_itens', itemId, 'inserir', this.repository.linha('orcamentos_itens', itemId));
      }
      return this.obter(id);
    });
  }
}
