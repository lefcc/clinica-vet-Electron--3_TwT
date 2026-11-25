import type { ItemOutbox } from '../modules/admin/outbox.repository';

export type Valor = string | number | null;
export type DadosRegistro = Record<string, Valor>;

export interface MudancaCentral {
  versao: number;
  tabela: string;
  registro_id: string;
  dados: DadosRegistro;
}

export type ResultadoEnvio =
  { ok: true; mudanca: MudancaCentral } | { ok: false; tipo: string; versao: number; dados: DadosRegistro };

export interface CentralSync {
  preparar(): Promise<void>;
  enviar(item: ItemOutbox, operacaoId: string, versao: number): Promise<ResultadoEnvio>;
  puxar(cursor: number, limite: number): Promise<MudancaCentral[]>;
}

export interface SyncStatus {
  pendentes: number;
  ultimaSync: number | null;
  emAndamento: boolean;
  erro: string | null;
}
