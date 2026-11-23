import { describe, expect, it } from 'vitest';
import { itensDoMenu, podeAcessar } from './menu.config';
import { dividirRota, rotaDoHash } from '../router/router';

const rotas = (perfil: 'MASTER' | 'VETERINARIO' | 'ATENDENTE') => itensDoMenu(perfil).map((i) => i.rota);

describe('menu por perfil', () => {
  it('MASTER vê tudo, inclusive colaboradores', () => {
    expect(rotas('MASTER')).toContain('colaboradores');
    expect(rotas('MASTER')).toContain('relatorios');
  });

  it('VETERINARIO não vê colaboradores, orçamentos nem relatórios', () => {
    const r = rotas('VETERINARIO');
    expect(r).toContain('consultas');
    expect(r).not.toContain('colaboradores');
    expect(r).not.toContain('orcamentos');
    expect(r).not.toContain('relatorios');
  });

  it('ATENDENTE vê orçamentos, mas não colaboradores nem relatórios', () => {
    const r = rotas('ATENDENTE');
    expect(r).toContain('orcamentos');
    expect(r).toContain('clientes');
    expect(r).not.toContain('colaboradores');
    expect(r).not.toContain('relatorios');
  });

  it('catálogo de dev fica fora do menu, mas acessível', () => {
    expect(rotas('MASTER')).not.toContain('dev/componentes');
    expect(podeAcessar('ATENDENTE', 'dev/componentes')).toBe(true);
  });

  it('bloqueia rota proibida e rota inexistente', () => {
    expect(podeAcessar('ATENDENTE', 'colaboradores')).toBe(false);
    expect(podeAcessar('MASTER', 'nao-existe')).toBe(false);
  });
});

describe('telas restritas ao MASTER', () => {
  it('conflitos de sincronização, colaboradores e fornecedores só para MASTER', () => {
    for (const rota of ['conflitos', 'colaboradores', 'fornecedores', 'relatorios', 'auditoria', 'configuracoes']) {
      expect(podeAcessar('MASTER', rota)).toBe(true);
      expect(podeAcessar('VETERINARIO', rota)).toBe(false);
      expect(podeAcessar('ATENDENTE', rota)).toBe(false);
    }
  });
});

describe('dividirRota', () => {
  it('separa a tela do parâmetro', () => {
    expect(dividirRota('clientes/abc123')).toEqual({ base: 'clientes', parametro: 'abc123' });
    expect(dividirRota('clientes')).toEqual({ base: 'clientes', parametro: undefined });
    expect(dividirRota('dev/componentes')).toEqual({ base: 'dev/componentes', parametro: undefined });
  });
});

describe('rotaDoHash', () => {
  it('converte hash em rota', () => {
    expect(rotaDoHash('#/clientes')).toBe('clientes');
    expect(rotaDoHash('#/dev/componentes')).toBe('dev/componentes');
    expect(rotaDoHash('')).toBe('inicio');
    expect(rotaDoHash('#/')).toBe('inicio');
  });
});
