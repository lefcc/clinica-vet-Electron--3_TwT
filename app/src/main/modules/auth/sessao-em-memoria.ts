import type { SessaoAtiva } from './tipos';

// onde a sessão fica guardada. o app só tem um usuário logado por vez
export interface ArmazemSessao {
  definir(sessao: SessaoAtiva | null): void;
  obter(): SessaoAtiva | null;
}

export class SessaoEmMemoria implements ArmazemSessao {
  private atual: SessaoAtiva | null = null;

  definir(sessao: SessaoAtiva | null): void {
    this.atual = sessao;
  }

  // não apaga a sessão vencida de propósito: o registry precisa saber que ela venceu
  // pra responder "sessão expirada" em vez de "não autenticado"
  obter(): SessaoAtiva | null {
    return this.atual;
  }
}
