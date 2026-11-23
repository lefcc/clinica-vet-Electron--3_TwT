import { el, novoId } from '../../lib/dom.js';

export interface Aba {
  id: string;
  titulo: string;
  renderizar: () => HTMLElement | Promise<HTMLElement>;
}

/** abas clicáveis (tipo "Orçamentos | Catálogo de serviços") */
export function criarAbas(abas: Aba[], abaInicial = 0): HTMLElement {
  const base = novoId('abas');
  const lista = el('div', 'abas__lista', [], { role: 'tablist' });
  const painel = el('div', 'abas__painel', [], { role: 'tabpanel', tabindex: 0 });
  const botoes: HTMLButtonElement[] = [];

  // marca a aba ativa e troca o conteúdo
  async function abrir(indice: number): Promise<void> {
    botoes.forEach((botao, i) => {
      botao.setAttribute('aria-selected', String(i === indice));
      botao.tabIndex = i === indice ? 0 : -1;
      botao.classList.toggle('abas__aba--ativa', i === indice);
    });
    const aba = abas[indice];
    if (!aba) return;
    painel.setAttribute('aria-labelledby', `${base}-${aba.id}`);
    painel.replaceChildren(await aba.renderizar());
  }

  abas.forEach((aba, indice) => {
    const botao = el('button', 'abas__aba', [aba.titulo], { type: 'button', role: 'tab', id: `${base}-${aba.id}` });
    botao.addEventListener('click', () => void abrir(indice));
    // setas do teclado trocam de aba
    botao.addEventListener('keydown', (evento) => {
      const delta = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      const proximo = (indice + delta + abas.length) % abas.length;
      botoes[proximo]?.focus();
      void abrir(proximo);
    });
    botoes.push(botao);
    lista.append(botao);
  });

  void abrir(abaInicial);
  return el('div', 'abas', [lista, painel]);
}
