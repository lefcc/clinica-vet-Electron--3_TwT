import { describe, expect, it } from 'vitest';
import { gerarCsv, lerCsv } from './csv.service';
import { RelatoriosService } from './relatorios.service';
import type { RelatoriosRepository } from './relatorios.repository';

const saldo = (nome: string, quantidade: number, consumo: number, status: 'OK' | 'ATENCAO' | 'CRITICO') => ({
  medicamento_id: nome, medicamento_nome: nome, unidade: 'un', saldo: quantidade,
  consumo_medio_diario: consumo, dias_restantes: 1, dias_alerta: 3, status
});

describe('relatórios', () => {
  const service = new RelatoriosService({} as RelatoriosRepository, {
    calcularTodosSaldos: () => [saldo('A', 5, 1, 'CRITICO'), saldo('B', 100, 1, 'OK')],
    lotes: ({ medicamento_id }) => [{ id: medicamento_id, numero: 'L', validade: medicamento_id === 'A' ? '2027-05-01' : '2027-01-01', saldo: 1 }]
  });

  it('a lista de compras cobre 30 dias e ignora o que está ok', () => {
    expect(service.listaCompras()).toEqual([{ medicamento_nome: 'A', unidade: 'un', saldo: 5, sugerido: 25 }]);
  });

  it('a validade vem do lote que vence primeiro pro último', () => {
    expect(service.estoqueValidade().map((l) => l.medicamento_nome)).toEqual(['B', 'A']);
  });

  it('o csv lê de volta o que foi gerado, com aspas, ";" e quebra de linha', () => {
    const linhas = [{ nome: 'Ana "A"; teste', obs: 'linha 1\nlinha 2' }];
    expect(lerCsv(gerarCsv(['nome', 'obs'], linhas))).toEqual(linhas);
  });
});
