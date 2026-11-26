import { describe, expect, it } from 'vitest';
import { calcularTotal } from './orcamentos.service';

describe('orçamentos', () => {
  const itens = [{ quantidade: 2, valor_unitario_centavos: 1050 }, { quantidade: 1, valor_unitario_centavos: 999 }];

  it('soma os itens e tira o desconto, sempre em centavos inteiros', () => {
    expect(calcularTotal(itens, 0)).toBe(3099);
    expect(calcularTotal(itens, 99)).toBe(3000);
  });

  it('nunca fica negativo', () => {
    expect(calcularTotal(itens, 999999)).toBe(0);
    expect(calcularTotal([], 10)).toBe(0);
  });
});
