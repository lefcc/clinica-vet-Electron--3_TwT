import { z } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { CotacaoDto } from '../dolar/dolar.service';
import type {
  FornecedorDto,
  MoedaPreco,
  RepositorioFornecedores,
  TipoFornecedor,
} from './fornecedores.repository';

export interface PaginaFornecedoresDto {
  itens: FornecedorDto[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface PrecoFornecedorDto {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_tipo: TipoFornecedor;
  moeda: MoedaPreco;
  preco_centavos: number;
  preco_reais_centavos: number;
  diferenca_percentual: number;
  mais_barato: boolean;
  atualizado_em: string;
}

export interface ProvedorCotacaoDolar {
  atual(): Promise<CotacaoDto>;
}

export const ListarFornecedoresSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(10),
  busca: z.string().optional(),
  tipo: z.enum(['NACIONAL', 'IMPORTADO', '']).optional(),
});

export const ObterFornecedorSchema = z.object({
  id: z.string().trim().min(1),
});

export const CriarFornecedorSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do fornecedor.').max(150),
  tipo: z.enum(['NACIONAL', 'IMPORTADO']),
  contato: z.string().trim().max(120).optional(),
  telefone: z.string().trim().max(25).optional(),
  email: z.string().trim().email('E-mail inválido.').max(150).optional().or(z.literal('')),
});

export const AtualizarFornecedorSchema = z.object({
  id: z.string().trim().min(1),
  nome: z.string().trim().min(1).max(150).optional(),
  tipo: z.enum(['NACIONAL', 'IMPORTADO']).optional(),
  contato: z.string().trim().max(120).optional(),
  telefone: z.string().trim().max(25).optional(),
  email: z.string().trim().email('E-mail inválido.').max(150).optional().or(z.literal('')),
});

export const ListarPrecosFornecedorSchema = z.object({
  medicamento_id: z.string().trim().min(1, 'Informe o medicamento.'),
});

export const SalvarPrecoFornecedorSchema = z.object({
  medicamento_id: z.string().trim().min(1, 'Informe o medicamento.'),
  fornecedor_id: z.string().trim().min(1, 'Informe o fornecedor.'),
  moeda: z.enum(['BRL', 'USD']),
  preco_centavos: z.coerce.number().int().min(1, 'O preço em centavos deve ser maior que zero.'),
});

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function limparTelefone(telefone?: string): string | undefined {
  if (!telefone) return undefined;
  const digitos = telefone.replace(/\D/g, '');
  return digitos.length > 0 ? digitos : undefined;
}

export class FornecedoresService {
  constructor(
    private readonly repositorio: RepositorioFornecedores,
    private readonly dolar: ProvedorCotacaoDolar,
  ) {}

  listar(entrada: unknown = {}): PaginaFornecedoresDto {
    const validado = ListarFornecedoresSchema.safeParse(entrada ?? {});
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Parâmetros de listagem de fornecedores inválidos.');
    }

    const { pagina, tamanho, busca, tipo } = validado.data;
    let ativos = this.repositorio.listarAtivos();

    if (tipo === 'NACIONAL' || tipo === 'IMPORTADO') {
      ativos = ativos.filter((f) => f.tipo === tipo);
    }

    const termo = normalizarTexto(busca ?? '');
    if (termo) {
      ativos = ativos.filter(
        (f) =>
          normalizarTexto(f.nome).includes(termo) ||
          normalizarTexto(f.contato ?? '').includes(termo) ||
          normalizarTexto(f.email ?? '').includes(termo),
      );
    }

