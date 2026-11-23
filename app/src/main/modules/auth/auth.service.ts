import { z } from 'zod';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { HashSenha } from './hash-senha';
import type { ArmazemSessao } from './sessao-em-memoria';
import type { Perfil } from './tipos';
import type { RepositorioUsuarios } from './usuario.repository';

// o que o front manda no login (valida antes de ir pro banco)
export const LoginEntradaSchema = z.object({
  login: z.string().trim().min(1).max(60),
  senha: z.string().min(1).max(200),
});

// o que volta pro front (nunca tem senha_hash)
export interface SessaoDto {
  usuarioId: string;
  nome: string;
  perfil: Perfil;
  expiraEm: number;
}

export class AuthService {
  // hash de mentira, só pra gastar o mesmo tempo quando o login não existe
  // (senão dava pra descobrir quais logins existem pela demora da resposta)
  private readonly hashFalso: Promise<string>;

  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly sessoes: ArmazemSessao,
    private readonly hash: HashSenha,
    private readonly duracaoSessaoMs: number,
  ) {
    this.hashFalso = hash.gerar('senha-que-nao-existe');
  }

  async login(entrada: unknown): Promise<SessaoDto> {
    const dados = LoginEntradaSchema.safeParse(entrada);
    if (!dados.success) throw new ErroNegocio('DADOS_INVALIDOS', 'Informe o usuário e a senha.');

    const usuario = this.usuarios.buscarAtivoPorLogin(dados.data.login);
    const hashParaConferir = usuario ? usuario.senhaHash : await this.hashFalso;
    const senhaConfere = await this.hash.comparar(dados.data.senha, hashParaConferir);

    // mesma mensagem pros dois casos: não conta se errou o usuário ou a senha
    if (!usuario || !senhaConfere) throw new ErroNegocio('CREDENCIAIS_INVALIDAS', 'Usuário ou senha inválidos.');

    const sessao: SessaoDto = { usuarioId: usuario.id, nome: usuario.nome, perfil: usuario.perfil, expiraEm: Date.now() + this.duracaoSessaoMs };
    this.sessoes.definir(sessao);
    this.usuarios.registrarLogin(usuario.id);
    return sessao;
  }

  // usado quando o front recarrega: quem está logado agora?
  sessaoAtual(): SessaoDto {
    const sessao = this.sessoes.obter();
    if (!sessao) throw new ErroNegocio('NAO_AUTENTICADO', 'Faça login para continuar.');
    if (Date.now() > sessao.expiraEm) {
      this.sessoes.definir(null);
      throw new ErroNegocio('SESSAO_EXPIRADA', 'Sua sessão expirou. Entre novamente.');
    }
    return { usuarioId: sessao.usuarioId, nome: sessao.nome ?? '', perfil: sessao.perfil, expiraEm: sessao.expiraEm };
  }

  sair(): void {
    this.sessoes.definir(null);
  }
}
