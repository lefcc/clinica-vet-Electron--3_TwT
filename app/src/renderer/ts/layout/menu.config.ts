import type { NomeIcone } from '../lib/icones.js';
import type { Perfil } from '../lib/tipos.js';

export type { Perfil };

export type GrupoMenu = 'Atendimento' | 'Cadastros' | 'Estoque e financeiro' | 'Sistema';

export interface ItemMenu {
  /** parte do endereço depois do "#/" (ex.: "clientes") */
  rota: string;
  titulo: string;
  icone: NomeIcone;
  grupo: GrupoMenu;
  perfis: readonly Perfil[];
  /** false = existe mas não aparece no menu (ex.: catálogo de dev) */
  noMenu: boolean;
}

const TODOS: readonly Perfil[] = ['MASTER', 'VETERINARIO', 'ATENDENTE'];

// permissões conforme o CONTEXTO.md (seção 6)
export const ITENS_MENU: readonly ItemMenu[] = [
  { rota: 'inicio', titulo: 'Início', icone: 'inicio', grupo: 'Atendimento', perfis: TODOS, noMenu: true },
  { rota: 'agenda', titulo: 'Agenda', icone: 'agenda', grupo: 'Atendimento', perfis: TODOS, noMenu: true },
  { rota: 'consultas', titulo: 'Consultas', icone: 'consultas', grupo: 'Atendimento', perfis: TODOS, noMenu: true },
  { rota: 'vacinas', titulo: 'Vacinas', icone: 'vacinas', grupo: 'Atendimento', perfis: TODOS, noMenu: true },
  { rota: 'clientes', titulo: 'Clientes', icone: 'clientes', grupo: 'Cadastros', perfis: TODOS, noMenu: true },
  { rota: 'animais', titulo: 'Animais', icone: 'animais', grupo: 'Cadastros', perfis: TODOS, noMenu: true },
  { rota: 'fornecedores', titulo: 'Fornecedores', icone: 'fornecedores', grupo: 'Cadastros', perfis: ['MASTER'], noMenu: true },
  { rota: 'colaboradores', titulo: 'Colaboradores', icone: 'colaboradores', grupo: 'Cadastros', perfis: ['MASTER'], noMenu: true },
  { rota: 'medicamentos', titulo: 'Medicamentos', icone: 'medicamentos', grupo: 'Estoque e financeiro', perfis: TODOS, noMenu: true },
  { rota: 'estoque', titulo: 'Estoque', icone: 'estoque', grupo: 'Estoque e financeiro', perfis: TODOS, noMenu: true },
  { rota: 'orcamentos', titulo: 'Orçamentos', icone: 'orcamentos', grupo: 'Estoque e financeiro', perfis: ['MASTER', 'ATENDENTE'], noMenu: true },
  { rota: 'relatorios', titulo: 'Relatórios', icone: 'relatorios', grupo: 'Estoque e financeiro', perfis: ['MASTER'], noMenu: true },
  { rota: 'conflitos', titulo: 'Conflitos de sincronização', icone: 'conflitos', grupo: 'Sistema', perfis: ['MASTER'], noMenu: true },
  { rota: 'auditoria', titulo: 'Auditoria', icone: 'auditoria', grupo: 'Sistema', perfis: ['MASTER'], noMenu: true },
  { rota: 'configuracoes', titulo: 'Configurações e backup', icone: 'configuracoes', grupo: 'Sistema', perfis: ['MASTER'], noMenu: true },
  { rota: 'dev/componentes', titulo: 'Componentes (dev)', icone: 'info', grupo: 'Sistema', perfis: TODOS, noMenu: false },
];

export const GRUPOS_MENU: readonly GrupoMenu[] = ['Atendimento', 'Cadastros', 'Estoque e financeiro', 'Sistema'];

// acha a tela pela rota
export function encontrarItem(rota: string): ItemMenu | undefined {
  return ITENS_MENU.find((item) => item.rota === rota);
}

// o perfil pode abrir essa tela?
export function podeAcessar(perfil: Perfil, rota: string): boolean {
  const item = encontrarItem(rota);
  return item ? item.perfis.includes(perfil) : false;
}

/** telas do side bar pra esse perfil */
export function itensDoMenu(perfil: Perfil): ItemMenu[] {
  return ITENS_MENU.filter((item) => item.noMenu && item.perfis.includes(perfil));
}
