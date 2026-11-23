import type { HashSenha } from '../../modules/auth/hash-senha';
import type { RepositorioUsuarios } from '../../modules/auth/usuario.repository';

export interface DadosUsuarioExemplo {
  login: string;
  senha: string;
  nome: string;
  cpf: string;
}

// usuário de exemplo pra conseguir logar enquanto a tela de colaboradores não existe.
// só é criado quando o banco ainda não tem nenhum usuário. troque essa senha antes de usar de verdade!
export const USUARIO_EXEMPLO: DadosUsuarioExemplo = {
  login: 'master',
  senha: 'clinica@2026',
  nome: 'Administrador (exemplo)',
  cpf: '52998224725',
};

export type ResultadoSeed = 'criado' | 'ja-existia' | 'sem-dados';

// o que o .env pode mudar (todos opcionais)
export interface DadosDoAmbiente {
  login?: string;
  senha?: string;
  nome?: string;
  cpf?: string;
}

// chamado quando o app abre, antes da tela de login: garante que existe alguém pra logar
export class SeedUsuarioExemplo {
  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly hash: HashSenha,
  ) {}

  async executar(dados: DadosUsuarioExemplo | null): Promise<ResultadoSeed> {
    if (this.usuarios.contar() > 0) return 'ja-existia';
    if (!dados) return 'sem-dados';
    if (dados.senha.length < 8) throw new Error('A senha do usuário de exemplo precisa ter pelo menos 8 caracteres.');

    const senhaHash = await this.hash.gerar(dados.senha);
    this.usuarios.criar({ nome: dados.nome, cpf: dados.cpf, cargo: 'Administrador', login: dados.login, senhaHash, perfil: 'MASTER' });
    return 'criado';
  }

  // o .env manda; sem .env, em desenvolvimento usa o exemplo; app instalado (produção) não cria ninguém
  static escolherDados(ambiente: DadosDoAmbiente, emDesenvolvimento: boolean): DadosUsuarioExemplo | null {
    if (ambiente.senha) {
      return {
        login: ambiente.login ?? USUARIO_EXEMPLO.login,
        senha: ambiente.senha,
        nome: ambiente.nome ?? USUARIO_EXEMPLO.nome,
        cpf: ambiente.cpf ?? USUARIO_EXEMPLO.cpf,
      };
    }
    return emDesenvolvimento ? USUARIO_EXEMPLO : null;
  }
}
