import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarDataHora } from '../../lib/formatadores.js';
import type { Conflito } from '../../lib/tipos.js';
import { confirmar, criarBadge, criarBotao, criarCabecalhoPagina, criarEstadoVazio, criarSpinner, mostrarToast } from '../../components/ui/index.js';

// tipos de conflito em frase fácil
const TIPOS: Record<string, string> = {
  AGENDA_SOBREPOSTA: 'Horários da agenda sobrepostos',
  EDICAO_CONCORRENTE: 'Mesmo registro editado em dois computadores',
};

// um dos lados do conflito (local ou servidor)
function mostrarDados(rotulo: string, dados: Record<string, unknown>): HTMLElement {
  return el('div', 'conflito__lado', [
    el('h3', '', [rotulo]),
    el('dl', 'info', Object.entries(dados).map(([k, v]) => el('div', 'info__linha', [el('dt', '', [k.replace(/_/g, ' ')]), el('dd', '', [String(v)])]))),
  ]);
}

// dois pcs mudaram o mesmo dado offline: o administrador escolhe a versão
export function paginaConflitos(): HTMLElement {
  const lista = el('div', 'stack');

  // aplica a escolha depois de confirmar
  async function resolver(c: Conflito, escolha: 'LOCAL' | 'CENTRAL'): Promise<void> {
    const sim = await confirmar({
      titulo: 'Resolver conflito',
      mensagem: escolha === 'LOCAL' ? 'Manter a versão deste computador? A versão do servidor será substituída.' : 'Manter a versão do servidor? A versão deste computador será descartada.',
      textoConfirmar: 'Resolver',
    });
    if (!sim) return;
    const r = await api.invoke('sync_conflitos:resolver', { id: c.id, escolha });
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Conflito resolvido.');
    void carregar();
  }

  async function carregar(): Promise<void> {
    lista.replaceChildren(criarSpinner());
    const r = await api.invoke<Conflito[]>('sync_conflitos:listar');
    lista.replaceChildren();
    if (!r.ok) {
      lista.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar', descricao: r.erro.mensagem }));
      return;
    }
    if (r.dados.length === 0) {
      lista.append(criarEstadoVazio({ icone: 'conflitos', titulo: 'Nenhum conflito em aberto', descricao: 'Tudo certo: os computadores estão em acordo.' }));
      return;
    }
    for (const c of r.dados) {
      lista.append(
        el('article', 'cartao conflito', [
          el('header', 'conflito__cabecalho', [el('strong', '', [TIPOS[c.tipo] ?? c.tipo]), criarBadge(c.tabela, 'info'), el('span', 'conflito__data', [formatarDataHora(c.criado_em)])]),
          el('div', 'conflito__lados', [mostrarDados('Este computador', c.dados_local), mostrarDados('Servidor central', c.dados_central)]),
          el('div', 'conflito__acoes', [
            criarBotao({ texto: 'Manter deste computador', variante: 'secundario', onClick: () => void resolver(c, 'LOCAL') }),
            criarBotao({ texto: 'Manter do servidor', onClick: () => void resolver(c, 'CENTRAL') }),
          ]),
        ]),
      );
    }
  }

  void carregar();
  return el('section', 'pagina', [criarCabecalhoPagina({ titulo: 'Conflitos de sincronização', subtitulo: 'Quando dois computadores alteram a mesma informação, o administrador escolhe qual versão vale.' }), lista]);
}
