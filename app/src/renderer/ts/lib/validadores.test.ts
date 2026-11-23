import { describe, expect, it } from 'vitest';
import { validarCep, validarCpf, validarEmail, validarTelefone } from './validadores';

describe('validadores', () => {
  it('CPF confere os dígitos verificadores', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
    expect(validarCpf('529.982.247-26')).toBe(false);
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('123')).toBe(false);
  });
  it('telefone com 10 ou 11 dígitos', () => {
    expect(validarTelefone('(19) 3333-4444')).toBe(true);
    expect(validarTelefone('(19) 99999-8888')).toBe(true);
    expect(validarTelefone('999-8888')).toBe(false);
  });
  it('e-mail e CEP', () => {
    expect(validarEmail('a@b.com')).toBe(true);
    expect(validarEmail('a@b')).toBe(false);
    expect(validarCep('13083-970')).toBe(true);
    expect(validarCep('1308')).toBe(false);
  });
});
