import { describe, expect, it } from 'vitest';
import { HashSenha } from '../../modules/auth/hash-senha';
import type { NovoUsuario, RepositorioUsuarios } from '../../modules/auth/usuario.repository';
import { SeedUsuarioExemplo, USUARIO_EXEMPLO } from './seed-usuario-exemplo';

class RepositorioFalso implements RepositorioUsuarios {
  criados: NovoUsuario[] = [];
  constructor(private existentes = 0) {}
  buscarAtivoPorLogin() {
    return undefined;
  }
  registrarLogin() {}
  contar() {
    return this.existentes + this.criados.length;
  }
  criar(novo: NovoUsuario) {
    this.criados.push(novo);
  }
}

const hash = new HashSenha(4);

describe('SeedUsuarioExemplo', () => {
  it('cria o MASTER quando o banco está vazio, guardando só o hash da senha', async () => {
    const repo = new RepositorioFalso();
    const resultado = await new SeedUsuarioExemplo(repo, hash).executar(USUARIO_EXEMPLO);

    expect(resultado).toBe('criado');
    expect(repo.criados).toHaveLength(1);
    expect(repo.criados[0]?.perfil).toBe('MASTER');
    expect(repo.criados[0]?.senhaHash).not.toBe(USUARIO_EXEMPLO.senha);
    expect(await hash.comparar(USUARIO_EXEMPLO.senha, repo.criados[0]?.senhaHash ?? '')).toBe(true);
  });

  it('não cria de novo se já existe algum usuário', async () => {
    const repo = new RepositorioFalso(1);
    expect(await new SeedUsuarioExemplo(repo, hash).executar(USUARIO_EXEMPLO)).toBe('ja-existia');
    expect(repo.criados).toHaveLength(0);
  });

  it('sem dados (produção sem .env) não cria ninguém', async () => {
    const repo = new RepositorioFalso();
    expect(await new SeedUsuarioExemplo(repo, hash).executar(null)).toBe('sem-dados');
    expect(repo.criados).toHaveLength(0);
  });

  it('recusa senha curta', async () => {
    const repo = new RepositorioFalso();
    await expect(new SeedUsuarioExemplo(repo, hash).executar({ ...USUARIO_EXEMPLO, senha: '1234567' })).rejects.toThrow(/8 caracteres/);
  });

  it('escolherDados: o .env manda; sem .env só em desenvolvimento usa o exemplo', () => {
    expect(SeedUsuarioExemplo.escolherDados({ senha: 'outra-senha-forte', login: 'will' }, false)).toMatchObject({ login: 'will', senha: 'outra-senha-forte' });
    expect(SeedUsuarioExemplo.escolherDados({}, true)).toEqual(USUARIO_EXEMPLO);
    expect(SeedUsuarioExemplo.escolherDados({}, false)).toBeNull();
  });
});
