import { el } from '../../lib/dom.js';
import { criarIcone, type NomeIcone } from '../../lib/icones.js';

export type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info';

const ICONES: Record<TipoToast, NomeIcone> = { sucesso: 'sucesso', erro: 'erro', aviso: 'aviso', info: 'info' };

// acha (ou cria) o container onde os toasts empilham
function obterContainer(): HTMLElement {
  let container = document.getElementById('toasts');
  if (!container) {
    container = el('div', 'toasts', [], { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(container);
  }
  return container;
}

// toast que some sozinho
export function mostrarToast(tipo: TipoToast, mensagem: string, duracaoMs = 4500): void {
  const toast = el(
    'div',
    `toast toast--${tipo}`,
    [el('span', 'toast__icone', [criarIcone(ICONES[tipo], 20)]), el('span', 'toast__texto', [mensagem])],
    { role: tipo === 'erro' ? 'alert' : 'status' },
  );
  obterContainer().append(toast);
  window.setTimeout(() => toast.remove(), duracaoMs);
}
