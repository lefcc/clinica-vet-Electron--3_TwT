import { el } from '../../lib/dom.js';
import { criarIcone } from '../../lib/icones.js';
import { criarSelect, type OpcaoSelect } from './campos.js';

export interface OpcoesBusca {
  placeholder: string;
  aoBuscar: (texto: string) => void;
  /** tempo de espera (ms) depois da última tecla */
  atrasoMs?: number;
}

/** caixa de busca com a lupa */
export function criarBusca(opcoes: OpcoesBusca): HTMLElement {
  const { placeholder, aoBuscar, atrasoMs = 300 } = opcoes;
  const input = el('input', 'busca__input', [], { type: 'search', placeholder, 'aria-label': placeholder });
  let temporizador: number | undefined;
  input.addEventListener('input', () => {
    // espera a pessoa parar de digitar pra buscar
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => aoBuscar(input.value.trim()), atrasoMs);
  });
  return el('div', 'busca', [criarIcone('buscar', 18), input]);
}

/** filtro em dropdown, com a opção "Todos" */
export function criarFiltro(rotulo: string, opcoes: OpcaoSelect[], aoMudar: (valor: string) => void): HTMLElement {
  const select = criarSelect([{ valor: '', texto: 'Todos' }, ...opcoes]);
  select.setAttribute('aria-label', rotulo);
  select.classList.add('filtro__select');
  select.addEventListener('change', () => aoMudar(select.value));
  return el('label', 'filtro', [el('span', 'filtro__rotulo', [rotulo]), select]);
}
