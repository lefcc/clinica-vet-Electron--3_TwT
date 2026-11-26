import type { AlertaEstoque, Perfil, ResumoInicio, VacinaFila } from '@clinica-vet/shared';
import { diaSaoPaulo } from '../admin/transacao';
import type { RelatoriosRepository } from './relatorios.repository';

export interface FontesDoPainel {
  alertas(): AlertaEstoque[];
  vacinas(): VacinaFila[];
  pendencias(): number;
}

export class DashboardService {
  constructor(
    private readonly repository: RelatoriosRepository,
    private readonly fontes: FontesDoPainel,
    private readonly agora: () => Date = () => new Date()
  ) {}

  // esta função monta o painel inicial
  resumo(perfil: Perfil, usuarioId: string): ResumoInicio {
    const inicio = Math.floor(Date.parse(`${diaSaoPaulo(this.agora())}T00:00:00-03:00`) / 1000);
    return {
      agenda_hoje: this.repository.agenda(inicio, inicio + 86400, perfil === 'VETERINARIO' ? usuarioId : undefined),
      alertas_estoque: this.fontes.alertas(),
      vacinas_proximas: this.fontes.vacinas(),
      pendencias_sync: perfil === 'MASTER' ? this.fontes.pendencias() : 0
    };
  }
}
