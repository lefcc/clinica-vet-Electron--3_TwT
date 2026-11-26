import { describe, expect, it } from 'vitest';
import { criarMockTrilha4 } from './trilha4.mock';

describe('mock da trilha 4', () => {
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
