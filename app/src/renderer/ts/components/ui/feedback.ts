import { el } from '../../lib/dom.js';
import { criarIcone, type NomeIcone } from '../../lib/icones.js';
import { criarBotao } from './button.js';

// rodinha de "carregando..."
export function criarSpinner(texto = 'Carregando...'): HTMLElement {
  return el('div', 'spinner', [el('span', 'spinner__roda', [], { 'aria-hidden': 'true' }), el('span', 'spinner__texto', [texto])], {
    role: 'status',
  });
}

export interface OpcoesEstadoVazio {
  icone?: NomeIcone;
  titulo: string;
  descricao?: string;
  acao?: { texto: string; icone?: NomeIcone; onClick: () => void };
}

// mensagem pra quando não há nada pra mostrar
export function criarEstadoVazio(opcoes: OpcoesEstadoVazio): HTMLElement {
  const { icone = 'animais', titulo, descricao, acao } = opcoes;
  return el('div', 'vazio', [
    el('div', 'vazio__icone', [criarIcone(icone, 36)]),
    el('h3', 'vazio__titulo', [titulo]),
    descricao ? el('p', 'vazio__descricao', [descricao]) : null,
    acao ? criarBotao({ texto: acao.texto, icone: acao.icone, onClick: acao.onClick }) : null,
  ]);
}
