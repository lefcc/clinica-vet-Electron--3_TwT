import { beforeEach, describe, expect, it } from 'vitest';
import type { BancoSql, ComandoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import {
  EstoqueRepository,
  type LoteDto,
  type MedicamentoEstoqueInfo,
  type MovimentacaoEstoqueRegistro,
  type RegistrarAjusteEstoqueDados,
  type RegistrarEntradaEstoqueDados,
  type RegistrarSaidaEstoqueDados,
  type RepositorioEstoque,
} from './estoque.repository';
import { calcularDiasRestantes, EstoqueService } from './estoque.service';

class RepositorioEstoqueFalso implements RepositorioEstoque {
  medicamentos: MedicamentoEstoqueInfo[] = [];
  movimentacoes: MovimentacaoEstoqueRegistro[] = [];
  lotes: Array<LoteDto & { medicamento_id: string }> = [];
  private seq = 0;

  listarMedicamentosAtivos(): MedicamentoEstoqueInfo[] {
    return [...this.medicamentos];
  }

  obterMedicamentoAtivo(id: string): MedicamentoEstoqueInfo | undefined {
    return this.medicamentos.find((m) => m.id === id);
  }

  listarMovimentacoesPorMedicamento(medicamentoId: string): MovimentacaoEstoqueRegistro[] {
    return this.movimentacoes.filter((m) => m.medicamento_id === medicamentoId);
  }

  listarLotesComSaldoFefo(medicamentoId: string): LoteDto[] {
    return this.lotes
      .filter((l) => l.medicamento_id === medicamentoId && l.saldo > 0)
      .sort((a, b) => a.validade.localeCompare(b.validade))
      .map((l) => ({ id: l.id, numero: l.numero, validade: l.validade, saldo: l.saldo }));
  }

  registrarEntrada(dados: RegistrarEntradaEstoqueDados): void {
    this.seq += 1;
    const existente = this.lotes.find(
      (l) => l.medicamento_id === dados.medicamento_id && l.numero === dados.lote_numero && l.validade === dados.validade,
    );
    if (existente) {
      existente.saldo = Math.round((existente.saldo + dados.quantidade) * 100) / 100;
    } else {
      this.lotes.push({
        id: `lote-${this.seq}`,
        medicamento_id: dados.medicamento_id,
        numero: dados.lote_numero,
        validade: dados.validade,
        saldo: dados.quantidade,
      });
    }
    this.movimentacoes.push({
      id: `mov-${this.seq}`,
      medicamento_id: dados.medicamento_id,
      tipo: 'ENTRADA',
      quantidade: dados.quantidade,
      lote_numero: dados.lote_numero,
      validade: dados.validade,
      observacao: dados.observacao,
      criado_em: Math.floor(Date.now() / 1000),
    });
  }

  registrarSaidaFefo(dados: RegistrarSaidaEstoqueDados): void {
    this.seq += 1;
    const ordenados = this.lotes
      .filter((l) => l.medicamento_id === dados.medicamento_id && l.saldo > 0)
      .sort((a, b) => a.validade.localeCompare(b.validade));

    let restante = dados.quantidade;
    for (const lote of ordenados) {
      if (restante <= 0) break;
      const consumido = Math.min(lote.saldo, restante);
      lote.saldo = Math.round((lote.saldo - consumido) * 100) / 100;
      restante = Math.round((restante - consumido) * 100) / 100;
    }

    this.movimentacoes.push({
      id: `mov-${this.seq}`,
      medicamento_id: dados.medicamento_id,
      tipo: 'SAIDA',
      quantidade: -Math.abs(dados.quantidade),
      observacao: dados.observacao,
      criado_em: Math.floor(Date.now() / 1000),
    });
  }

  registrarAjuste(dados: RegistrarAjusteEstoqueDados): void {
    this.seq += 1;
    if (dados.diferenca < 0) {
      const ordenados = this.lotes
        .filter((l) => l.medicamento_id === dados.medicamento_id && l.saldo > 0)
        .sort((a, b) => a.validade.localeCompare(b.validade));
      let restante = Math.abs(dados.diferenca);
      for (const lote of ordenados) {
        if (restante <= 0) break;
        const consumido = Math.min(lote.saldo, restante);
        lote.saldo = Math.round((lote.saldo - consumido) * 100) / 100;
        restante = Math.round((restante - consumido) * 100) / 100;
      }
    } else if (dados.diferenca > 0) {
      const doMed = this.lotes.filter((l) => l.medicamento_id === dados.medicamento_id);
      if (doMed[0]) {
        doMed[0].saldo = Math.round((doMed[0].saldo + dados.diferenca) * 100) / 100;
      } else {
        this.lotes.push({
          id: `lote-${this.seq}`,
          medicamento_id: dados.medicamento_id,
          numero: 'AJUSTE-INV',
          validade: '2027-12-31',
          saldo: dados.diferenca,
        });
      }
    }

    this.movimentacoes.push({
      id: `mov-${this.seq}`,
      medicamento_id: dados.medicamento_id,
      tipo: 'AJUSTE',
      quantidade: dados.diferenca,
      observacao: dados.observacao,
      criado_em: Math.floor(Date.now() / 1000),
    });
  }
}

class BancoSqlEstoqueEspiao implements BancoSql {
  ddls: string[] = [];
  comandos: Array<{ sql: string; params: unknown[] }> = [];
  transacoesExecutadas = 0;

  private lotes = new Map<string, { id: string; medicamento_id: string; numero: string; validade: string }>();
  private movsPorLote = new Map<string, number>();

  exec(sql: string): void {
    this.ddls.push(sql);
  }

  prepare(sql: string): ComandoSql {
    return {
      run: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('INSERT INTO lotes_estoque')) {
          const [id, medicamento_id, numero, validade] = params as [string, string, string, string];
          this.lotes.set(id, { id, medicamento_id, numero, validade });
        } else if (sql.includes('UPDATE lotes_estoque SET validade = ?')) {
          const [validade, , id] = params as [string, number, string];
          const l = this.lotes.get(id);
          if (l) l.validade = validade;
        } else if (sql.includes('INSERT INTO movimentacoes_estoque')) {
          const [, , loteId, , , qtd] = params as [string, string, string, string, string, number];
          const atual = this.movsPorLote.get(loteId) ?? 0;
          this.movsPorLote.set(loteId, Math.round((atual + Number(qtd)) * 100) / 100);
        }
        return { changes: 1 };
      },
      get: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('SELECT id, validade FROM lotes_estoque')) {
          const [medId, numero] = params as [string, string];
          return [...this.lotes.values()].find(
            (l) => l.medicamento_id === medId && l.numero === numero,
          );
        }
        return undefined;
      },
      all: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('FROM lotes_estoque')) {
          const medId = params[0] as string;
          return [...this.lotes.values()]
            .filter((l) => l.medicamento_id === medId)
            .map((l) => ({
              id: l.id,
              numero: l.numero,
              validade: l.validade,
              saldo: this.movsPorLote.get(l.id) ?? 0,
            }))
            .filter((l) => l.saldo > 0)
            .sort((a, b) => a.validade.localeCompare(b.validade));
        }
        return [];
      },
    };
  }

  transacao<T>(funcao: () => T): T {
    this.transacoesExecutadas += 1;
    return funcao();
  }
}

