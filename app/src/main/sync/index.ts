import { obterConexaoLocal } from '../db/local/client';
import { runInTransaction } from '../db/central/client';
import { config } from '../config/env';
import { CentralSyncRepository } from './central.repository';
import { MotorSync } from './motor';
import type { MudancaCentral, SyncStatus } from './tipos';

export type { SyncStatus } from './tipos';

let motor: MotorSync | undefined;
let aoAplicar: ((mudanca: MudancaCentral) => void) | undefined;

export function aoReceberMudanca(callback: (mudanca: MudancaCentral) => void): void {
  aoAplicar = callback;
}

function obterMotor(): MotorSync {
  motor ??= new MotorSync(
    obterConexaoLocal(),
    new CentralSyncRepository(runInTransaction),
    config.sync.batchSize,
    (mudanca) => aoAplicar?.(mudanca)
  );
  return motor;
}

export function getSyncStatus(): SyncStatus {
  return obterMotor().obterStatus();
}

export async function contarPendentes(): Promise<number> {
  return obterMotor().contarPendentes();
}

export function executarPush() {
  return obterMotor().executarPush();
}

export function executarPull() {
  return obterMotor().executarPull();
}

export function executarCicloSync() {
  return obterMotor().executarCiclo();
}
