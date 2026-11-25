import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AlertaEstoque,
  Cotacao,
  Fornecedor,
  Lote,
  Medicamento,
  Pagina,
  PrecoFornecedor,
  SaldoEstoque,
} from '../tipos.js';
import {
  definirCotacaoDolarMock,
  ehCanalTrilha3Mock,
  invocarTrilha3Mock,
  resetarTrilha3Mock,
} from './trilha3.mock.js';

describe('trilha3.mock — Mocks em memória da Trilha 3', () => {
  beforeEach(() => {
    resetarTrilha3Mock();
  });

  describe('medicamentos:*', () => {
    it('lista medicamentos ativos com busca sem diferenciar acento ou maiúsculas', async () => {
      const todos = await invocarTrilha3Mock<Pagina<Medicamento>>('medicamentos:listar', {
        pagina: 1,
        tamanho: 10,
      });
      expect(todos.ok).toBe(true);
      if (!todos.ok) return;
      expect(todos.dados.total).toBe(6);

      const busca = await invocarTrilha3Mock<Pagina<Medicamento>>('medicamentos:listar', {
        pagina: 1,
        tamanho: 10,
        busca: 'VERMIFUGO',
      });
      expect(busca.ok).toBe(true);
      if (!busca.ok) return;
      expect(busca.dados.itens).toHaveLength(1);
      expect(busca.dados.itens[0]?.nome).toBe('Vermífugo Plus');
    });

    it('cria, atualiza e inativa medicamento (exclusão lógica)', async () => {
      const criado = await invocarTrilha3Mock<Medicamento>('medicamentos:criar', {
        nome: 'Cetoprofeno',
        principio_ativo: 'Cetoprofeno',
        unidade: 'ml',
        dias_alerta: 4,
        consumo_inicial_diario: 5,
      });
      expect(criado.ok).toBe(true);
      if (!criado.ok) return;
      expect(criado.dados.nome).toBe('Cetoprofeno');
      expect(criado.dados.ativo).toBe(true);

      const atualizado = await invocarTrilha3Mock<Medicamento>('medicamentos:atualizar', {
        id: criado.dados.id,
        dias_alerta: 10,
      });
      expect(atualizado.ok).toBe(true);
      if (!atualizado.ok) return;
      expect(atualizado.dados.dias_alerta).toBe(10);

      const inativado = await invocarTrilha3Mock<{ id: string }>('medicamentos:inativar', {
        id: criado.dados.id,
      });
      expect(inativado.ok).toBe(true);

      const obtidoAposInativar = await invocarTrilha3Mock<Medicamento>('medicamentos:obter', {
        id: criado.dados.id,
      });
      expect(obtidoAposInativar.ok).toBe(false);
    });

    it('retorna erro MEDICAMENTO_DUPLICADO quando nome + unidade já existe ativo', async () => {
      const duplicado = await invocarTrilha3Mock<Medicamento>('medicamentos:criar', {
        nome: 'dipirona',
        unidade: 'ML',
        dias_alerta: 3,
      });
      expect(duplicado.ok).toBe(false);
      if (duplicado.ok) return;
      expect(duplicado.erro.codigo).toBe('MEDICAMENTO_DUPLICADO');
    });
  });

  describe('fornecedores:* e dolar:atual', () => {
    it('retorna cotação atual do dólar e permite simular modo offline CACHE', async () => {
      const r1 = await invocarTrilha3Mock<Cotacao>('dolar:atual');
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;
      expect(r1.dados.valor_centavos).toBe(545);
      expect(r1.dados.origem).toBe('API');

      definirCotacaoDolarMock({ valor_centavos: 560, origem: 'CACHE' });
      const r2 = await invocarTrilha3Mock<Cotacao>('dolar:atual');
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      expect(r2.dados.valor_centavos).toBe(560);
      expect(r2.dados.origem).toBe('CACHE');
    });

    it('filtra fornecedores por tipo NACIONAL e IMPORTADO', async () => {
      const importados = await invocarTrilha3Mock<Pagina<Fornecedor>>('fornecedores:listar', {
        pagina: 1,
        tamanho: 10,
        tipo: 'IMPORTADO',
      });
      expect(importados.ok).toBe(true);
      if (!importados.ok) return;
      expect(importados.dados.itens.length).toBeGreaterThan(0);
      expect(importados.dados.itens.every((f) => f.tipo === 'IMPORTADO')).toBe(true);
    });

    it('calcula comparativo de preços convertendo USD para BRL, ordenando do mais barato ao mais caro', async () => {
      const comp = await invocarTrilha3Mock<PrecoFornecedor[]>('fornecedores:precos_listar', {
        medicamento_id: 'm1',
      });
      expect(comp.ok).toBe(true);
      if (!comp.ok) return;
      expect(comp.dados).toHaveLength(3);

      // 1º lugar: US$ 3,20 * 5,45 = R$ 17,44 (1744 centavos)
      const primeiro = comp.dados[0]!;
      const segundo = comp.dados[1]!;
      const terceiro = comp.dados[2]!;

      expect(primeiro.moeda).toBe('USD');
      expect(primeiro.preco_centavos).toBe(320);
      expect(primeiro.preco_reais_centavos).toBe(1744);
      expect(primeiro.mais_barato).toBe(true);
      expect(primeiro.diferenca_percentual).toBe(0);

      // 2º lugar: R$ 18,50 (1850 centavos)
      expect(segundo.preco_reais_centavos).toBe(1850);
      expect(segundo.mais_barato).toBe(false);
      expect(segundo.diferenca_percentual).toBeGreaterThan(0);

      // 3º lugar: R$ 19,90 (1990 centavos)
      expect(terceiro.preco_reais_centavos).toBe(1990);
      expect(terceiro.diferenca_percentual).toBeGreaterThan(segundo.diferenca_percentual);
    });

    it('salva e inativa preço no comparativo de fornecedores', async () => {
      const salvo = await invocarTrilha3Mock<PrecoFornecedor[]>('fornecedores:precos_salvar', {
        medicamento_id: 'm1',
        fornecedor_id: 'f4',
        moeda: 'USD',
        preco_centavos: 200, // US$ 2,00 * 5,45 = R$ 10,90 (1090 centavos -> novo mais barato)
      });
      expect(salvo.ok).toBe(true);
      if (!salvo.ok) return;
      expect(salvo.dados[0]?.fornecedor_id).toBe('f4');
      expect(salvo.dados[0]?.preco_reais_centavos).toBe(1090);
      expect(salvo.dados[0]?.mais_barato).toBe(true);

      const idNovo = salvo.dados[0]!.id;
      const inativado = await invocarTrilha3Mock<{ id: string }>('fornecedores:precos_inativar', {
        id: idNovo,
      });
      expect(inativado.ok).toBe(true);

      const aposInativar = await invocarTrilha3Mock<PrecoFornecedor[]>('fornecedores:precos_listar', {
        medicamento_id: 'm1',
      });
      expect(aposInativar.ok).toBe(true);
      if (!aposInativar.ok) return;
      expect(aposInativar.dados.some((p) => p.id === idNovo)).toBe(false);
    });
  });

  describe('estoque:* (FEFO e append-only) e alertas:*', () => {
    it('lista lotes ordenados por validade (FEFO)', async () => {
      const lotes = await invocarTrilha3Mock<Lote[]>('estoque:lotes', {
        medicamento_id: 'm2',
      });
      expect(lotes.ok).toBe(true);
      if (!lotes.ok) return;
      expect(lotes.dados).toHaveLength(2);
      expect(lotes.dados[0]?.numero).toBe('AM-1044');
      expect(lotes.dados[1]?.numero).toBe('AM-1190');
      expect(lotes.dados[0]!.validade < lotes.dados[1]!.validade).toBe(true);
    });

    it('retorna ESTOQUE_INSUFICIENTE ao tentar saída maior que o saldo', async () => {
      const saidaExcessiva = await invocarTrilha3Mock<SaldoEstoque>('estoque:movimentar', {
        medicamento_id: 'm2',
        tipo: 'SAIDA',
        quantidade: 999,
      });
      expect(saidaExcessiva.ok).toBe(false);
      if (saidaExcessiva.ok) return;
      expect(saidaExcessiva.erro.codigo).toBe('ESTOQUE_INSUFICIENTE');
    });

    it('consome lotes por ordem de vencimento (FEFO) na SAIDA', async () => {
      // m2 possui AM-1044 (saldo 8, vence antes) e AM-1190 (saldo 20, vence depois). Total = 28.
      const saida = await invocarTrilha3Mock<SaldoEstoque>('estoque:movimentar', {
        medicamento_id: 'm2',
        tipo: 'SAIDA',
        quantidade: 10,
      });
      expect(saida.ok).toBe(true);
      if (!saida.ok) return;
      expect(saida.dados.saldo).toBe(18);

      const lotesRestantes = await invocarTrilha3Mock<Lote[]>('estoque:lotes', {
        medicamento_id: 'm2',
      });
      expect(lotesRestantes.ok).toBe(true);
      if (!lotesRestantes.ok) return;
      // AM-1044 foi totalmente consumido (8) e AM-1190 perdeu 2 (20 -> 18)
      expect(lotesRestantes.dados).toHaveLength(1);
      expect(lotesRestantes.dados[0]?.numero).toBe('AM-1190');
      expect(lotesRestantes.dados[0]?.saldo).toBe(18);
    });

    it('registra ENTRADA adicionando lote e AJUSTE gravando a diferença até a quantidade contada', async () => {
      const entrada = await invocarTrilha3Mock<SaldoEstoque>('estoque:movimentar', {
        medicamento_id: 'm5',
        tipo: 'ENTRADA',
        quantidade: 21,
        lote_numero: 'V10-99',
        validade: '2027-05-10',
      });
      expect(entrada.ok).toBe(true);
      if (!entrada.ok) return;
      expect(entrada.dados.saldo).toBe(30); // 9 + 21

      const ajuste = await invocarTrilha3Mock<SaldoEstoque>('estoque:movimentar', {
        medicamento_id: 'm5',
        tipo: 'AJUSTE',
        quantidade: 40, // quantidade contada no inventário
      });
      expect(ajuste.ok).toBe(true);
      if (!ajuste.ok) return;
      expect(ajuste.dados.saldo).toBe(40);
      expect(ajuste.dados.status).toBe('ATENCAO'); // 40 / 4 = 10 dias (dias_alerta = 7 -> <= 14 é ATENCAO)
    });

    it('lista e conta alertas apenas dos medicamentos com status CRITICO', async () => {
      expect(ehCanalTrilha3Mock('alertas:listar')).toBe(true);
      expect(ehCanalTrilha3Mock('alertas:contar')).toBe(true);

      const alertas = await invocarTrilha3Mock<AlertaEstoque[]>('alertas:listar');
      const contagem = await invocarTrilha3Mock<{ total: number }>('alertas:contar');

      expect(alertas.ok).toBe(true);
      expect(contagem.ok).toBe(true);
      if (!alertas.ok || !contagem.ok) return;

      expect(alertas.dados).toHaveLength(2);
      expect(contagem.dados.total).toBe(2);
      expect(alertas.dados.map((a) => a.medicamento_nome)).toEqual(['Amoxicilina 250mg', 'Vacina V10']);
    });
  });
});
