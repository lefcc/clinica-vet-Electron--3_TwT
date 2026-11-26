import { z, ZodError } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { RepositorioClientes, EntradaListagem, Pagina, Cliente, NovoCliente } from './clientes.repository';

// ============================================================================
// SCHEMAS ZOD (entrada do front)
// ============================================================================

export const ClienteEntradaSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  cpf: z.string().trim().length(11, 'CPF deve ter 11 dígitos'),
  telefone: z.string().trim().min(8).max(20).optional(),
  email: z.string().email().max(120).optional().or(z.literal('')),
  cep: z.string().trim().length(8).optional().or(z.literal('')),
  logradouro: z.string().trim().max(120).optional().or(z.literal('')),
  numero: z.string().trim().max(20).optional().or(z.literal('')),
  complemento: z.string().trim().max(60).optional().or(z.literal('')),
  bairro: z.string().trim().max(80).optional().or(z.literal('')),
  cidade: z.string().trim().max(80).optional().or(z.literal('')),
  uf: z.string().trim().length(2).optional().or(z.literal('')),
});

export const ClienteAtualizarSchema = ClienteEntradaSchema.partial();

export const ClienteIdSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// SERVICE
// ============================================================================

export class ClienteService {
  constructor(private readonly repo: RepositorioClientes) {}

  listar(entrada: unknown): Pagina<Cliente> {
    const dados = this.validarSchema(this.validarListagem, entrada);
    return this.repo.listar(dados);
  }

  obter(id: string): Cliente {
    const { id: idValido } = this.validarSchema(ClienteIdSchema.parse, { id });
    const cliente = this.repo.obter(idValido);
    if (!cliente) throw new ErroNegocio('NAO_ENCONTRADO', 'Cliente não encontrado.');
    return cliente;
  }

  criar(entrada: unknown): Cliente {
    // Zod garante que nome e cpf estão presentes (não são optional no schema)
    const dados = this.validarSchema(ClienteEntradaSchema.parse, entrada);

    // CPF duplicado (case-insensitive)
    if (this.repo.buscarPorCpf(dados.cpf)) {
      throw new ErroNegocio('CPF_DUPLICADO', 'Já existe um cliente com este CPF.');
    }

    // Limpar campos opcionais vazios (campos obrigatórios já validados pelo Zod)
    const limpo = this.limparCamposOpcionais(dados);
    // Cast para o tipo esperado pelo repository (limparCamposOpcionais não remove nome/cpf)
    return this.repo.criar(limpo as unknown as Omit<NovoCliente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>);
  }

  atualizar(entrada: unknown): Cliente {
    const schemaAtualizar = z.object({ id: z.string().uuid() }).merge(ClienteAtualizarSchema);
    const parsed = this.validarSchema(schemaAtualizar.parse, entrada);
    const { id, ...dados } = parsed;

    // CPF duplicado (se estiver mudando o CPF)
    if (dados.cpf && this.repo.buscarPorCpf(dados.cpf, id)) {
      throw new ErroNegocio('CPF_DUPLICADO', 'Já existe um cliente com este CPF.');
    }

    // Cast antes de limpar para que TypeScript entenda que os campos obrigatórios não são undefined
    const dadosParaLimpar = dados as z.infer<typeof ClienteEntradaSchema>;
    const limpo = this.limparCamposOpcionais(dadosParaLimpar);
    // limparCamposOpcionais só remove campos opcionais vazios, nunca nome/cpf (obrigatórios)
    // Cast explícito para satisfazer TypeScript
    return this.repo.atualizar(
      id,
      limpo as unknown as Partial<Omit<NovoCliente, 'id' | 'criadoEm'>>,
    );
  }

  inativar(id: string): void {
    const { id: idValido } = this.validarSchema(ClienteIdSchema.parse, { id });

    // Verificar se tem animais ativos
    if (this.repo.contarAnimaisAtivos(idValido) > 0) {
      throw new ErroNegocio(
        'CLIENTE_POSSUI_ANIMAIS_ATIVOS',
        'Não é possível inativar: o cliente possui animais ativos.',
      );
    }

    this.repo.inativar(idValido);
  }

  // ---------- Helpers ----------
  private validarSchema<T>(parser: (dados: unknown) => T, entrada: unknown): T {
    try {
      return parser(entrada);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ErroNegocio('DADOS_INVALIDOS', e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; '));
      }
      throw e;
    }
  }

  private validarListagem(entrada: unknown): EntradaListagem {
    const schema = z.object({
      pagina: z.coerce.number().int().min(1).default(1),
      tamanho: z.coerce.number().int().min(1).max(200).default(10),
      busca: z.string().trim().optional(),
    });
    return schema.parse(entrada);
  }

  private limparCamposOpcionais(dados: z.infer<typeof ClienteEntradaSchema>): z.infer<typeof ClienteEntradaSchema> {
    const resultado: Record<string, unknown> = { ...dados };
    for (const chave of ['telefone', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const) {
      if (resultado[chave] === '') {
        delete resultado[chave];
      }
    }
    return resultado as z.infer<typeof ClienteEntradaSchema>;
  }
}