    const inicio = (pagina - 1) * tamanho;
    return {
      itens: ativos.slice(inicio, inicio + tamanho),
      total: ativos.length,
      pagina,
      tamanho,
    };
  }

  obter(entrada: unknown): FornecedorDto {
    const validado = ObterFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o identificador do fornecedor.');
    }

    const fornecedor = this.repositorio.obterAtivoPorId(validado.data.id);
    if (!fornecedor) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    }
    return fornecedor;
  }

  criar(entrada: unknown): FornecedorDto {
    const validado = CriarFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para cadastro de fornecedor.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    return this.repositorio.criar({
      nome: dados.nome,
      tipo: dados.tipo,
      contato: dados.contato || undefined,
      telefone: limparTelefone(dados.telefone),
      email: dados.email || undefined,
    });
  }

  atualizar(entrada: unknown): FornecedorDto {
    const validado = AtualizarFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para atualização de fornecedor.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    const atual = this.repositorio.obterAtivoPorId(dados.id);
    if (!atual) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    }

    const atualizado = this.repositorio.atualizar({
      id: dados.id,
      nome: dados.nome ?? atual.nome,
      tipo: dados.tipo ?? atual.tipo,
      contato: dados.contato !== undefined ? (dados.contato || undefined) : atual.contato,
      telefone: dados.telefone !== undefined ? limparTelefone(dados.telefone) : atual.telefone,
      email: dados.email !== undefined ? (dados.email || undefined) : atual.email,
    });

    if (!atualizado) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    }
    return atualizado;
  }

  inativar(entrada: unknown): { id: string } {
    const validado = ObterFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o identificador do fornecedor.');
    }

    const sucesso = this.repositorio.inativar(validado.data.id);
    if (!sucesso) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    }
    return { id: validado.data.id };
  }

  async precosListar(entrada: unknown): Promise<PrecoFornecedorDto[]> {
    const validado = ListarPrecosFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o medicamento para consultar o comparativo de preços.');
    }

    const registros = this.repositorio.listarPrecosPorMedicamento(validado.data.medicamento_id);
    if (registros.length === 0) return [];

    const cotacao = await this.dolar.atual();
    const dolarCentavos = cotacao.valor_centavos;

    const convertidos = registros
      .map((reg) => {
        const precoReaisCentavos =
          reg.moeda === 'USD'
            ? Math.round((reg.preco_centavos * dolarCentavos) / 100)
            : reg.preco_centavos;

        return {
          ...reg,
          preco_reais_centavos: precoReaisCentavos,
        };
      })
      .sort((a, b) => a.preco_reais_centavos - b.preco_reais_centavos);

    const menorPreco = convertidos[0]?.preco_reais_centavos ?? 0;

    return convertidos.map((item, indice) => {
      const maisBarato = indice === 0;
      const diferencaPercentual =
        maisBarato || menorPreco <= 0
          ? 0
          : Math.round(((item.preco_reais_centavos - menorPreco) / menorPreco) * 1000) / 10;

      return {
        ...item,
        diferenca_percentual: diferencaPercentual,
        mais_barato: maisBarato,
      };
    });
  }

  async precosSalvar(entrada: unknown): Promise<PrecoFornecedorDto[]> {
    const validado = SalvarPrecoFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      const mensagem = validado.error.issues[0]?.message ?? 'Dados inválidos para salvar o preço do fornecedor.';
      throw new ErroNegocio('DADOS_INVALIDOS', mensagem);
    }

    const dados = validado.data;
    const fornecedor = this.repositorio.obterAtivoPorId(dados.fornecedor_id);
    if (!fornecedor) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Fornecedor não encontrado.');
    }

    this.repositorio.salvarPreco({
      medicamento_id: dados.medicamento_id,
      fornecedor_id: dados.fornecedor_id,
      moeda: dados.moeda,
      preco_centavos: dados.preco_centavos,
    });

    return this.precosListar({ medicamento_id: dados.medicamento_id });
  }

  precosInativar(entrada: unknown): { id: string } {
    const validado = ObterFornecedorSchema.safeParse(entrada);
    if (!validado.success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o identificador do preço.');
    }

    const sucesso = this.repositorio.inativarPreco(validado.data.id);
    if (!sucesso) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Preço de fornecedor não encontrado.');
    }
    return { id: validado.data.id };
  }
}
