import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { perfilAtual } from '../../lib/sessao.js';
import type { Pagina, Perfil } from '../../lib/tipos.js';
import {
  confirmar,
  abrirModal,
  criarBotao,
  criarBotaoIcone,
  criarBusca,
  criarCabecalhoPagina,
  criarFiltro,
  criarFormulario,
  criarTabela,
  mostrarToast,
  type Coluna,
  type DefCampo,
  type Formulario,
  type OpcaoSelect,
} from '../../components/ui/index.js';

export interface ConfigCrud<T extends { id: string }> {
  /** módulo do canal (ex.: "clientes" -> clientes:listar) */
  canal: string;
  /** prefixo da ação (ex.: "catalogo_" -> vacinas:catalogo_listar) */
  prefixoAcao?: string;
  titulo: string;
  subtitulo?: string;
  singular: string;
  textoNovo: string;
  colunas: Coluna<T>[];
  campos: DefCampo[];
  /** quem pode criar/editar/inativar; os outros só consultam */
  podeEscrever: (perfil: Perfil) => boolean;
  /** nome mostrado na pergunta "deseja inativar...?" */
  nomeDoItem: (item: T) => string;
  /** registro do back-end -> textos do form */
  paraFormulario: (item: T) => Record<string, string | undefined>;
  /** o contrário: o que foi digitado -> formato do back-end */
  paraEnvio: (valores: Record<string, string>, editando: boolean) => Record<string, unknown>;
  textoBusca?: string;
  filtros?: { nome: string; rotulo: string; opcoes: OpcaoSelect[] }[];
  /** erro do back-end -> campo que mostra a mensagem */
  errosCampo?: Record<string, string>;
  /** carrega opções dos dropdowns (ex.: clientes) */
  aoPrepararFormulario?: (form: Formulario, item?: T) => Promise<void> | void;
  acoesExtras?: (item: T, recarregar: () => void) => HTMLElement[];
  /** conteúdo extra acima da tabela (ex.: dólar) */
  topo?: () => HTMLElement | Promise<HTMLElement>;
  /** dá pra editar/inativar este item? (padrão: sim) */
  podeAlterar?: (item: T) => boolean;
  /** tela que é só de consulta por natureza (ex.: auditoria): não mostra o aviso */
  ocultarAvisoLeitura?: boolean;
}

// monta o canal: módulo + ação (ex.: clientes:listar)
const canalDe = <T extends { id: string }>(cfg: ConfigCrud<T>, acao: string): string => `${cfg.canal}:${cfg.prefixoAcao ?? ''}${acao}`;
const maiuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

/** janela de criar/editar (com item = edição) */
export async function abrirFormularioCrud<T extends { id: string }>(cfg: ConfigCrud<T>, item: T | undefined, aoSalvar: () => void): Promise<void> {
  const editando = item !== undefined;
  const form = criarFormulario(cfg.campos, !editando);
  if (item) form.definirValores(cfg.paraFormulario(item));
  void cfg.aoPrepararFormulario?.(form, item);

  let salvando = false;
  const botaoSalvar = criarBotao({ texto: 'Salvar', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: editando ? `Editar ${cfg.singular}` : cfg.textoNovo,
    largo: cfg.campos.length > 6,
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botaoSalvar],
  });

  // confere, envia e mostra o resultado (salvando evita clique duplo)
  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botaoSalvar.disabled = true;
    const envio = cfg.paraEnvio(form.obterValores(), editando);
    const resposta = await api.invoke(canalDe(cfg, editando ? 'atualizar' : 'criar'), editando && item ? { id: item.id, ...envio } : envio);
    salvando = false;
    botaoSalvar.disabled = false;
    // erro de campo vai embaixo do campo; senão vira aviso
    if (!resposta.ok) {
      const campo = cfg.errosCampo?.[resposta.erro.codigo];
      if (campo) form.definirErro(campo, resposta.erro.mensagem);
      else mostrarToast('erro', resposta.erro.mensagem);
      return;
    }
    mostrarToast('sucesso', `${maiuscula(cfg.singular)} salvo com sucesso.`);
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// inativar não apaga: o histórico fica
export async function inativarCrud<T extends { id: string }>(cfg: ConfigCrud<T>, item: T, aoInativar: () => void): Promise<void> {
  const confirmado = await confirmar({
    titulo: `Inativar ${cfg.singular}`,
    mensagem: `Deseja inativar "${cfg.nomeDoItem(item)}"? O histórico será mantido, mas o registro deixa de aparecer na lista.`,
    textoConfirmar: 'Inativar',
    perigo: true,
  });
  if (!confirmado) return;
  const resposta = await api.invoke(canalDe(cfg, 'inativar'), { id: item.id });
  if (!resposta.ok) {
    mostrarToast('erro', resposta.erro.mensagem);
    return;
  }
  mostrarToast('sucesso', `${maiuscula(cfg.singular)} inativado.`);
  aoInativar();
}

