import { el } from '../../lib/dom.js';
import { criarBotao } from './button.js';
import { criarEstadoVazio, criarSpinner } from './feedback.js';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  /** como desenhar a célula (padrão: texto de linha[chave]) */
  render?: (linha: T) => Node | string;
}

/** estado da tabela (mesmo formato da listagem do back-end) */
export interface EstadoTabela<T> {
  linhas: T[];
  total: number;
  pagina: number;
  tamanho: number;
  carregando?: boolean;
  erro?: string;
}

export interface OpcoesTabela<T> {
  colunas: Coluna<T>[];
  onPagina: (pagina: number) => void;
  textoVazio?: string;
}

export interface Tabela<T> {
  elemento: HTMLElement;
  atualizar: (estado: EstadoTabela<T>) => void;
}

// tabela com paginação; atualizar() decide o que mostrar
export function criarTabela<T>(opcoes: OpcoesTabela<T>): Tabela<T> {
  const { colunas, onPagina, textoVazio = 'Nenhum registro encontrado.' } = opcoes;
  const raiz = el('div', 'tabela');

  function atualizar(estado: EstadoTabela<T>): void {
    // redesenha tudo
    raiz.replaceChildren();

    if (estado.carregando) {
      raiz.append(criarSpinner());
      return;
    }
    if (estado.erro) {
      raiz.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar', descricao: estado.erro }));
      return;
    }
    if (estado.linhas.length === 0) {
      raiz.append(criarEstadoVazio({ titulo: textoVazio }));
      return;
    }

    const cabecalho = el('tr', '', colunas.map((c) => el('th', '', [c.titulo], { scope: 'col' })));
    const corpo = el(
      'tbody',
      '',
      estado.linhas.map((linha) =>
        el(
          'tr',
          '',
          colunas.map((c) => {
            const valor = c.render ? c.render(linha) : String((linha as Record<string, unknown>)[c.chave] ?? '');
            return el('td', '', [valor], { 'data-rotulo': c.titulo });
          }),
        ),
      ),
    );
    raiz.append(el('div', 'tabela__rolagem', [el('table', 'tabela__tabela', [el('thead', '', [cabecalho]), corpo])]));

    // contas da paginação ("1–10 de 37")
    const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.tamanho));
    const primeiro = (estado.pagina - 1) * estado.tamanho + 1;
    const ultimo = Math.min(estado.pagina * estado.tamanho, estado.total);
    raiz.append(
      el('div', 'tabela__paginacao', [
        el('span', 'tabela__info', [`${primeiro}–${ultimo} de ${estado.total}`]),
        criarBotao({ texto: 'Anterior', icone: 'anterior', variante: 'secundario', desabilitado: estado.pagina <= 1, onClick: () => onPagina(estado.pagina - 1) }),
        el('span', 'tabela__pagina', [`Página ${estado.pagina} de ${totalPaginas}`]),
        criarBotao({ texto: 'Próxima', icone: 'proxima', variante: 'secundario', desabilitado: estado.pagina >= totalPaginas, onClick: () => onPagina(estado.pagina + 1) }),
      ]),
    );
  }

  return { elemento: raiz, atualizar };
}
