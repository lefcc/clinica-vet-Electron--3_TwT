import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';

export interface CotacaoDto {
  valor_centavos: number;
  atualizado_em: string;
  origem: 'API' | 'CACHE';
}

export interface RegistroCotacaoSalva {
  valor_centavos: number;
  atualizado_em: string;
}

export interface RepositorioCotacaoDolar {
  salvar(valorCentavos: number, fonte?: string): RegistroCotacaoSalva;
  obterUltima(): RegistroCotacaoSalva | undefined;
}

export type BuscadorCotacaoRemota = () => Promise<number>;

interface LinhaCotacao {
  valor_centavos: number;
  data_cotacao: number | string;
}

interface RespostaAwesomeApi {
  USDBRL?: {
    bid?: string;
  };
}

function normalizarTimestampIso(dataCotacao: number | string): string {
  if (typeof dataCotacao === 'string' && dataCotacao.includes('T')) {
    return dataCotacao;
  }
  const num = Number(dataCotacao);
  if (!Number.isNaN(num) && num > 0) {
    // Suporta tanto milissegundos (Date.now() em jobs/index.ts) quanto segundos Unix
    const ms = num < 10_000_000_000 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

export class CotacaoDolarRepository implements RepositorioCotacaoDolar {
  constructor(private readonly banco: BancoSql) {}

  private garantirTabela(): void {
    this.banco.exec(`
      CREATE TABLE IF NOT EXISTS cotacoes_dolar (
        id TEXT PRIMARY KEY NOT NULL,
        valor_centavos INTEGER NOT NULL,
        data_cotacao INTEGER NOT NULL,
        fonte TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        atualizado_em INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_cotacoes_dolar_data_cotacao ON cotacoes_dolar (data_cotacao);
    `);
  }

  salvar(valorCentavos: number, fonte = 'awesomeapi'): RegistroCotacaoSalva {
    this.garantirTabela();
    const id = randomUUID();
    const agoraSeg = Math.floor(Date.now() / 1000);
    this.banco
      .prepare(
        `INSERT INTO cotacoes_dolar (id, valor_centavos, data_cotacao, fonte, ativo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, valorCentavos, agoraSeg, fonte, agoraSeg, agoraSeg);

    return {
      valor_centavos: valorCentavos,
      atualizado_em: new Date(agoraSeg * 1000).toISOString(),
    };
  }

  obterUltima(): RegistroCotacaoSalva | undefined {
    this.garantirTabela();
    const linha = this.banco
      .prepare(
        `SELECT valor_centavos, data_cotacao
         FROM cotacoes_dolar
         WHERE ativo = 1
         ORDER BY data_cotacao DESC, criado_em DESC
         LIMIT 1`,
      )
      .get() as LinhaCotacao | undefined;

    if (!linha) return undefined;
    return {
      valor_centavos: Number(linha.valor_centavos),
      atualizado_em: normalizarTimestampIso(linha.data_cotacao),
    };
  }
}

export function criarBuscadorAwesomeApi(
  apiUrl = 'https://economia.awesomeapi.com.br/json/last/USD-BRL',
  fetchFn: typeof fetch = fetch,
): BuscadorCotacaoRemota {
  return async (): Promise<number> => {
    const resposta = await fetchFn(apiUrl);
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }
    const json = (await resposta.json()) as RespostaAwesomeApi;
    const bidTexto = json.USDBRL?.bid;
    const valorFloat = bidTexto ? Number.parseFloat(bidTexto) : Number.NaN;
    if (Number.isNaN(valorFloat) || valorFloat <= 0) {
      throw new Error('Cotação USD-BRL inválida retornada pela API.');
    }
    return Math.round(valorFloat * 100);
  };
}

export class DolarService {
  constructor(
    private readonly repositorio: RepositorioCotacaoDolar,
    private readonly buscarRemoto: BuscadorCotacaoRemota = criarBuscadorAwesomeApi(),
    private readonly cotacaoFallbackPadraoCentavos: number | null = 545,
  ) {}

  async atual(): Promise<CotacaoDto> {
    try {
      const valorCentavos = await this.buscarRemoto();
      if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
        throw new Error('Cotação inválida.');
      }
      const salva = this.repositorio.salvar(valorCentavos, 'awesomeapi');
      return {
        valor_centavos: salva.valor_centavos,
        atualizado_em: salva.atualizado_em,
        origem: 'API',
      };
    } catch {
      const cache = this.repositorio.obterUltima();
      if (cache) {
        return {
          valor_centavos: cache.valor_centavos,
          atualizado_em: cache.atualizado_em,
          origem: 'CACHE',
        };
      }
      if (this.cotacaoFallbackPadraoCentavos && this.cotacaoFallbackPadraoCentavos > 0) {
        return {
          valor_centavos: this.cotacaoFallbackPadraoCentavos,
          atualizado_em: new Date().toISOString(),
          origem: 'CACHE',
        };
      }
      throw new ErroNegocio('COTACAO_INDISPONIVEL', 'Não há conexão com a internet nem cotação salva localmente.');
    }
  }
}