/** tela de cadastro: busca, filtros, tabela e botões */
export function criarPaginaCrud<T extends { id: string }>(cfg: ConfigCrud<T>): HTMLElement {
  const perfil = perfilAtual();
  const podeEscrever = perfil ? cfg.podeEscrever(perfil) : false;
  const estado = { pagina: 1, tamanho: 10, busca: '', filtros: {} as Record<string, string> };

  // coluna de ações só existe se o perfil pode mexer
  const colunas = [...cfg.colunas];
  if (podeEscrever || cfg.acoesExtras) {
    colunas.push({
      chave: 'acoes',
      titulo: 'Ações',
      render: (item) => {
        const alteravel = cfg.podeAlterar ? cfg.podeAlterar(item) : true;
        return el('div', 'acoes', [
          ...(cfg.acoesExtras?.(item, () => void carregar()) ?? []),
          podeEscrever && alteravel ? criarBotaoIcone('editar', `Editar ${cfg.singular}`, () => void abrirFormularioCrud(cfg, item, () => void carregar())) : null,
          podeEscrever && alteravel ? criarBotaoIcone('inativar', `Inativar ${cfg.singular}`, () => void inativarCrud(cfg, item, () => void carregar()), true) : null,
        ]);
      },
    });
  }

  const tabela = criarTabela<T>({
    colunas,
    textoVazio: `Nenhum ${cfg.singular} encontrado.`,
    onPagina: (pagina) => {
      estado.pagina = pagina;
      void carregar();
    },
  });

  // busca a lista (página, busca e filtros) e joga na tabela
  async function carregar(): Promise<void> {
    tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, carregando: true });
    const resposta = await api.invoke<Pagina<T>>(canalDe(cfg, 'listar'), { pagina: estado.pagina, tamanho: estado.tamanho, busca: estado.busca || undefined, ...estado.filtros });
    if (!resposta.ok) {
      tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, erro: resposta.erro.mensagem });
      return;
    }
    const { itens, total, pagina, tamanho } = resposta.dados;
    tabela.atualizar({ linhas: itens, total, pagina, tamanho });
  }

  const barra = el('div', 'barra', [
    criarBusca({
      placeholder: cfg.textoBusca ?? `Buscar ${cfg.singular}...`,
      aoBuscar: (texto) => {
        estado.busca = texto;
        estado.pagina = 1;
        void carregar();
      },
    }),
    ...(cfg.filtros ?? []).map((f) =>
      criarFiltro(f.rotulo, f.opcoes, (valor) => {
        estado.filtros[f.nome] = valor;
        estado.pagina = 1;
        void carregar();
      }),
    ),
  ]);

  const raiz = el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: cfg.titulo,
      subtitulo: cfg.subtitulo,
      acoes: podeEscrever ? [criarBotao({ texto: cfg.textoNovo, icone: 'mais', onClick: () => void abrirFormularioCrud(cfg, undefined, () => void carregar()) })] : [],
    }),
  ]);
  if (!podeEscrever && !cfg.ocultarAvisoLeitura) raiz.append(el('p', 'aviso-leitura', ['Seu perfil tem acesso somente para consulta nesta tela.']));
  const areaTopo = el('div', 'pagina__topo');
  raiz.append(areaTopo, barra, tabela.elemento);
  if (cfg.topo) void Promise.resolve(cfg.topo()).then((conteudo) => areaTopo.append(conteudo));

  void carregar();
  return raiz;
}
