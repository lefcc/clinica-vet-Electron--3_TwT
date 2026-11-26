export type Perfil = 'MASTER' | 'VETERINARIO' | 'ATENDENTE';

// quem está logado agora (fica só na memória do main)
export interface SessaoAtiva {
  usuarioId: string;
  colaboradorId: string;
  nome?: string;
  perfil: Perfil;
  expiraEm: number;
}
