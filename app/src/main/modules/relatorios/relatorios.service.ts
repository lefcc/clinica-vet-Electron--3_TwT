import type { Lote, SaldoEstoque } from '@clinica-vet/shared';
import type { RelatoriosRepository } from './relatorios.repository';

const DIAS_DE_COMPRA = 30;

export interface FonteEstoque {
  calcularTodosSaldos(): SaldoEstoque[];
  lotes(entrada: { medicamento_id: string }): Lote[];
}

export class RelatoriosService {
  constructor(private readonly repository: RelatoriosRepository, private readonly estoque: FonteEstoque) {}

  // esta função lista as cobranças
  cobrancas() {
    return this.repository.cobrancas();
  }

  // esta função lista os lotes por validade
  estoqueValidade() {
    return this.estoque.calcularTodosSaldos()
      .flatMap((s) => this.estoque.lotes({ medicamento_id: s.medicamento_id })
        .map((l) => ({ medicamento_nome: s.medicamento_nome, numero: l.numero, validade: l.validade, saldo: l.saldo })))
      .sort((a, b) => a.validade.localeCompare(b.validade));
  }

  // esta função monta a lista de compras
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
