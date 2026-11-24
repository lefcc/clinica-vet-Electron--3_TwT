import type { BackupArquivo } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import { diaSaoPaulo, runInTransaction } from '../admin/transacao';
import type { AutorAuditoria } from '../auditoria/auditoria.repository';
import type { AuditoriaService } from '../auditoria/auditoria.service';
import type { ArmazemSessao } from '../auth/sessao-em-memoria';
import type { ConfiguracoesService } from '../configuracoes/configuracoes.service';
import type { BackupRepository } from './backup.repository';

const horaSaoPaulo = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export class BackupService {
  private emAndamento = false;

  constructor(
    private readonly banco: BancoSql,
    private readonly repository: BackupRepository,
    private readonly configuracoes: ConfiguracoesService,
    private readonly auditoria: AuditoriaService,
    private readonly sessoes: ArmazemSessao
  ) {}

  listar(): BackupArquivo[] {
    return this.repository.listar();
  }

  async criar(autor: AutorAuditoria, tipo: BackupArquivo['tipo'] = 'MANUAL'): Promise<BackupArquivo> {
    return this.exclusivo(async () => {
      const backup = await this.repository.criar(tipo);
      try {
        runInTransaction(this.banco, () => this.auditoria.registrar(autor, {
          acao: 'BACKUP', entidade: 'backup', registro_id: backup.id,
          descricao: tipo === 'MANUAL' ? 'Criou um backup manual.' : 'Criou um backup automático.'
        }));
      } catch (erro) {
        this.repository.remover(backup);
        throw erro;
      }
      this.aplicarRetencao();
      return backup;
    });
  }

  async restaurar(id: string, autor: AutorAuditoria, autorizar: () => void): Promise<void> {
    await this.exclusivo(async () => {
      autorizar();
      if (!this.listar().some((arquivo) => arquivo.id === id)) {
        throw new ErroNegocio('BACKUP_NAO_ENCONTRADO', 'O backup selecionado não está disponível.');
      }
      const copiaDeSeguranca = await this.repository.criar('MANUAL');
      autorizar();
      this.repository.restaurar(id, () => {
        runInTransaction(this.banco, () => this.auditoria.registrar(autor, {
          acao: 'RESTAURAR', entidade: 'backup', registro_id: id,
          descricao: 'Restaurou um backup do banco local.', depois: { copia_seguranca_id: copiaDeSeguranca.id }
        }));
      });
      this.sessoes.definir(null);
    });
  }

  async executarAgendado(agora = new Date()): Promise<void> {
    if (this.emAndamento || horaSaoPaulo.format(agora) < this.configuracoes.obter().backup_horario) return;
    const dia = diaSaoPaulo(agora);
    if (this.listar().some((b) => b.tipo === 'AUTOMATICO' && diaSaoPaulo(new Date(b.criado_em)) === dia)) return;
    await this.criar({ usuarioId: null, nome: 'Sistema', perfil: 'MASTER' }, 'AUTOMATICO');
  }

  private aplicarRetencao(): void {
    const { backup_manter } = this.configuracoes.obter();
    for (const arquivo of this.listar().slice(backup_manter)) {
      try {
        this.repository.remover(arquivo);
      } catch {
        console.warn('Não foi possível remover um backup antigo.');
      }
    }
  }

  private async exclusivo<T>(executar: () => Promise<T>): Promise<T> {
    if (this.emAndamento) throw new ErroNegocio('BACKUP_EM_ANDAMENTO', 'Aguarde a operação de backup em andamento.');
    this.emAndamento = true;
    try {
      return await executar();
    } finally {
      this.emAndamento = false;
    }
  }
}
