import { beforeEach, describe, expect, it } from 'vitest';
import type { BancoSql, ComandoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import {
  CotacaoDolarRepository,
  criarBuscadorAwesomeApi,
  DolarService,
  type RegistroCotacaoSalva,
  type RepositorioCotacaoDolar,
} from './dolar.service';

class RepositorioCotacaoFalso implements RepositorioCotacaoDolar {
  historico: RegistroCotacaoSalva[] = [];

  salvar(valorCentavos: number): RegistroCotacaoSalva {
    const reg: RegistroCotacaoSalva = {
      valor_centavos: valorCentavos,
      atualizado_em: new Date().toISOString(),
    };
    this.historico.push(reg);
    return reg;
  }

  obterUltima(): RegistroCotacaoSalva | undefined {
    return this.historico[this.historico.length - 1];
  }
}

class BancoSqlCotacaoEspiao implements BancoSql {
  ddls: string[] = [];
  linhas: Array<{ id: string; valor_centavos: number; data_cotacao: number }> = [];

  exec(sql: string): void {
    this.ddls.push(sql);
  }

  prepare(sql: string): ComandoSql {
    return {
      run: (...params: unknown[]) => {
        if (sql.includes('INSERT INTO cotacoes_dolar')) {
          this.linhas.push({
            id: String(params[0]),
            valor_centavos: Number(params[1]),
            data_cotacao: Number(params[2]),
          });
        }
        return { changes: 1 };
      },
      get: () => this.linhas[this.linhas.length - 1],
      all: () => this.linhas,
    };
  }

  transacao<T>(funcao: () => T): T {
    return funcao();
  }
}

describe('DolarService e CotacaoDolarRepository', () => {
  let repo: RepositorioCotacaoFalso;

  beforeEach(() => {
    repo = new RepositorioCotacaoFalso();
  });

  it('busca na AwesomeAPI, converte para centavos, salva no banco e retorna origem API', async () => {
    const fetchMock = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ USDBRL: { bid: '5.489' } }),
    })) as unknown as typeof fetch;

    const buscador = criarBuscadorAwesomeApi('https://economia.awesomeapi.com.br/json/last/USD-BRL', fetchMock);
    const service = new DolarService(repo, buscador);

    const cotacao = await service.atual();
    expect(cotacao.valor_centavos).toBe(549); // Math.round(5.489 * 100)
    expect(cotacao.origem).toBe('API');
    expect(repo.historico).toHaveLength(1);
    expect(repo.obterUltima()?.valor_centavos).toBe(549);
  });

  it('retorna a última cotação salva com origem CACHE quando estiver offline ou a API falhar', async () => {
    repo.salvar(532);

    const buscadorComFalha = async (): Promise<number> => {
      throw new Error('Sem conexão de rede');
    };
    const service = new DolarService(repo, buscadorComFalha, null);

    const cotacao = await service.atual();
    expect(cotacao.valor_centavos).toBe(532);
    expect(cotacao.origem).toBe('CACHE');
  });

  it('lança COTACAO_INDISPONIVEL quando a API falha, não há cache no banco e o fallback padrão está desativado', async () => {
    const buscadorComFalha = async (): Promise<number> => {
      throw new Error('Offline');
    };
    const service = new DolarService(repo, buscadorComFalha, null);

    await expect(service.atual()).rejects.toThrowError(ErroNegocio);
  });

  it('CotacaoDolarRepository: garante CREATE TABLE IF NOT EXISTS cotacoes_dolar e persiste/recupera última cotação', () => {
    const banco = new BancoSqlCotacaoEspiao();
    const repoSql = new CotacaoDolarRepository(banco);

    const salva = repoSql.salvar(545, 'awesomeapi');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS cotacoes_dolar');
    expect(salva.valor_centavos).toBe(545);

    const ultima = repoSql.obterUltima();
    expect(ultima?.valor_centavos).toBe(545);
    expect(ultima?.atualizado_em).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
