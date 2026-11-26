import { EstadoSyncSchema, PerfilSchema, SemEntradaSchema, type EstadoSync } from '@clinica-vet/shared';
import { ErroNegocio } from '../erros/erro-negocio';
import type { OutboxRepository } from '../modules/admin/outbox.repository';
import type { SyncStatus } from '../sync';
import { registrarHandler } from './registry';

export function registrarEstadoSync(outbox: OutboxRepository, obterStatus: () => SyncStatus): void {
  registrarHandler('sync:estado', PerfilSchema.options, async (_evento, entrada: unknown) => {
    if (!SemEntradaSchema.safeParse(entrada).success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'A consulta de sincronização não recebe parâmetros.');
    }
    const status = obterStatus();
    const pendentes = outbox.contarPendencias();
    let estado: EstadoSync['estado'] = 'local';
    if (status.emAndamento) estado = 'sincronizando';
    else if (status.erro) estado = 'erro';
    else if (!pendentes && status.ultimaSync !== null) estado = 'sincronizado';
    return EstadoSyncSchema.parse({
      estado,
      pendentes,
      ...(status.ultimaSync !== null && { ultimo_sync_em: new Date(status.ultimaSync).toISOString() })
    });
  });
}
