import { el } from '../../lib/dom.js';
import { criarIcone } from '../../lib/icones.js';
import { criarBotao } from './button.js';

export interface OpcoesModal {
  titulo: string;
  /** janela mais larga (forms grandes) */
  largo?: boolean;
  conteudo: Node;
  /** botões do footer (ex.: Cancelar, Salvar) */
  acoes?: HTMLElement[];
  aoFechar?: () => void;
}

export interface ModalAberto {
  fechar: () => void;
}

/** abre uma janela (usa o <dialog> nativo) */
export function abrirModal(opcoes: OpcoesModal): ModalAberto {
  const { titulo, conteudo, acoes = [], aoFechar, largo = false } = opcoes;
  const dialogo = el('dialog', largo ? 'modal modal--largo' : 'modal');
  const idTitulo = `modal-titulo-${Date.now()}`;
  dialogo.setAttribute('aria-labelledby', idTitulo);

  const botaoX = el('button', 'modal__fechar', [criarIcone('fechar', 20)], { type: 'button', 'aria-label': 'Fechar' });
  const cabecalho = el('header', 'modal__cabecalho', [el('h2', 'modal__titulo', [titulo], { id: idTitulo }), botaoX]);
  const corpo = el('div', 'modal__corpo', [conteudo]);
  dialogo.append(cabecalho, corpo);
  if (acoes.length) dialogo.append(el('footer', 'modal__rodape', acoes));

  const fechar = () => {
    if (dialogo.open) dialogo.close();
  };
  botaoX.addEventListener('click', fechar);
  dialogo.addEventListener('close', () => {
    dialogo.remove();
    aoFechar?.();
  });
  // clicar no fundo escuro também fecha
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) fechar();
  });

  document.body.append(dialogo);
  dialogo.showModal();
  return { fechar };
}

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** ações destrutivas usam botão vermelho */
  perigo?: boolean;
}

/** pergunta "tem certeza?"; devolve true se confirmar */
export function confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
  const { titulo, mensagem, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', perigo = false } = opcoes;
  return new Promise((resolve) => {
    let resultado = false;
    const botaoCancelar = criarBotao({ texto: textoCancelar, variante: 'secundario', onClick: () => modal.fechar() });
    const botaoConfirmar = criarBotao({
      texto: textoConfirmar,
      variante: perigo ? 'perigo' : 'primario',
      onClick: () => {
        resultado = true;
        modal.fechar();
      },
    });
    const modal = abrirModal({
      titulo,
      conteudo: el('p', 'modal__mensagem', [mensagem]),
      acoes: [botaoCancelar, botaoConfirmar],
      aoFechar: () => resolve(resultado),
    });
    botaoConfirmar.focus();
  });
}
