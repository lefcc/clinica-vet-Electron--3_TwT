import type { z } from 'zod';
import type { AuditoriaListarSchema } from '@clinica-vet/shared';
import type { OutboxRepository } from '../admin/outbox.repository';
import { diaSaoPaulo } from '../admin/transacao';
import type { AuditoriaRepository, AutorAuditoria, EventoAuditoria } from './auditoria.repository';

export class AuditoriaService {
  constructor(private readonly repository: AuditoriaRepository, private readonly outbox: OutboxRepository) {}

  /** Chamado dentro da mesma transação da operação auditada. */
  registrar(autor: AutorAuditoria, evento: EventoAuditoria): void {
    const linha = this.repository.registrar(autor, evento);
    this.outbox.enfileirar('auditoria', linha.id, 'inserir', linha);
  }

  listar(filtros: z.output<typeof AuditoriaListarSchema>, agora = new Date()) {
    const periodos = { '7D': 7, '30D': 30 };
    const segundos = Math.floor(agora.getTime() / 1000);
    const desde = filtros.periodo === 'HOJE'
      ? Math.floor(Date.parse(diaSaoPaulo(agora) + 'T00:00:00-03:00') / 1000)
      : filtros.periodo ? segundos - periodos[filtros.periodo] * 86400 : undefined;
    return this.repository.listar({ ...filtros, desde });
  }
}
