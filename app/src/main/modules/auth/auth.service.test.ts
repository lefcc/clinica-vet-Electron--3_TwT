import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNegocio } from '../../erros/erro-negocio';
import { AuthService } from './auth.service';
import { HashSenha } from './hash-senha';
import { SessaoEmMemoria } from './sessao-em-memoria';
import type { RepositorioUsuarios, UsuarioComColaborador } from './usuario.repository';

// repositório de mentira, só na memória
class RepositorioFalso implements RepositorioUsuarios {
  usuarios: UsuarioComColaborador[] = [];
  loginsRegistrados: string[] = [];

  buscarAtivoPorLogin(login: string) {
    return this.usuarios.find((u) => u.login === login);
  }
  registrarLogin(usuarioId: string) {
    this.loginsRegistrados.push(usuarioId);
  }
  contar() {
    return this.usuarios.length;
  }
  criar() {
    throw new Error('não usado nesses testes');
  }
}

const hash = new HashSenha(4); // custo baixo só pra o teste ser rápido

describe('AuthService', () => {
  let repo: RepositorioFalso;
  let sessoes: SessaoEmMemoria;
  let service: AuthService;

  beforeEach(async () => {
    repo = new RepositorioFalso();
    sessoes = new SessaoEmMemoria();
    repo.usuarios.push({ id: 'u1', colaboradorId: 'c1', login: 'ana', senhaHash: await hash.gerar('senha-correta-1'), perfil: 'VETERINARIO', nome: 'Ana Souza' });
    service = new AuthService(repo, sessoes, hash, 60_000);
  });

  it('entra com usuário e senha certos e guarda a sessão', async () => {
    const sessao = await service.login({ login: 'ana', senha: 'senha-correta-1' });
    expect(sessao).toMatchObject({ usuarioId: 'u1', nome: 'Ana Souza', perfil: 'VETERINARIO' });
    expect(sessoes.obter()?.usuarioId).toBe('u1');
    expect(repo.loginsRegistrados).toEqual(['u1']);
  });

  it('nunca devolve o hash da senha', async () => {
    const sessao = await service.login({ login: 'ana', senha: 'senha-correta-1' });
    expect(JSON.stringify(sessao)).not.toContain('senha');
    expect(JSON.stringify(sessao)).not.toContain('$2');
  });

  it('senha errada e usuário que não existe dão exatamente a mesma resposta', async () => {
    const erroSenha = await service.login({ login: 'ana', senha: 'errada' }).catch((e) => e);
    const erroUsuario = await service.login({ login: 'ninguem', senha: 'qualquer' }).catch((e) => e);
    for (const erro of [erroSenha, erroUsuario]) {
      expect(erro).toBeInstanceOf(ErroNegocio);
      expect(erro.codigo).toBe('CREDENCIAIS_INVALIDAS');
      expect(erro.message).toBe('Usuário ou senha inválidos.');
    }
    expect(sessoes.obter()).toBeNull();
  });

  it('recusa entrada vazia ou malformada antes de ir pro banco', async () => {
    for (const entrada of [{}, { login: '', senha: 'x' }, { login: 'ana', senha: '' }, null, 'texto']) {
      const erro = await service.login(entrada).catch((e) => e);
      expect(erro.codigo).toBe('DADOS_INVALIDOS');
    }
  });

  it('sessaoAtual: sem login, vencida e depois do login', async () => {
    expect(() => service.sessaoAtual()).toThrowError(/login/i);

    await service.login({ login: 'ana', senha: 'senha-correta-1' });
    expect(service.sessaoAtual().nome).toBe('Ana Souza');

    sessoes.definir({ usuarioId: 'u1', perfil: 'VETERINARIO', expiraEm: Date.now() - 1 });
    expect(() => service.sessaoAtual()).toThrowError(/expirou/);
    expect(sessoes.obter()).toBeNull();
  });

  it('sair apaga a sessão', async () => {
    await service.login({ login: 'ana', senha: 'senha-correta-1' });
    service.sair();
    expect(sessoes.obter()).toBeNull();
  });
});
