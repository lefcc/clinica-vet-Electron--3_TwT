// Exportações centralizadas do pacote shared
export * from './perfil';
<<<<<<< Updated upstream
export * from './comum';
export * from './clientes-animais';
export * from './estoque-fornecedores';
export * from './vacinas-orcamentos';
export * from './admin';

import { z } from 'zod';
import { AgendamentoSchema } from './clientes-animais';
import { AlertaEstoqueSchema } from './estoque-fornecedores';
import { VacinaFilaSchema } from './vacinas-orcamentos';

export const ResumoInicioSchema = z.object({
  agenda_hoje: z.array(AgendamentoSchema),
  alertas_estoque: z.array(AlertaEstoqueSchema),
  vacinas_proximas: z.array(VacinaFilaSchema),
  pendencias_sync: z.number().int().nonnegative()
});
export type ResumoInicio = z.infer<typeof ResumoInicioSchema>;
=======
export * from './agendamentos';
export * from './consultas';
// Schemas Zod, tipos e canais IPC serão adicionados conforme desenvolvimento
>>>>>>> Stashed changes
