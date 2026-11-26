// relatórios: cobranças, validade dos lotes e lista de compras
import type { Lote, SaldoEstoque } from '@clinica-vet/shared';
import type { RelatoriosRepository } from './relatorios.repository';

const DIAS_DE_COMPRA = 30;

// o estoque é da trilha 3: aqui só pergunta pra ele
export interface FonteEstoque {
  calcularTodosSaldos(): SaldoEstoque[];
  lotes(entrada: { medicamento_id: string }): Lote[];
}

export class RelatoriosService {
  constructor(private readonly repository: RelatoriosRepository, private readonly estoque: FonteEstoque) {}

  cobrancas() {
    return this.repository.cobrancas();
  }

  // lotes com saldo, do que vence primeiro pro último
  estoqueValidade() {
    return this.estoque.calcularTodosSaldos()
      .flatMap((s) => this.estoque.lotes({ medicamento_id: s.medicamento_id })
        .map((l) => ({ medicamento_nome: s.medicamento_nome, numero: l.numero, validade: l.validade, saldo: l.saldo })))
      .sort((a, b) => a.validade.localeCompare(b.validade));
  }

  // o que está em atenção ou crítico, com a quantidade pra cobrir 30 dias
  listaCompras() {
    return this.estoque.calcularTodosSaldos()
      .filter((s) => s.status !== 'OK')
      .map((s) => ({
        medicamento_nome: s.medicamento_nome,
        unidade: s.unidade,
        saldo: s.saldo,
        sugerido: Math.max(0, Math.ceil(s.consumo_medio_diario * DIAS_DE_COMPRA - s.saldo))
      }))
      .filter((l) => l.sugerido > 0);
  }
}
