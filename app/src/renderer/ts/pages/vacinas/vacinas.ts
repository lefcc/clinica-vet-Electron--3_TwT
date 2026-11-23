import { el } from '../../lib/dom.js';
import { api, executar } from '../../lib/api.js';
import { diasAte, formatarDia } from '../../lib/formatadores.js';
import { perfilAtual } from '../../lib/sessao.js';
import { TEMPLATE_LEMBRETE_PADRAO, montarMensagem } from '../../lib/lembrete.js';
import type { Configuracoes, VacinaCatalogo, VacinaFila } from '../../lib/tipos.js';
import {
  abrirModal,
  criarAbas,
  criarBadge,
  criarBotao,
  criarCabecalhoPagina,
  criarFormulario,
  criarTabela,
  mostrarToast,
  type Aba,
} from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { ligarClienteAnimal } from '../comum/seletores.js';
import { hojeISO, opcional } from '../comum/util.js';

// o texto vem das configurações (o administrador edita); sem ele, usa o padrão
async function mensagemLembrete(v: VacinaFila): Promise<string> {
  const config = await api.invoke<Configuracoes>('configuracoes:obter');
  const modelo = config.ok && config.dados.template_lembrete ? config.dados.template_lembrete : TEMPLATE_LEMBRETE_PADRAO;
  return montarMensagem(modelo, { tutor: v.cliente_nome, animal: v.animal_nome, vacina: v.vacina_nome, data: formatarDia(v.proxima_dose) });
}

// semiautomático: o whatsapp abre com a mensagem e a pessoa confirma
async function enviarLembrete(v: VacinaFila, aoEnviar: () => void): Promise<void> {
  // quem abre o wa.me é o main (segurança)
  const aberto = await api.invoke('whatsapp:abrir', { telefone: v.telefone.replace(/\D/g, ''), mensagem: await mensagemLembrete(v) });
  if (!aberto.ok) {
    mostrarToast('aviso', 'Não foi possível abrir o WhatsApp (sem internet?). O lembrete continua pendente.');
    return;
  }
  const registrado = await api.invoke('vacinas:lembrete_registrar', { id: v.id });
  if (!registrado.ok) return mostrarToast('erro', registrado.erro.mensagem);
  mostrarToast('sucesso', 'Lembrete registrado como enviado.');
  aoEnviar();
}

