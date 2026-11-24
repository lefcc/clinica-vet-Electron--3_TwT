import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { ColaboradorAtualizarSchema, ColaboradorCriarSchema, EntradaListagem } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OperacaoOutbox, OutboxRepository } from '../admin/outbox.repository';
import { runInTransaction } from '../admin/transacao';
import type { AuditoriaService } from '../auditoria/auditoria.service';
import type { AutorAuditoria } from '../auditoria/auditoria.repository';
import type { HashSenha } from '../auth/hash-senha';
import type { ArmazemSessao } from '../auth/sessao-em-memoria';
import type { CadastroColaborador, ColaboradoresRepository } from './colaboradores.repository';

export class ColaboradoresService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: ColaboradoresRepository,
    private readonly hash: HashSenha,
    private readonly outbox: OutboxRepository,
    private readonly auditoria: AuditoriaService,
    private readonly sessoes: ArmazemSessao
  ) {}

  listar(entrada: EntradaListagem) {
    return this.repository.listar(entrada);
  }

  obter(id: string) {
    return this.exigirAtivo(id).colaborador;
  }

  async criar({ senha, ...dados }: z.output<typeof ColaboradorCriarSchema>, autor: AutorAuditoria, autorizar: () => void) {
    const hash = await this.hash.gerar(senha);
    autorizar();
    return runInTransaction(this.banco, () => {
      const id = randomUUID();
      const usuarioId = randomUUID();
      this.validar(dados, id);
      this.repository.criar(id, usuarioId, dados, hash);
      const criado = this.obter(id);
      this.enfileirar(id, usuarioId, 'inserir');
      this.auditoria.registrar(autor, {
        acao: 'CRIAR', entidade: 'colaboradores', registro_id: id, descricao: 'Cadastrou ' + criado.nome + '.', depois: criado
      });
      return criado;
    });
  }

  atualizar({ id, ...campos }: z.output<typeof ColaboradorAtualizarSchema>, autor: AutorAuditoria) {
    const { atualizado, invalidar } = runInTransaction(this.banco, () => {
      const { colaborador, usuarioId } = this.exigirAtivo(id);
      const dados = { ...colaborador, ...campos };
      this.validar(dados, id);
      const mudouPerfil = dados.perfil !== colaborador.perfil;
      if (mudouPerfil && colaborador.perfil === 'MASTER') this.protegerMaster();
      this.repository.atualizar(id, usuarioId, dados);
      const atualizado = this.obter(id);
      this.enfileirar(id, usuarioId, 'atualizar');
      this.auditoria.registrar(autor, {
        acao: 'ATUALIZAR', entidade: 'colaboradores', registro_id: id,
        descricao: 'Atualizou ' + atualizado.nome + '.', antes: colaborador, depois: atualizado
      });
      return { atualizado, invalidar: mudouPerfil || dados.login !== colaborador.login ? usuarioId : null };
    });
    if (invalidar) this.invalidarSessao(invalidar);
    return atualizado;
  }

  inativar(id: string, autor: AutorAuditoria): void {
    const usuarioId = runInTransaction(this.banco, () => {
      const { colaborador, usuarioId } = this.exigirAtivo(id);
      if (colaborador.perfil === 'MASTER') this.protegerMaster();
      this.repository.inativar(id, usuarioId);
      this.enfileirar(id, usuarioId, 'inativar');
      this.auditoria.registrar(autor, {
        acao: 'INATIVAR', entidade: 'colaboradores', registro_id: id,
        descricao: 'Inativou ' + colaborador.nome + '.', antes: colaborador, depois: { ...colaborador, ativo: false }
      });
      return usuarioId;
    });
    this.invalidarSessao(usuarioId);
  }

  async redefinirSenha(id: string, senha: string, autor: AutorAuditoria, autorizar: () => void): Promise<void> {
    const hash = await this.hash.gerar(senha);
    autorizar();
    const usuarioId = runInTransaction(this.banco, () => {
      const { colaborador, usuarioId } = this.exigirAtivo(id);
      this.repository.redefinirSenha(usuarioId, hash);
      this.outbox.enfileirar('usuarios', usuarioId, 'atualizar', this.repository.dadosUsuario(usuarioId));
      this.auditoria.registrar(autor, {
        acao: 'ATUALIZAR', entidade: 'colaboradores', registro_id: id, descricao: 'Redefiniu a senha de ' + colaborador.nome + '.'
      });
      return usuarioId;
    });
    this.invalidarSessao(usuarioId);
  }

  private exigirAtivo(id: string) {
    const registro = this.repository.obter(id);
    if (!registro?.colaborador.ativo) throw new ErroNegocio('COLABORADOR_NAO_ENCONTRADO', 'Colaborador ativo não encontrado.');
    return registro;
  }

  private validar(dados: CadastroColaborador, id: string): void {
    if (dados.perfil === 'VETERINARIO' && !dados.crmv) {
      throw new ErroNegocio('CRMV_OBRIGATORIO', 'Informe o CRMV do veterinário.');
    }
    if (this.repository.cpfOcupado(dados.cpf, id)) throw new ErroNegocio('CPF_DUPLICADO', 'Já existe um colaborador com este CPF.');
    if (this.repository.loginOcupado(dados.login, id)) throw new ErroNegocio('LOGIN_DUPLICADO', 'Já existe um usuário com este login.');
  }

  private protegerMaster(): void {
    if (this.repository.contarMasters() <= 1) {
      throw new ErroNegocio('ULTIMO_MASTER', 'A clínica precisa ter pelo menos um administrador ativo.');
    }
  }

  private enfileirar(id: string, usuarioId: string, operacao: OperacaoOutbox): void {
    this.outbox.enfileirar('colaboradores', id, operacao, this.repository.dadosColaborador(id));
    this.outbox.enfileirar('usuarios', usuarioId, operacao, this.repository.dadosUsuario(usuarioId));
  }

  private invalidarSessao(usuarioId: string): void {
    if (this.sessoes.obter()?.usuarioId === usuarioId) this.sessoes.definir(null);
  }
}
