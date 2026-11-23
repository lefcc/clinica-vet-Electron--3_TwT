import { describe, expect, it } from 'vitest';
import { dinheiroParaCentavos, mascaraCep, mascaraCpf, mascaraDinheiro, mascaraTelefone } from './mascaras';

describe('máscaras', () => {
  it('CPF', () => {
    expect(mascaraCpf('12345678901')).toBe('123.456.789-01');
    expect(mascaraCpf('123456')).toBe('123.456');
    expect(mascaraCpf('abc')).toBe('');
  });
  it('telefone com 10 e 11 dígitos', () => {
    expect(mascaraTelefone('1933334444')).toBe('(19) 3333-4444');
    expect(mascaraTelefone('19999998888')).toBe('(19) 99999-8888');
  });
  it('CEP', () => {
    expect(mascaraCep('13083970')).toBe('13083-970');
    expect(mascaraCep('130')).toBe('130');
  });
  it('dinheiro e conversão para centavos', () => {
    expect(mascaraDinheiro('1250')).toBe('12,50');
    expect(mascaraDinheiro('5')).toBe('0,05');
    expect(mascaraDinheiro('123456789')).toBe('1.234.567,89');
    expect(dinheiroParaCentavos('1.234,56')).toBe(123456);
  });
});
