import { z, ZodError } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type {
  RepositorioAnimais,
  EntradaListagem,
  Pagina,
  AnimalComCliente,
  NovoAnimal,
} from './animais.repository';

// ============================================================================
// SCHEMAS ZOD (entrada do front)
// ============================================================================

export const AnimalEntradaSchema = z.object({
  cliente_id: z.string().uuid('Cliente inválido'),
  nome: z.string().trim().min(1).max(80),
  especie: z.string().trim().min(1).max(60),
  raca: z.string().trim().max(60).optional().or(z.literal('')),
  sexo: z.enum(['M', 'F']),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)').optional().or(z.literal('')),
  peso_kg: z.coerce.number().positive().max(999.99).optional(),
  observacoes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const AnimalAtualizarSchema = AnimalEntradaSchema.partial();

export const AnimalIdSchema = z.object({
  id: z.string().uuid(),
});

export const AnimalListarPorClienteSchema = z.object({
  cliente_id: z.string().uuid(),
});

// ============================================================================
// SERVICE
// ============================================================================

export class AnimalService {
  constructor(private readonly repo: RepositorioAnimais) {}

  listar(entrada: unknown): Pagina<AnimalComCliente> {
    const dados = this.validarSchema(this.validarListagem, entrada);
    return this.repo.listar(dados);
  }

  obter(id: string): AnimalComCliente {
    const { id: idValido } = this.validarSchema(AnimalIdSchema.parse, { id });
    const animal = this.repo.obter(idValido);
    if (!animal) throw new ErroNegocio('NAO_ENCONTRADO', 'Animal não encontrado.');
    return animal;
  }

  listarPorCliente(entrada: unknown): AnimalComCliente[] {
    const { cliente_id } = this.validarSchema(AnimalListarPorClienteSchema.parse, entrada);
    if (!this.repo.verificarClienteExiste(cliente_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Cliente não encontrado ou inativo.');
    }
    return this.repo.listarPorCliente(cliente_id);
  }

  criar(entrada: unknown): AnimalComCliente {
    // Zod garante que cliente_id, nome, especie, sexo estão presentes (não são optional no schema)
    const dados = this.validarSchema(AnimalEntradaSchema.parse, entrada);

    // Verificar se cliente existe e está ativo
    if (!this.repo.verificarClienteExiste(dados.cliente_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Cliente não encontrado ou inativo.');
    }

    const limpo = this.limparCamposOpcionais(dados);
    // Cast para o tipo esperado pelo converterParaRepository (limparCamposOpcionais não remove campos obrigatórios)
    return this.repo.criar(this.converterParaRepository(limpo as unknown as z.infer<typeof AnimalEntradaSchema>));
  }

  atualizar(entrada: unknown): AnimalComCliente {
    const schemaAtualizar = z.object({ id: z.string().uuid() }).merge(AnimalAtualizarSchema);
    const parsed = this.validarSchema(schemaAtualizar.parse, entrada);
    const { id, ...dados } = parsed;

    // Se está mudando o cliente_id, verificar se existe
    if (dados.cliente_id && !this.repo.verificarClienteExiste(dados.cliente_id)) {
      throw new ErroNegocio('NAO_ENCONTRADO', 'Cliente não encontrado ou inativo.');
    }

    // Cast antes de limpar para que TypeScript entenda que os campos obrigatórios não são undefined
    const dadosParaLimpar = dados as z.infer<typeof AnimalEntradaSchema>;
    const limpo = this.limparCamposOpcionais(dadosParaLimpar);
    // O repository espera Partial<Omit<NovoAnimal, 'id' | 'criadoEm'>> - todos os campos opcionais
    // O converterParaRepository espera campos obrigatórios, então vamos adaptar
    const paraAtualizar: Partial<Omit<NovoAnimal, 'id' | 'criadoEm'>> = {};
    if (limpo.cliente_id !== undefined) paraAtualizar.clienteId = limpo.cliente_id;
    if (limpo.nome !== undefined) paraAtualizar.nome = limpo.nome;
    if (limpo.especie !== undefined) paraAtualizar.especie = limpo.especie;
    if (limpo.raca !== undefined) paraAtualizar.raca = limpo.raca;
    if (limpo.sexo !== undefined) paraAtualizar.sexo = limpo.sexo;
    if (limpo.data_nascimento !== undefined) {
      paraAtualizar.dataNascimento = limpo.data_nascimento
        ? Math.floor(new Date(limpo.data_nascimento + 'T00:00:00').getTime() / 1000)
        : null;
    }
    if (limpo.peso_kg !== undefined) paraAtualizar.pesoKg = limpo.peso_kg;
    if (limpo.observacoes !== undefined) paraAtualizar.observacoes = limpo.observacoes;
    return this.repo.atualizar(id, paraAtualizar);
  }

  inativar(id: string): void {
    const { id: idValido } = this.validarSchema(AnimalIdSchema.parse, { id });
    this.repo.inativar(idValido);
  }

  // ---------- Helpers ----------
  private validarListagem(entrada: unknown): EntradaListagem {
    const schema = z.object({
      pagina: z.coerce.number().int().min(1).default(1),
      tamanho: z.coerce.number().int().min(1).max(200).default(10),
      busca: z.string().trim().optional(),
    });
    return schema.parse(entrada);
  }

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

  private limparCamposOpcionais(
    dados: z.infer<typeof AnimalEntradaSchema>,
  ): z.infer<typeof AnimalEntradaSchema> {
    const resultado: Record<string, unknown> = { ...dados };
    for (const chave of ['raca', 'data_nascimento', 'peso_kg', 'observacoes'] as const) {
      if (resultado[chave] === '' || resultado[chave] === undefined) {
        delete resultado[chave];
      }
    }
    return resultado as z.infer<typeof AnimalEntradaSchema>;
  }

  private converterParaRepository(
    dados: z.infer<typeof AnimalEntradaSchema>,
  ): Omit<NovoAnimal, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'> {
    return {
      clienteId: dados.cliente_id!,
      nome: dados.nome!,
      especie: dados.especie!,
      raca: dados.raca,
      sexo: dados.sexo!,
      dataNascimento: dados.data_nascimento ? Math.floor(new Date(dados.data_nascimento + 'T00:00:00').getTime() / 1000) : undefined,
      pesoKg: dados.peso_kg,
      observacoes: dados.observacoes,
    };
  }
}