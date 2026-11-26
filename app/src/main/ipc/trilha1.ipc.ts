import * as path from 'node:path';
import { canaisTrilha1, type Perfil } from '@clinica-vet/shared';
import type { z } from 'zod';
import type { ConexaoLocal } from '../db/local/conexao-local';
import { ErroNegocio } from '../erros/erro-negocio';
import { OutboxRepository } from '../modules/admin/outbox.repository';
import { AuditoriaRepository } from '../modules/auditoria/auditoria.repository';
import { AuditoriaService } from '../modules/auditoria/auditoria.service';
import type { HashSenha } from '../modules/auth/hash-senha';
import { BackupRepository } from '../modules/backup/backup.repository';
import { BackupService } from '../modules/backup/backup.service';
import { ColaboradoresRepository } from '../modules/colaboradores/colaboradores.repository';
import { ColaboradoresService } from '../modules/colaboradores/colaboradores.service';
import { ConfiguracoesRepository } from '../modules/configuracoes/configuracoes.repository';
import { ConfiguracoesService } from '../modules/configuracoes/configuracoes.service';
import { SyncConflitosRepository } from '../modules/sync-conflitos/sync-conflitos.repository';
import { SyncConflitosService } from '../modules/sync-conflitos/sync-conflitos.service';
import { registrarHandler, sessoes, type Sessao } from './registry';

type Canal = keyof typeof canaisTrilha1;
type Entrada<C extends Canal> = z.output<(typeof canaisTrilha1)[C]['entrada']>;
type Saida<C extends Canal> = z.input<(typeof canaisTrilha1)[C]['saida']>;
const master: Perfil[] = ['MASTER'];
const todos: Perfil[] = ['MASTER', 'VETERINARIO', 'ATENDENTE'];

function exigirSessaoAtual(sessao: Sessao): void {
  if (sessoes.obter() !== sessao || Date.now() >= sessao.expiraEm) {
    throw new ErroNegocio('NAO_AUTENTICADO', 'Entre novamente para concluir a operação.');
  }
}

function registrar<C extends Canal>(
  canal: C,
  perfis: Perfil[],
  executar: (dados: Entrada<C>, sessao: Sessao) => Saida<C> | Promise<Saida<C>>
): void {
  const contrato = canaisTrilha1[canal];
  const entrada: z.ZodType<Entrada<C>, z.ZodTypeDef, unknown> =
    contrato.entrada as z.ZodType<Entrada<C>, z.ZodTypeDef, unknown>;
  registrarHandler(canal, perfis, async (_evento, dados: unknown, sessao) => {
    const validado = entrada.safeParse(dados);
    if (!validado.success) throw new ErroNegocio('DADOS_INVALIDOS', 'Confira os dados enviados e tente novamente.');
    return contrato.saida.parse(await executar(validado.data, sessao));
  });
}

export function criarTrilha1(conexao: ConexaoLocal, hash: HashSenha) {
  const outbox = new OutboxRepository(conexao);
  const auditoria = new AuditoriaService(new AuditoriaRepository(conexao), outbox);
  const dadosColaboradores = new ColaboradoresRepository(conexao);
  const colaboradores = new ColaboradoresService(conexao, dadosColaboradores, hash, outbox, auditoria, sessoes);
  const configuracoes = new ConfiguracoesService(conexao, new ConfiguracoesRepository(conexao), outbox, auditoria);
  const backup = new BackupService(
    conexao, new BackupRepository(conexao, path.join(path.dirname(conexao.caminhoArquivo), 'backups')),
    configuracoes, auditoria, sessoes
  );
  const conflitos = new SyncConflitosService(
    conexao, new SyncConflitosRepository(conexao), outbox, auditoria, dadosColaboradores, sessoes
  );
  return { colaboradores, auditoria, configuracoes, backup, conflitos };
}

export function registrarTrilha1(
  services: ReturnType<typeof criarTrilha1>, emSincronizacao: () => boolean = () => false
): void {
  const { colaboradores, auditoria, configuracoes, backup, conflitos } = services;
  const exigirFilaDisponivel = () => {
    if (emSincronizacao()) {
      throw new ErroNegocio('SYNC_EM_ANDAMENTO', 'Aguarde a sincronização atual terminar e tente novamente.');
    }
  };
  registrar('colaboradores:listar', master, (dados) => colaboradores.listar(dados));
  registrar('colaboradores:obter', master, ({ id }) => colaboradores.obter(id));
  registrar('colaboradores:criar', master, (dados, sessao) => colaboradores.criar(dados, sessao, () => exigirSessaoAtual(sessao)));
  registrar('colaboradores:atualizar', master, (dados, sessao) => colaboradores.atualizar(dados, sessao));
  registrar('colaboradores:inativar', master, ({ id }, sessao) => {
    colaboradores.inativar(id, sessao);
    return {};
  });
  registrar('colaboradores:redefinir_senha', master, async ({ id, nova_senha }, sessao) => {
    await colaboradores.redefinirSenha(id, nova_senha, sessao, () => exigirSessaoAtual(sessao));
    return {};
  });

  registrar('auditoria:listar', master, (dados) => auditoria.listar(dados));
  registrar('configuracoes:obter', todos, (_dados, sessao) => {
    const dados = configuracoes.obter();
    return sessao.perfil === 'MASTER' ? dados : { template_lembrete: dados.template_lembrete };
  });
  registrar('configuracoes:atualizar', master, (dados, sessao) => configuracoes.atualizar(dados, sessao));

  registrar('backup:listar', master, () => backup.listar());
  registrar('backup:criar', master, (_dados, sessao) => backup.criar(sessao));
  registrar('backup:restaurar', master, async ({ id }, sessao) => {
    await backup.restaurar(id, sessao, () => {
      exigirSessaoAtual(sessao);
      exigirFilaDisponivel();
    });
    return {};
  });

  registrar('sync_conflitos:listar', master, () => conflitos.listar());
  registrar('sync_conflitos:resolver', master, ({ id, escolha }, sessao) => {
    exigirFilaDisponivel();
    conflitos.resolver(id, escolha, sessao);
    return {};
  });
}
