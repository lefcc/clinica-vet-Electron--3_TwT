import { el } from '../../lib/dom.js';
import { criarIcone, type NomeIcone } from '../../lib/icones.js';
import { criarBotao } from './button.js';

export type Tom = 'neutro' | 'sucesso' | 'aviso' | 'erro' | 'info';

// badge colorido; o "tom" escolhe a cor
export function criarBadge(texto: string, tom: Tom = 'neutro'): HTMLElement {
  return el('span', `badge badge--${tom}`, [texto]);
}

export interface OpcoesEstatistica {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone: NomeIcone;
  tom?: Tom;
  /** se tiver, o card vira link pra essa tela */
  rota?: string;
}

/** card de número grande (painel inicial) */
export function criarEstatistica(opcoes: OpcoesEstatistica): HTMLElement {
  const { rotulo, valor, detalhe, icone, tom = 'neutro', rota } = opcoes;
  const conteudo = [
    el('span', `estatistica__icone estatistica__icone--${tom}`, [criarIcone(icone, 22)]),
    el('div', 'estatistica__texto', [el('span', 'estatistica__valor', [valor]), el('span', 'estatistica__rotulo', [rotulo]), detalhe ? el('span', 'estatistica__detalhe', [detalhe]) : null]),
  ];
  return rota ? el('a', 'estatistica', conteudo, { href: `#/${rota}` }) : el('div', 'estatistica', conteudo);
}

export interface OpcoesCartao {
  titulo: string;
  subtitulo?: string;
  filhos: (Node | string)[];
  acao?: { texto: string; icone?: NomeIcone; onClick: () => void };
}

/** bloco branco com título, pra separar partes da tela */
export function criarCartao(opcoes: OpcoesCartao): HTMLElement {
  const { titulo, subtitulo, filhos, acao } = opcoes;
  return el('section', 'cartao', [
    el('header', 'cartao__cabecalho', [
      el('div', '', [el('h2', 'cartao__titulo', [titulo]), subtitulo ? el('p', 'cartao__subtitulo', [subtitulo]) : null]),
      acao ? criarBotao({ texto: acao.texto, icone: acao.icone, variante: 'secundario', onClick: acao.onClick }) : null,
    ]),
    el('div', 'cartao__corpo', filhos),
  ]);
}

export interface OpcoesCabecalho {
  titulo: string;
  subtitulo?: string;
  acoes?: HTMLElement[];
}

/** título da tela, com botões de ação à direita */
export function criarCabecalhoPagina(opcoes: OpcoesCabecalho): HTMLElement {
  const { titulo, subtitulo, acoes = [] } = opcoes;
  return el('header', 'pagina__cabecalho', [
    el('div', '', [el('h1', 'pagina__titulo', [titulo]), subtitulo ? el('p', 'pagina__subtitulo', [subtitulo]) : null]),
    acoes.length ? el('div', 'pagina__acoes', acoes) : null,
  ]);
}
