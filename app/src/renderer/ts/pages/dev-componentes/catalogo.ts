import { el } from '../../lib/dom.js';
import {
  abrirModal,
  confirmar,
  criarAbas,
  criarBadge,
  criarBotao,
  criarCampo,
  criarEstadoVazio,
  criarEstatistica,
  criarInput,
  criarSelect,
  criarSpinner,
  criarTabela,
  criarTextarea,
  mostrarToast,
} from '../../components/ui/index.js';
import { formatarCentavos } from '../../lib/formatadores.js';

// dados inventados só pra tabela de exemplo
interface LinhaExemplo {
  nome: string;
  especie: string;
  valor: number;
}

const TODAS: LinhaExemplo[] = [
  { nome: 'Rex', especie: 'Cão', valor: 12500 },
  { nome: 'Mia', especie: 'Gato', valor: 8990 },
  { nome: 'Thor', especie: 'Cão', valor: 15000 },
  { nome: 'Luna', especie: 'Gato', valor: 7000 },
  { nome: 'Bidu', especie: 'Cão', valor: 9900 },
];

// card com título pra cada grupo de exemplos
function secao(titulo: string, ...filhos: HTMLElement[]): HTMLElement {
  return el('section', 'cartao', [el('header', 'cartao__cabecalho', [el('h2', 'cartao__titulo', [titulo])]), el('div', 'cartao__corpo', filhos)]);
}

/** mostra todos os componentes (#/dev/componentes, fora do menu) */
export function montarCatalogo(): HTMLElement {
  const botoes = el('div', 'linha', [
    criarBotao({ texto: 'Salvar', icone: 'sucesso' }),
    criarBotao({ texto: 'Cancelar', variante: 'secundario' }),
    criarBotao({ texto: 'Inativar', icone: 'inativar', variante: 'perigo' }),
    criarBotao({ texto: 'Link discreto', variante: 'fantasma' }),
    criarBotao({ texto: 'Desabilitado', desabilitado: true }),
  ]);

  const cpf = criarCampo({ rotulo: 'CPF', controle: criarInput({ mascara: 'cpf', placeholder: '000.000.000-00' }), obrigatorio: true });
  const preco = criarCampo({ rotulo: 'Valor', controle: criarInput({ mascara: 'dinheiro', placeholder: '0,00' }), dica: 'Digite só números: 1250 vira 12,50.' });
  const especie = criarCampo({ rotulo: 'Espécie', controle: criarSelect([{ valor: 'cao', texto: 'Cão' }, { valor: 'gato', texto: 'Gato' }], { placeholder: 'Selecione...' }) });
  const obs = criarCampo({ rotulo: 'Observações', controle: criarTextarea({ placeholder: 'Anotações...' }) });
  const comErro = criarCampo({ rotulo: 'Campo com erro', controle: criarInput({ valor: 'abc' }) });
  comErro.definirErro('Este campo está inválido.');
  const campos = el('div', 'form__grade', [cpf.elemento, preco.elemento, especie.elemento, obs.elemento, comErro.elemento]);

  const tamanho = 2;
  const tabela = criarTabela<LinhaExemplo>({
    colunas: [
      { chave: 'nome', titulo: 'Nome' },
      { chave: 'especie', titulo: 'Espécie' },
      { chave: 'valor', titulo: 'Valor', render: (l) => formatarCentavos(l.valor) },
    ],
    onPagina: (pagina) => mostrar(pagina),
  });
  function mostrar(pagina: number): void {
    const inicio = (pagina - 1) * tamanho;
    tabela.atualizar({ linhas: TODAS.slice(inicio, inicio + tamanho), total: TODAS.length, pagina, tamanho });
  }
  mostrar(1);

  const abrir = criarBotao({
    texto: 'Abrir modal',
    variante: 'secundario',
    onClick: () => {
      const campo = criarCampo({ rotulo: 'Nome do animal', controle: criarInput() });
      const modal = abrirModal({ titulo: 'Novo animal', conteudo: campo.elemento, acoes: [criarBotao({ texto: 'Fechar', variante: 'secundario', onClick: () => modal.fechar() })] });
    },
  });
  const pedirConfirmacao = criarBotao({
    texto: 'Confirmar ação',
    variante: 'perigo',
    onClick: async () => {
      const ok = await confirmar({ titulo: 'Inativar cliente', mensagem: 'Deseja realmente inativar este cliente?', textoConfirmar: 'Inativar', perigo: true });
      mostrarToast(ok ? 'sucesso' : 'info', ok ? 'Cliente inativado.' : 'Ação cancelada.');
    },
  });
  const toasts = el('div', 'linha', [
    criarBotao({ texto: 'Sucesso', variante: 'secundario', onClick: () => mostrarToast('sucesso', 'Salvo com sucesso!') }),
    criarBotao({ texto: 'Erro', variante: 'secundario', onClick: () => mostrarToast('erro', 'Já existe um cliente com este CPF.') }),
    criarBotao({ texto: 'Aviso', variante: 'secundario', onClick: () => mostrarToast('aviso', 'Sem internet — dados serão sincronizados depois.') }),
    criarBotao({ texto: 'Info', variante: 'secundario', onClick: () => mostrarToast('info', 'Lembrete enviado.') }),
  ]);

  return el('section', 'pagina', [
    el('h1', 'pagina__titulo', ['Catálogo de componentes']),
    secao('Botões', botoes),
    secao('Selos', el('div', 'linha', [criarBadge('Neutro'), criarBadge('Sucesso', 'sucesso'), criarBadge('Aviso', 'aviso'), criarBadge('Erro', 'erro'), criarBadge('Info', 'info')])),
    secao('Campos de formulário', campos),
    secao('Tabela com paginação', tabela.elemento),
    secao('Modal e confirmação', el('div', 'linha', [abrir, pedirConfirmacao])),
    secao('Notificações (toast)', toasts),
    secao('Números do painel', el('div', 'estatisticas', [criarEstatistica({ rotulo: 'Atendimentos hoje', valor: '5', icone: 'agenda', tom: 'info' }), criarEstatistica({ rotulo: 'Estoque crítico', valor: '2', icone: 'estoque', tom: 'erro' })])),
    secao('Abas', criarAbas([{ id: 'a', titulo: 'Primeira', renderizar: () => el('p', '', ['Conteúdo da primeira aba.']) }, { id: 'b', titulo: 'Segunda', renderizar: () => el('p', '', ['Conteúdo da segunda aba.']) }])),
    secao('Spinner', criarSpinner()),
    secao('Estado vazio', criarEstadoVazio({ titulo: 'Nenhum cliente cadastrado', descricao: 'Cadastre o primeiro cliente para começar.', acao: { texto: 'Novo cliente', icone: 'mais', onClick: () => mostrarToast('info', 'Abriria o formulário.') } })),
  ]);
}
