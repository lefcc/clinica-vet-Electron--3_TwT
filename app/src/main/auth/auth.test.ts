// Testes para módulo de autenticação
import { describe, it, expect, vi } from 'vitest';

// Mock do better-sqlite3 antes de importar o módulo
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue({
        get: vi.fn(),
        run: vi.fn(),
        all: vi.fn(),
      }),
      pragma: vi.fn(),
      transaction: vi.fn((fn) => fn),
      close: vi.fn(),
    })),
  };
});

// Mock do electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/fake/path'),
  },
}));

describe('Auth Module', () => {
  it('deve carregar o módulo sem erros', async () => {
    const auth = await import('../auth/index.ts');
    expect(auth).toBeDefined();
    expect(typeof auth.autenticar).toBe('function');
    expect(typeof auth.logout).toBe('function');
    expect(typeof auth.getSessaoAtual).toBe('function');
    expect(typeof auth.isAutenticado).toBe('function');
    expect(typeof auth.hashSenha).toBe('function');
    expect(typeof auth.verificarSenha).toBe('function');
    expect(typeof auth.temPermissao).toBe('function');
  });
});