import { LoginEntradaSchema, SessaoSchema, type Sessao as SessaoDto } from '@clinica-vet/shared';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { HashSenha } from './hash-senha';
import type { ArmazemSessao } from './sessao-em-memoria';
import type { RepositorioUsuarios } from './usuario.repository';

export { LoginEntradaSchema };
export type { SessaoDto };

interface AuditoriaAuth {
  executar(acao: 'LOGIN' | 'LOGOUT', sessao: SessaoDto, efetivar: () => void): void;
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
    private readonly auditoria?: AuditoriaAuth,
  ) {
    this.hashFalso = hash.gerar('senha-que-nao-existe');
  }

  async login(entrada: unknown): Promise<SessaoDto> {
    const dados = LoginEntradaSchema.safeParse(entrada);
    if (!dados.success || Buffer.byteLength(dados.data.senha, 'utf8') > 72) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Usuário ou senha inválidos.');
    }

    const usuario = this.usuarios.buscarAtivoPorLogin(dados.data.login);
    const hashParaConferir = usuario ? usuario.senhaHash : await this.hashFalso;
    const senhaConfere = await this.hash.comparar(dados.data.senha, hashParaConferir);

    // mesma mensagem pros dois casos: não conta se errou o usuário ou a senha
    if (!usuario || !senhaConfere) throw new ErroNegocio('CREDENCIAIS_INVALIDAS', 'Usuário ou senha inválidos.');

    // A senha e o perfil podem ter mudado durante o bcrypt assíncrono.
    const atual = this.usuarios.buscarAtivoPorLogin(dados.data.login);
    if (!atual || atual.id !== usuario.id || atual.senhaHash !== usuario.senhaHash) {
      throw new ErroNegocio('CREDENCIAIS_INVALIDAS', 'Usuário ou senha inválidos.');
    }
    const sessao = SessaoSchema.parse({
      usuarioId: atual.id,
      ...(atual.colaboradorId ? { colaboradorId: atual.colaboradorId } : {}),
      nome: atual.nome,
      perfil: atual.perfil,
      expiraEm: Date.now() + this.duracaoSessaoMs,
    });
    const registrarLogin = () => this.usuarios.registrarLogin(atual.id);
    if (this.auditoria) this.auditoria.executar('LOGIN', sessao, registrarLogin);
    else registrarLogin();
    this.sessoes.definir(sessao);
    return sessao;
  }

  // usado quando o front recarrega: quem está logado agora?
  sessaoAtual(): SessaoDto {
    const sessao = this.sessoes.obter();
    if (!sessao) throw new ErroNegocio('NAO_AUTENTICADO', 'Faça login para continuar.');
    if (Date.now() >= sessao.expiraEm) {
      this.sessoes.definir(null);
      throw new ErroNegocio('SESSAO_EXPIRADA', 'Sua sessão expirou. Entre novamente.');
    }
    return SessaoSchema.parse({
      usuarioId: sessao.usuarioId,
      ...(sessao.colaboradorId ? { colaboradorId: sessao.colaboradorId } : {}),
      nome: sessao.nome,
      perfil: sessao.perfil,
      expiraEm: sessao.expiraEm,
    });
  }

  sair(): void {
    const atual = this.sessoes.obter();
    this.sessoes.definir(null);
    if (this.auditoria && atual && atual.expiraEm > Date.now()) {
      this.auditoria.executar('LOGOUT', { ...atual, nome: atual.nome ?? 'Usuário' }, () => {});
    }
  }
}
