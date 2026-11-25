import { beforeEach, describe, expect, it } from 'vitest';
import type { BancoSql, ComandoSql } from '../../db/banco-sql';
import type { CotacaoDto } from '../dolar/dolar.service';
import {
  FornecedoresRepository,
  type AtualizarFornecedorDados,
  type FornecedorDto,
  type MoedaPreco,
  type NovoFornecedorDados,
  type RegistroPrecoFornecedor,
  type RepositorioFornecedores,
  type SalvarPrecoFornecedorDados,
  type TipoFornecedor,
} from './fornecedores.repository';
import { FornecedoresService, type ProvedorCotacaoDolar } from './fornecedores.service';

class RepositorioFornecedoresFalso implements RepositorioFornecedores {
  fornecedores: FornecedorDto[] = [];
  precos: Array<RegistroPrecoFornecedor & { ativo: boolean }> = [];
  private seq = 0;

  listarAtivos(): FornecedorDto[] {
    return this.fornecedores.filter((f) => f.ativo);
  }

  obterAtivoPorId(id: string): FornecedorDto | undefined {
    return this.fornecedores.find((f) => f.id === id && f.ativo);
  }

  criar(dados: NovoFornecedorDados): FornecedorDto {
    this.seq += 1;
    const novo: FornecedorDto = {
      id: `forn-${this.seq}`,
      nome: dados.nome,
      tipo: dados.tipo,
      contato: dados.contato,
      telefone: dados.telefone,
      email: dados.email,
      ativo: true,
    };
    this.fornecedores.push(novo);
    return { ...novo };
  }

  atualizar(dados: AtualizarFornecedorDados): FornecedorDto | undefined {
    const atual = this.obterAtivoPorId(dados.id);
    if (!atual) return undefined;
    if (dados.nome !== undefined) atual.nome = dados.nome;
    if (dados.tipo !== undefined) atual.tipo = dados.tipo;
    if (dados.contato !== undefined) atual.contato = dados.contato;
    if (dados.telefone !== undefined) atual.telefone = dados.telefone;
    if (dados.email !== undefined) atual.email = dados.email;
    return { ...atual };
  }

  inativar(id: string): boolean {
    const atual = this.obterAtivoPorId(id);
    if (!atual) return false;
    atual.ativo = false;
    return true;
  }

  listarPrecosPorMedicamento(medicamentoId: string): RegistroPrecoFornecedor[] {
    return this.precos
      .filter((p) => p.ativo && p.medicamento_id === medicamentoId)
      .filter((p) => this.obterAtivoPorId(p.fornecedor_id) !== undefined)
      .map((p) => ({
        id: p.id,
        medicamento_id: p.medicamento_id,
        fornecedor_id: p.fornecedor_id,
        fornecedor_nome: p.fornecedor_nome,
        fornecedor_tipo: p.fornecedor_tipo,
        moeda: p.moeda,
        preco_centavos: p.preco_centavos,
        atualizado_em: p.atualizado_em,
      }));
  }

  salvarPreco(dados: SalvarPrecoFornecedorDados): RegistroPrecoFornecedor {
    const forn = this.obterAtivoPorId(dados.fornecedor_id);
    if (!forn) throw new Error('Fornecedor não encontrado');

    const existente = this.precos.find(
      (p) => p.medicamento_id === dados.medicamento_id && p.fornecedor_id === dados.fornecedor_id,
    );
    const agora = new Date().toISOString();

    if (existente) {
      existente.moeda = dados.moeda;
      existente.preco_centavos = dados.preco_centavos;
      existente.atualizado_em = agora;
      existente.ativo = true;
      return {
        id: existente.id,
        medicamento_id: existente.medicamento_id,
        fornecedor_id: existente.fornecedor_id,
        fornecedor_nome: existente.fornecedor_nome,
        fornecedor_tipo: existente.fornecedor_tipo,
        moeda: existente.moeda,
        preco_centavos: existente.preco_centavos,
        atualizado_em: existente.atualizado_em,
      };
    }

    this.seq += 1;
    const novo = {
      id: `pf-${this.seq}`,
      medicamento_id: dados.medicamento_id,
      fornecedor_id: forn.id,
      fornecedor_nome: forn.nome,
      fornecedor_tipo: forn.tipo,
      moeda: dados.moeda,
      preco_centavos: dados.preco_centavos,
      atualizado_em: agora,
      ativo: true,
    };
    this.precos.push(novo);
    return {
      id: novo.id,
      medicamento_id: novo.medicamento_id,
      fornecedor_id: novo.fornecedor_id,
      fornecedor_nome: novo.fornecedor_nome,
      fornecedor_tipo: novo.fornecedor_tipo,
      moeda: novo.moeda,
      preco_centavos: novo.preco_centavos,
      atualizado_em: novo.atualizado_em,
    };
  }

