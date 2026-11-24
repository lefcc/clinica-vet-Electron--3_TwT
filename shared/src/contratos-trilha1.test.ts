import { describe, expect, it } from 'vitest';
import {
  ClienteCriarSchema, ClienteSchema, ConsultaCriarSchema, CsvImportarEntradaSchema,
  FornecedorCriarSchema, FornecedorListarSchema, FornecedorSchema, MovimentacaoCriarSchema
} from './index';

describe('Contratos dos formulários existentes', () => {
  it('aceita CEP e telefone opcionais vazios nas entradas, com formato público normalizado', () => {
    const cliente = { nome: 'Tutor', cpf: '52998224725', telefone: '11999999999', cep: '' };
    const fornecedor = { nome: 'Fornecedor de teste', tipo: 'NACIONAL', telefone: '' };
    expect(ClienteCriarSchema.parse(cliente).cep).toBeUndefined();
    expect(FornecedorCriarSchema.parse(fornecedor).telefone).toBeUndefined();
    expect(ClienteSchema.safeParse({ ...cliente, id: 'teste', ativo: true }).success).toBe(false);
    expect(FornecedorSchema.safeParse({ ...fornecedor, id: 'teste', ativo: true }).success).toBe(false);
    expect(ClienteCriarSchema.safeParse({ ...cliente, cep: '123' }).success).toBe(false);
    expect(FornecedorCriarSchema.safeParse({ ...fornecedor, telefone: '123' }).success).toBe(false);
  });

  it('valida filtros e entidades no formato usado pelo renderer', () => {
    expect(FornecedorListarSchema.safeParse({ pagina: 1, tamanho: 200, tipo: 'IMPORTADO' }).success).toBe(true);
    expect(FornecedorListarSchema.safeParse({ pagina: 1, tamanho: 200, tipo: 'OUTRO' }).success).toBe(false);
    expect(CsvImportarEntradaSchema.safeParse({ entidade: 'animais', conteudo: 'nome;especie' }).success).toBe(true);
    expect(CsvImportarEntradaSchema.safeParse({ entidade: 'usuarios', conteudo: 'login' }).success).toBe(false);
  });

  it('rejeita quantidades não finitas antes de persistir ou calcular saldo', () => {
    expect(MovimentacaoCriarSchema.safeParse({
      medicamento_id: 'teste', tipo: 'AJUSTE', quantidade: Infinity
    }).success).toBe(false);
    expect(ConsultaCriarSchema.safeParse({
      animal_id: 'teste', anamnese: 'Atendimento', prescricoes: [{ medicamento_id: 'teste', quantidade: Infinity }]
    }).success).toBe(false);
  });
});