describe('calcularDiasRestantes e EstoqueService', () => {
  let repo: RepositorioEstoqueFalso;
  let service: EstoqueService;

  beforeEach(() => {
    repo = new RepositorioEstoqueFalso();
    service = new EstoqueService(repo);
    repo.medicamentos.push(
      { id: 'm1', nome: 'Amoxicilina 250mg', unidade: 'comprimido', dias_alerta: 5, consumo_inicial_diario: 10 },
      { id: 'm2', nome: 'Dipirona', unidade: 'ml', dias_alerta: 3, consumo_inicial_diario: 4 },
    );
  });

  it('calcularDiasRestantes: usa consumo_inicial_diario quando o medicamento tem menos de 7 dias de histórico', () => {
    const agoraMs = Date.now();
    const doisDiasAtrasSeg = Math.floor((agoraMs - 2 * 86400 * 1000) / 1000);

    const resultado = calcularDiasRestantes(
      { id: 'm1', nome: 'Amoxicilina', unidade: 'comprimido', dias_alerta: 5, consumo_inicial_diario: 10 },
      [
        { id: '1', medicamento_id: 'm1', tipo: 'ENTRADA', quantidade: 100, criado_em: doisDiasAtrasSeg },
        { id: '2', medicamento_id: 'm1', tipo: 'SAIDA', quantidade: -20, criado_em: doisDiasAtrasSeg + 3600 },
      ],
      agoraMs,
    );

    // Saldo = 80, consumo = 10 (inicial), dias_restantes = floor(80/10) = 8 -> <= 10 (dias_alerta * 2) -> ATENCAO
    expect(resultado.saldo).toBe(80);
    expect(resultado.consumo_medio_diario).toBe(10);
    expect(resultado.dias_restantes).toBe(8);
    expect(resultado.status).toBe('ATENCAO');
  });

  it('calcularDiasRestantes: usa soma das saídas dos últimos 30 dias ÷ 30 quando há ≥ 7 dias de histórico', () => {
    const agoraMs = Date.now();
    const vinteDiasAtrasSeg = Math.floor((agoraMs - 20 * 86400 * 1000) / 1000);
    const cincoDiasAtrasSeg = Math.floor((agoraMs - 5 * 86400 * 1000) / 1000);

    const resultado = calcularDiasRestantes(
      { id: 'm1', nome: 'Amoxicilina', unidade: 'comprimido', dias_alerta: 5, consumo_inicial_diario: 10 },
      [
        { id: '1', medicamento_id: 'm1', tipo: 'ENTRADA', quantidade: 330, criado_em: vinteDiasAtrasSeg },
        { id: '2', medicamento_id: 'm1', tipo: 'SAIDA', quantidade: -300, criado_em: cincoDiasAtrasSeg },
      ],
      agoraMs,
    );

    // Saldo = 30; saídas 30d = 300 -> consumo médio = 300 / 30 = 10/dia -> dias_restantes = 3 <= dias_alerta(5) -> CRITICO
    expect(resultado.saldo).toBe(30);
    expect(resultado.consumo_medio_diario).toBe(10);
    expect(resultado.dias_restantes).toBe(3);
    expect(resultado.status).toBe('CRITICO');
  });

  it('movimentar ENTRADA cria ou soma ao lote existente e ordena lotes por validade ASC (FEFO)', () => {
    service.movimentar({
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 20,
      lote_numero: 'LOTE-LONGO',
      validade: '2027-10-01',
    });
    service.movimentar({
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 8,
      lote_numero: 'LOTE-CURTO',
      validade: '2026-12-01',
    });
    // Nova entrada no mesmo lote + validade deve somar saldo
    const saldo = service.movimentar({
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 2,
      lote_numero: 'LOTE-CURTO',
      validade: '2026-12-01',
    });

    expect(saldo.saldo).toBe(30);

    const lotes = service.lotes({ medicamento_id: 'm1' });
    expect(lotes).toHaveLength(2);
    expect(lotes[0]).toMatchObject({ numero: 'LOTE-CURTO', validade: '2026-12-01', saldo: 10 });
    expect(lotes[1]).toMatchObject({ numero: 'LOTE-LONGO', validade: '2027-10-01', saldo: 20 });
  });

  it('movimentar SAIDA: lança ESTOQUE_INSUFICIENTE se quantidade > saldoTotal e consome por FEFO quando há saldo', () => {
    service.movimentar({
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 20,
      lote_numero: 'LOTE-2027',
      validade: '2027-06-01',
    });
    service.movimentar({
      medicamento_id: 'm1',
      tipo: 'ENTRADA',
      quantidade: 8,
      lote_numero: 'LOTE-2026',
      validade: '2026-12-01',
    });

    // Tenta tirar 30 quando só há 28
    let erroCapturado: unknown;
    try {
      service.movimentar({
        medicamento_id: 'm1',
        tipo: 'SAIDA',
        quantidade: 30,
      });
    } catch (erro) {
      erroCapturado = erro;
    }
    expect(erroCapturado).toBeInstanceOf(ErroNegocio);
    expect((erroCapturado as ErroNegocio).codigo).toBe('ESTOQUE_INSUFICIENTE');

    // Saída válida de 12 consome todos os 8 do LOTE-2026 e 4 do LOTE-2027 (sobrando 16)
    const aposSaida = service.movimentar({
      medicamento_id: 'm1',
      tipo: 'SAIDA',
      quantidade: 12,
    });
    expect(aposSaida.saldo).toBe(16);

    const lotesRestantes = service.lotes({ medicamento_id: 'm1' });
    expect(lotesRestantes).toHaveLength(1);
    expect(lotesRestantes[0]).toMatchObject({ numero: 'LOTE-2027', saldo: 16 });
  });

  it('movimentar AJUSTE: recebe a quantidade contada no inventário e grava uma nova movimentação apenas com a diferença', () => {
    service.movimentar({
      medicamento_id: 'm2',
      tipo: 'ENTRADA',
      quantidade: 50,
      lote_numero: 'DP-1',
      validade: '2027-05-01',
    });

    // Contagem física encontrou 35 ml (diferença = -15)
    const aposAjusteMenor = service.movimentar({
      medicamento_id: 'm2',
      tipo: 'AJUSTE',
      quantidade: 35,
      observacao: 'Inventário mensal',
    });
    expect(aposAjusteMenor.saldo).toBe(35);

    const movs = repo.listarMovimentacoesPorMedicamento('m2');
    expect(movs).toHaveLength(2);
    expect(movs[1]).toMatchObject({ tipo: 'AJUSTE', quantidade: -15 });

    // Contagem física seguinte encontrou 42 ml (diferença = +7)
    const aposAjusteMaior = service.movimentar({
      medicamento_id: 'm2',
      tipo: 'AJUSTE',
      quantidade: 42,
    });
    expect(aposAjusteMaior.saldo).toBe(42);
    expect(repo.listarMovimentacoesPorMedicamento('m2')[2]).toMatchObject({ tipo: 'AJUSTE', quantidade: 7 });
  });

  it('EstoqueRepository: garante CREATE TABLE IF NOT EXISTS (lotes_estoque, movimentacoes_estoque, alertas_estoque, medicamentos, sync_outbox) e grava em transação com sync_outbox', () => {
    const banco = new BancoSqlEstoqueEspiao();
    const repoSql = new EstoqueRepository(banco);

    repoSql.registrarEntrada({
      medicamento_id: 'm1',
      quantidade: 10,
      lote_numero: 'L1',
      validade: '2026-12-01',
    });
    repoSql.registrarEntrada({
      medicamento_id: 'm1',
      quantidade: 15,
      lote_numero: 'L2',
      validade: '2027-06-01',
    });

    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS lotes_estoque');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS movimentacoes_estoque');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS alertas_estoque');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS medicamentos');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS sync_outbox');

    repoSql.registrarSaidaFefo({
      medicamento_id: 'm1',
      quantidade: 12,
    });

    const lotesFefo = repoSql.listarLotesComSaldoFefo('m1');
    expect(lotesFefo).toHaveLength(1);
    expect(lotesFefo[0]).toMatchObject({ numero: 'L2', saldo: 13 });
    expect(banco.transacoesExecutadas).toBe(3);
    expect(banco.comandos.filter((c) => c.sql.includes('INSERT INTO sync_outbox')).length).toBeGreaterThanOrEqual(6);
  });
});
