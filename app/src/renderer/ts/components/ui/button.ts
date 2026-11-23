import { el } from '../../lib/dom.js';
import { criarIcone, type NomeIcone } from '../../lib/icones.js';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export interface OpcoesBotao {
  texto: string;
  icone?: NomeIcone;
  variante?: VarianteBotao;
  tipo?: 'button' | 'submit';
  desabilitado?: boolean;
  onClick?: (evento: MouseEvent) => void;
}

// botão padrão: ícone opcional + texto
export function criarBotao(opcoes: OpcoesBotao): HTMLButtonElement {
  const { texto, icone, variante = 'primario', tipo = 'button', desabilitado = false, onClick } = opcoes;
  const botao = el('button', `btn btn--${variante}`, [icone ? criarIcone(icone, 18) : null, el('span', 'btn__texto', [texto])], { type: tipo });
  botao.disabled = desabilitado;
  if (onClick) botao.addEventListener('click', onClick);
  return botao;
}

/** botão só com ícone (ex.: editar, inativar) */
export function criarBotaoIcone(icone: NomeIcone, rotulo: string, onClick: (evento: MouseEvent) => void, perigo = false): HTMLButtonElement {
  const botao = el('button', `btn-icone${perigo ? ' btn-icone--perigo' : ''}`, [criarIcone(icone, 18)], {
    type: 'button',
    'aria-label': rotulo,
    title: rotulo,
  });
  botao.addEventListener('click', onClick);
  return botao;
}
