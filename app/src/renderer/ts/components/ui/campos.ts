import { el, novoId } from '../../lib/dom.js';
import { MASCARAS, type NomeMascara } from '../../lib/mascaras.js';

export interface OpcoesInput {
  tipo?: 'text' | 'email' | 'password' | 'date' | 'number' | 'tel';
  mascara?: NomeMascara;
  placeholder?: string;
  valor?: string;
  obrigatorio?: boolean;
  nome?: string;
}

// campo de texto simples
export function criarInput(opcoes: OpcoesInput = {}): HTMLInputElement {
  const { tipo = 'text', mascara, placeholder, valor, obrigatorio, nome } = opcoes;
  const input = el('input', 'input', [], {
    type: tipo,
    ...(placeholder ? { placeholder } : {}),
    ...(nome ? { name: nome } : {}),
    ...(obrigatorio ? { required: true } : {}),
  });
  if (mascara) {
    const aplicar = MASCARAS[mascara];
    input.inputMode = mascara === 'cpf' || mascara === 'telefone' || mascara === 'cep' || mascara === 'dinheiro' ? 'numeric' : 'text';
    input.addEventListener('input', () => {
      input.value = aplicar(input.value);
    });
    if (valor) input.value = aplicar(valor);
  } else if (valor) {
    input.value = valor;
  }
  return input;
}

export interface OpcaoSelect {
  valor: string;
  texto: string;
}

// dropdown; o placeholder vira a 1ª opção vazia
export function criarSelect(opcoes: OpcaoSelect[], opcoesExtra: { placeholder?: string; valor?: string } = {}): HTMLSelectElement {
  const select = el('select', 'input');
  if (opcoesExtra.placeholder) {
    select.append(el('option', '', [opcoesExtra.placeholder], { value: '' }));
  }
  for (const o of opcoes) select.append(el('option', '', [o.texto], { value: o.valor }));
  if (opcoesExtra.valor !== undefined) select.value = opcoesExtra.valor;
  return select;
}

export function criarTextarea(opcoes: { placeholder?: string; linhas?: number; valor?: string } = {}): HTMLTextAreaElement {
  const area = el('textarea', 'input input--area', [], {
    rows: opcoes.linhas ?? 4,
    ...(opcoes.placeholder ? { placeholder: opcoes.placeholder } : {}),
  });
  if (opcoes.valor) area.value = opcoes.valor;
  return area;
}

export interface OpcoesCampo {
  rotulo: string;
  controle: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  dica?: string;
  obrigatorio?: boolean;
}

export interface Campo {
  elemento: HTMLElement;
  /** mostra o erro embaixo do campo (sem argumento, limpa) */
  definirErro: (mensagem?: string) => void;
  /** troca a dica por um tempo (sem argumento, volta ao normal) */
  definirDica: (mensagem?: string) => void;
}

/** rótulo + campo + dica + erro num bloco só */
export function criarCampo(opcoes: OpcoesCampo): Campo {
  const { rotulo, controle, dica, obrigatorio } = opcoes;
  const id = controle.id || novoId('campo');
  controle.id = id;

  const rotuloEl = el('label', 'campo__rotulo', [rotulo, obrigatorio ? el('span', 'campo__obrigatorio', [' *'], { 'aria-hidden': 'true' }) : null], { for: id });
  const dicaEl = el('p', 'campo__dica', [dica ?? ''], { id: `${id}-dica` });
  dicaEl.hidden = !dica;
  const erroEl = el('p', 'campo__erro', [], { id: `${id}-erro`, role: 'alert' });
  erroEl.hidden = true;

  controle.setAttribute('aria-describedby', `${id}-dica ${id}-erro`);

  const elemento = el('div', 'campo', [rotuloEl, controle, dicaEl, erroEl]);

  return {
    elemento,
    definirDica(mensagem) {
      dicaEl.textContent = mensagem ?? dica ?? '';
      dicaEl.hidden = !(mensagem ?? dica);
    },
    definirErro(mensagem) {
      erroEl.textContent = mensagem ?? '';
      erroEl.hidden = !mensagem;
      controle.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
      elemento.classList.toggle('campo--erro', Boolean(mensagem));
    },
  };
}