// vacinas dos próximos 3 dias + botão de lembrete
function abaFila(): HTMLElement {
  const tabela = criarTabela<VacinaFila>({
    textoVazio: 'Nenhuma vacina vence nos próximos 3 dias.',
    onPagina: () => undefined,
    colunas: [
      { chave: 'animal_nome', titulo: 'Animal' },
      { chave: 'cliente_nome', titulo: 'Tutor' },
      { chave: 'vacina_nome', titulo: 'Vacina' },
      {
        chave: 'proxima_dose',
        titulo: 'Próxima dose',
        render: (v) => {
          const dias = diasAte(v.proxima_dose);
          return `${formatarDia(v.proxima_dose)} (${dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`})`;
        },
      },
      { chave: 'lembrete_enviado', titulo: 'Lembrete', render: (v) => criarBadge(v.lembrete_enviado ? 'Enviado' : 'Pendente', v.lembrete_enviado ? 'sucesso' : 'aviso') },
      {
        chave: 'acoes',
        titulo: 'Ações',
        render: (v) => criarBotao({ texto: v.lembrete_enviado ? 'Reenviar' : 'Enviar WhatsApp', icone: 'whatsapp', variante: v.lembrete_enviado ? 'secundario' : 'primario', onClick: () => void enviarLembrete(v, () => void carregar()) }),
      },
    ],
  });
  async function carregar(): Promise<void> {
    tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, carregando: true });
    const r = await api.invoke<VacinaFila[]>('vacinas:fila');
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados, total: r.dados.length, pagina: 1, tamanho: Math.max(r.dados.length, 1) });
  }
  void carregar();
  return el('div', 'stack', [
    el('p', 'pagina__subtitulo', ['Vacinas com dose prevista para os próximos 3 dias. O envio é semiautomático: o WhatsApp abre com a mensagem pronta e você confirma o envio.']),
    tabela.elemento,
  ]);
}

// catálogo de vacinas (só o administrador altera)
const CONFIG_CATALOGO: ConfigCrud<VacinaCatalogo> = {
  canal: 'vacinas',
  prefixoAcao: 'catalogo_',
  titulo: 'Catálogo de vacinas',
  singular: 'vacina',
  textoNovo: 'Nova vacina',
  textoBusca: 'Buscar vacina...',
  podeEscrever: (p) => p === 'MASTER',
  nomeDoItem: (v) => v.nome,
  colunas: [
    { chave: 'nome', titulo: 'Vacina' },
    { chave: 'descricao', titulo: 'Descrição', render: (v) => v.descricao ?? '—' },
    { chave: 'intervalo_reforco_dias', titulo: 'Reforço', render: (v) => `a cada ${v.intervalo_reforco_dias} dias` },
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome da vacina', obrigatorio: true, largura: 'inteira' },
    { nome: 'intervalo_reforco_dias', rotulo: 'Intervalo do reforço (dias)', tipo: 'numero', min: 1, obrigatorio: true, valorInicial: '365' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'area', largura: 'inteira' },
  ],
  paraFormulario: (v) => ({ nome: v.nome, intervalo_reforco_dias: String(v.intervalo_reforco_dias), descricao: v.descricao ?? '' }),
  paraEnvio: (v) => ({ nome: v['nome'], intervalo_reforco_dias: Number(v['intervalo_reforco_dias']), descricao: opcional(v['descricao']) }),
};

// registra a aplicação (o back-end calcula o próximo reforço)
function abrirAplicacao(aoSalvar: () => void): void {
  const form = criarFormulario([
    { nome: 'cliente_id', rotulo: 'Cliente (tutor)', tipo: 'select', obrigatorio: true },
    { nome: 'animal_id', rotulo: 'Animal', tipo: 'select', obrigatorio: true },
    { nome: 'vacina_id', rotulo: 'Vacina', tipo: 'select', obrigatorio: true },
    { nome: 'data', rotulo: 'Data da aplicação', tipo: 'data', obrigatorio: true, valorInicial: hojeISO() },
    { nome: 'lote', rotulo: 'Lote', placeholder: 'Ex.: V10-88' },
  ]);
  void ligarClienteAnimal(form, 'cliente_id', 'animal_id');
  void executar<{ itens: VacinaCatalogo[] }>('vacinas:catalogo_listar', { pagina: 1, tamanho: 100 }).then((p) => {
    form.definirOpcoes('vacina_id', (p?.itens ?? []).map((v) => ({ valor: v.id, texto: v.nome })));
  });

  let salvando = false;
  const botao = criarBotao({ texto: 'Registrar aplicação', icone: 'vacinas', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: 'Registrar aplicação de vacina',
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });
  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const r = await api.invoke('vacinas:aplicar', { animal_id: v['animal_id'], vacina_id: v['vacina_id'], data: v['data'], lote: opcional(v['lote']) });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Aplicação registrada. O próximo reforço entra na fila automaticamente.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// tela de vacinas: fila de lembretes e catálogo
export function paginaVacinas(): HTMLElement {
  const perfil = perfilAtual();
  const podeAplicar = perfil === 'MASTER' || perfil === 'VETERINARIO';
  const abas: Aba[] = [
    { id: 'fila', titulo: 'Próximos 3 dias', renderizar: abaFila },
    { id: 'catalogo', titulo: 'Catálogo', renderizar: () => criarPaginaCrud(CONFIG_CATALOGO) },
  ];
  const conteudo = el('div', '', [criarAbas(abas)]);
  return el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: 'Vacinas',
      subtitulo: 'Aplicações, lembretes de reforço e catálogo.',
      acoes: podeAplicar ? [criarBotao({ texto: 'Registrar aplicação', icone: 'mais', onClick: () => abrirAplicacao(() => window.dispatchEvent(new HashChangeEvent('hashchange'))) })] : [],
    }),
    conteudo,
  ]);
}