  inativarPreco(id: string): boolean {
    const reg = this.precos.find((p) => p.id === id && p.ativo);
    if (!reg) return false;
    reg.ativo = false;
    return true;
  }
}

class BancoSqlFornecedoresEspiao implements BancoSql {
  ddls: string[] = [];
  comandos: Array<{ sql: string; params: unknown[] }> = [];
  transacoesExecutadas = 0;

  private fornecedores = new Map<
    string,
    {
      id: string;
      nome: string;
      tipo: TipoFornecedor;
      contato: string | null;
      telefone: string | null;
      email: string | null;
      ativo: number;
    }
  >();

  private precos = new Map<
    string,
    {
      id: string;
      medicamento_id: string;
      fornecedor_id: string;
      moeda: MoedaPreco;
      preco_centavos: number;
      ativo: number;
      atualizado_em: number;
    }
  >();

  exec(sql: string): void {
    this.ddls.push(sql);
  }

  prepare(sql: string): ComandoSql {
    return {
      run: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('INSERT INTO fornecedores (')) {
          const [id, nome, tipo, contato, telefone, email] = params as [
            string,
            string,
            TipoFornecedor,
            string | null,
            string | null,
            string | null,
          ];
          this.fornecedores.set(id, { id, nome, tipo, contato, telefone, email, ativo: 1 });
        } else if (sql.includes('UPDATE fornecedores SET ativo = 0')) {
          const id = params[1] as string;
          const f = this.fornecedores.get(id);
          if (f) f.ativo = 0;
        } else if (sql.includes('INSERT INTO fornecedores_precos')) {
          const [id, medicamento_id, fornecedor_id, moeda, preco_centavos, , atualizado_em] = params as [
            string,
            string,
            string,
            MoedaPreco,
            number,
            number,
            number,
          ];
          this.precos.set(id, {
            id,
            medicamento_id,
            fornecedor_id,
            moeda,
            preco_centavos,
            ativo: 1,
            atualizado_em,
          });
        } else if (sql.includes('UPDATE fornecedores_precos SET ativo = 0')) {
          const id = params[1] as string;
          const p = this.precos.get(id);
          if (p) p.ativo = 0;
        }
        return { changes: 1 };
      },
      get: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('FROM fornecedores') && sql.includes('WHERE id = ?')) {
          const id = params[0] as string;
          const f = this.fornecedores.get(id);
          return f && f.ativo === 1 ? f : undefined;
        }
        if (sql.includes('SELECT id FROM fornecedores_precos')) {
          const [medId, fornId] = params as [string, string];
          return [...this.precos.values()].find((p) => p.medicamento_id === medId && p.fornecedor_id === fornId);
        }
        return undefined;
      },
      all: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        return [];
      },
    };
  }

  transacao<T>(funcao: () => T): T {
    this.transacoesExecutadas += 1;
    return funcao();
  }
}

