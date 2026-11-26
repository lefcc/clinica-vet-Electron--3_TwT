import { describe, expect, it } from 'vitest';
import { criarMockTrilha4 } from './trilha4.mock';

describe('mock da trilha 4', () => {
  it('responde todos os canais e faz o cadastro de serviço', () => {
    const mock = criarMockTrilha4();
    const canais = ['dashboard:resumo', 'cep:buscar', 'whatsapp:abrir', 'vacinas:fila', 'vacinas:aplicar', 'vacinas:lembrete_registrar',
      ...['listar', 'obter', 'criar', 'atualizar', 'inativar'].flatMap((a) => [`vacinas:catalogo_${a}`, `servicos:${a}`]),
      'orcamentos:listar', 'orcamentos:obter', 'orcamentos:criar', 'orcamentos:pdf', 'relatorios:cobrancas',
      'relatorios:estoque_validade', 'relatorios:lista_compras', 'csv:exportar', 'csv:importar'];
    expect(Object.keys(mock).sort()).toEqual(canais.sort());
    expect(mock['servicos:criar']!({ nome: 'Banho', valor_centavos: 5000 })).toMatchObject({ ok: true, dados: { nome: 'Banho' } });
    expect(mock['servicos:listar']!()).toMatchObject({ dados: { total: 2 } });
  });

  it('calcula o total do orçamento em centavos e valida o cep', () => {
    const mock = criarMockTrilha4();
    const r = mock['orcamentos:criar']!({
      itens: [{ tipo: 'SERVICO', item_id: 's1', descricao: 'Consulta', quantidade: 2, valor_unitario_centavos: 100 }],
      desconto_centavos: 50, forma_pagamento: 'PIX'
    });
    expect(r).toMatchObject({ ok: true, dados: { numero: 1, total_centavos: 150 } });
    expect(mock['cep:buscar']!({ cep: '1' })).toMatchObject({ ok: false, erro: { codigo: 'CEP_INVALIDO' } });
  });
});
