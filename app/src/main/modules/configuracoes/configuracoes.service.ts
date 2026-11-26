import { ConfiguracoesSchema, type Configuracoes } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { runInTransaction } from '../admin/transacao';
import type { OutboxRepository } from '../admin/outbox.repository';
import type { AutorAuditoria } from '../auditoria/auditoria.repository';
import type { AuditoriaService } from '../auditoria/auditoria.service';
import type { ConfiguracoesRepository } from './configuracoes.repository';

const configPadrao: Configuracoes = {
  nome_clinica: 'Clínica Veterinária',
  template_lembrete: 'Olá, {tutor}! A vacina {vacina} de {animal} vence em {data}. Entre em contato com a clínica para agendar. Obrigado!',
  backup_horario: '20:00',
  backup_manter: 7
};

export class ConfiguracoesService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: ConfiguracoesRepository,
    private readonly outbox: OutboxRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  obter(): Configuracoes {
    return this.repository.obter() ?? { ...configPadrao };
  }

  atualizar(campos: Partial<Configuracoes>, autor: AutorAuditoria): Configuracoes {
    return runInTransaction(this.banco, () => {
      const persistido = this.repository.obter();
      const antes = persistido ?? configPadrao;
      const depois = ConfiguracoesSchema.parse({ ...antes, ...campos });
      const { id, linha } = this.repository.salvar(depois);
      this.outbox.enfileirar('configuracoes', id, persistido ? 'atualizar' : 'inserir', linha);
      this.auditoria.registrar(autor, {
        acao: 'ATUALIZAR', entidade: 'configuracoes', registro_id: id,
        descricao: 'Atualizou as configurações da clínica.', antes, depois
      });
      return depois;
    });
  }
}
