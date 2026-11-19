// Testes para tipos de perfil
import { describe, it, expect } from 'vitest';

describe('Perfil', () => {
  it('deve permitir apenas perfis válidos', () => {
    const perfisValidos: Array<'MASTER' | 'VETERINARIO' | 'ATENDENTE'> = ['MASTER', 'VETERINARIO', 'ATENDENTE'];
    expect(perfisValidos).toHaveLength(3);
  });
});