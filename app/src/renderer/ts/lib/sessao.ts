import type { Perfil, Sessao } from './tipos.js';

// quem está logado, só pra montar a tela (não é segurança)
let atual: Sessao | null = null;

export function definirSessao(sessao: Sessao | null): void {
  atual = sessao;
}

export function obterSessao(): Sessao | null {
  return atual;
}

export function perfilAtual(): Perfil | null {
  return atual?.perfil ?? null;
}

// o usuário logado tem um desses perfis?
export function temPerfil(...perfis: Perfil[]): boolean {
  return atual !== null && perfis.includes(atual.perfil);
}