describe('FornecedoresService e FornecedoresRepository', () => {
  let repo: RepositorioFornecedoresFalso;
  let cotacaoCentavos: number;
  let provedorDolar: ProvedorCotacaoDolar;
  let service: FornecedoresService;
  let fornNacional1: FornecedorDto;
  let fornNacional2: FornecedorDto;
  let fornImportado: FornecedorDto;

  beforeEach(() => {
    repo = new RepositorioFornecedoresFalso();
    cotacaoCentavos = 545; // R$ 5,45
    provedorDolar = {
      atual: async (): Promise<CotacaoDto> => ({
        valor_centavos: cotacaoCentavos,
        atualizado_em: new Date().toISOString(),
        origem: 'API',
      }),
    };
    service = new FornecedoresService(repo, provedorDolar);

    fornNacional1 = service.criar({
      nome: 'VetDistribuidora Campinas',
      tipo: 'NACIONAL',
      contato: 'Sandra',
      telefone: '(19) 3344-5566',
    });
    fornNacional2 = service.criar({
      nome: 'PetFarma Sul',
      tipo: 'NACIONAL',
    });
    fornImportado = service.criar({
      nome: 'Global Vet Supplies',
      tipo: 'IMPORTADO',
      email: 'vendas@globalvet.com',
    });
  });

  it('filtra fornecedores por tipo NACIONAL/IMPORTADO e normaliza telefone apenas com dígitos', () => {
    expect(fornNacional1.telefone).toBe('1933445566');

    const apenasImportados = service.listar({ pagina: 1, tamanho: 10, tipo: 'IMPORTADO' });
    expect(apenasImportados.total).toBe(1);
    expect(apenasImportados.itens[0]?.nome).toBe('Global Vet Supplies');
  });

  it('converte preços em USD para centavos de real com a cotação atual, ordena do mais barato ao mais caro e calcula diferença percentual', async () => {
    await service.precosSalvar({
      medicamento_id: 'med-1',
      fornecedor_id: fornNacional1.id,
      moeda: 'BRL',
      preco_centavos: 1850, // R$ 18,50
    });
    await service.precosSalvar({
      medicamento_id: 'med-1',
      fornecedor_id: fornNacional2.id,
      moeda: 'BRL',
      preco_centavos: 2000, // R$ 20,00
    });
    await service.precosSalvar({
      medicamento_id: 'med-1',
      fornecedor_id: fornImportado.id,
      moeda: 'USD',
      preco_centavos: 320, // US$ 3,20 * R$ 5,45 = R$ 17,44 (1744 centavos)
    });

    const comparativo = await service.precosListar({ medicamento_id: 'med-1' });
    expect(comparativo).toHaveLength(3);

    // 1º lugar (mais barato): Global Vet Supplies (1744 centavos)
    expect(comparativo[0]).toMatchObject({
      fornecedor_id: fornImportado.id,
      moeda: 'USD',
      preco_centavos: 320,
      preco_reais_centavos: 1744,
      mais_barato: true,
      diferenca_percentual: 0,
    });

    // 2º lugar: VetDistribuidora Campinas (1850 centavos -> +6,1% sobre 1744)
    expect(comparativo[1]).toMatchObject({
      fornecedor_id: fornNacional1.id,
      moeda: 'BRL',
      preco_centavos: 1850,
      preco_reais_centavos: 1850,
      mais_barato: false,
      diferenca_percentual: 6.1,
    });

    // 3º lugar: PetFarma Sul (2000 centavos -> +14,7% sobre 1744)
    expect(comparativo[2]).toMatchObject({
      fornecedor_id: fornNacional2.id,
      moeda: 'BRL',
      preco_centavos: 2000,
      preco_reais_centavos: 2000,
      mais_barato: false,
      diferenca_percentual: 14.7,
    });
  });

  it('recalcula posição no comparativo quando a cotação do dólar sobe ou um preço é atualizado/inativado', async () => {
    await service.precosSalvar({
      medicamento_id: 'med-1',
      fornecedor_id: fornNacional1.id,
      moeda: 'BRL',
      preco_centavos: 1850,
    });
    await service.precosSalvar({
      medicamento_id: 'med-1',
      fornecedor_id: fornImportado.id,
      moeda: 'USD',
      preco_centavos: 320,
    });

    cotacaoCentavos = 600;
    const comparativoDolarAlto = await service.precosListar({ medicamento_id: 'med-1' });
    expect(comparativoDolarAlto[0]?.fornecedor_id).toBe(fornNacional1.id);
    expect(comparativoDolarAlto[0]?.mais_barato).toBe(true);
    expect(comparativoDolarAlto[1]?.fornecedor_id).toBe(fornImportado.id);
    expect(comparativoDolarAlto[1]?.preco_reais_centavos).toBe(1920);

    const idPrecoImportado = comparativoDolarAlto[1]!.id;
    service.precosInativar({ id: idPrecoImportado });

    const aposInativar = await service.precosListar({ medicamento_id: 'med-1' });
    expect(aposInativar).toHaveLength(1);
    expect(aposInativar[0]?.fornecedor_id).toBe(fornNacional1.id);
  });

  it('FornecedoresRepository: garante CREATE TABLE IF NOT EXISTS (fornecedores, fornecedores_precos, sync_outbox), usa transação, grava na sync_outbox e faz exclusão lógica (ativo = 0)', () => {
    const banco = new BancoSqlFornecedoresEspiao();
    const repoSql = new FornecedoresRepository(banco);

    const forn = repoSql.criar({
      nome: 'BioVet Import',
      tipo: 'IMPORTADO',
      contato: 'Marcos',
    });

    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS fornecedores');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS fornecedores_precos');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS sync_outbox');

    const preco = repoSql.salvarPreco({
      medicamento_id: 'med-1',
      fornecedor_id: forn.id,
      moeda: 'USD',
      preco_centavos: 400,
    });

    expect(repoSql.inativarPreco(preco.id)).toBe(true);
    expect(repoSql.inativar(forn.id)).toBe(true);

    // 4 escritas = 4 transações atômicas + 4 gravações em sync_outbox, zero DELETE físico
    expect(banco.transacoesExecutadas).toBe(4);
    expect(banco.comandos.filter((c) => c.sql.includes('INSERT INTO sync_outbox'))).toHaveLength(4);
    expect(banco.comandos.some((c) => c.sql.toUpperCase().includes('DELETE'))).toBe(false);
  });
});
