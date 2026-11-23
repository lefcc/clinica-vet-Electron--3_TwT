import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarDataHora } from '../../lib/formatadores.js';
import { perfilAtual } from '../../lib/sessao.js';
import type { Consulta, Pagina, Prescricao } from '../../lib/tipos.js';
import {
  abrirModal,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarBusca,
  criarCabecalhoPagina,
  criarFormulario,
  criarInput,
  criarSelect,
  criarTabela,
  mostrarToast,
} from '../../components/ui/index.js';
import { ligarClienteAnimal, opcoesMedicamentos } from '../comum/seletores.js';
import { opcional } from '../comum/util.js';

/** linhas de prescrição (medicamento, quantidade, posologia) */
function criarEditorPrescricoes(): { elemento: HTMLElement; obter: () => Prescricao[] } {
  const linhas = el('div', 'prescricoes__linhas');
  let opcoes: { valor: string; texto: string; unidade: string }[] = [];
  // carrega os medicamentos uma vez e reaproveita
  const carregado = opcoesMedicamentos().then((o) => (opcoes = o));

  // adiciona uma linha em branco
  function adicionar(): void {
    const select = criarSelect([], { placeholder: 'Medicamento...' });
    void carregado.then(() => {
      for (const o of opcoes) select.append(el('option', '', [`${o.texto} (${o.unidade})`], { value: o.valor }));
    });
    select.setAttribute('aria-label', 'Medicamento');
    const quantidade = criarInput({ tipo: 'number', placeholder: 'Qtd.' });
    quantidade.min = '1';
    quantidade.setAttribute('aria-label', 'Quantidade');
    const posologia = criarInput({ placeholder: 'Posologia (ex.: 1 comprimido a cada 12h)' });
    posologia.setAttribute('aria-label', 'Posologia');
    const linha = el('div', 'prescricoes__linha', [select, quantidade, posologia, criarBotaoIcone('inativar', 'Remover medicamento', () => linha.remove(), true)]);
    linhas.append(linha);
  }

  const elemento = el('div', 'prescricoes', [
    el('h3', 'prescricoes__titulo', ['Prescrição de medicamentos']),
    el('p', 'campo__dica', ['O estoque dos medicamentos prescritos é baixado automaticamente ao salvar a consulta.']),
    linhas,
    criarBotao({ texto: 'Adicionar medicamento', icone: 'mais', variante: 'fantasma', onClick: adicionar }),
  ]);

  return {
    elemento,
    // lê as linhas completas na hora de salvar
    obter: () =>
      [...linhas.children]
        .map((linha) => {
          const [select, quantidade, posologia] = [...linha.querySelectorAll('select, input')] as [HTMLSelectElement, HTMLInputElement, HTMLInputElement];
          return { medicamento_id: select.value, quantidade: Number(quantidade.value), posologia: opcional(posologia.value.trim()) };
        })
        .filter((p) => p.medicamento_id && p.quantidade > 0),
  };
}

// janela de nova consulta (salvar baixa o estoque no back-end)
function abrirNovaConsulta(aoSalvar: () => void): void {
  const form = criarFormulario([
    { nome: 'cliente_id', rotulo: 'Cliente (tutor)', tipo: 'select', obrigatorio: true },
    { nome: 'animal_id', rotulo: 'Animal', tipo: 'select', obrigatorio: true },
    { nome: 'anamnese', rotulo: 'Anamnese (queixa e histórico)', tipo: 'area', obrigatorio: true, largura: 'inteira' },
    { nome: 'diagnostico', rotulo: 'Diagnóstico', tipo: 'area', largura: 'inteira', dica: 'Visível apenas para veterinários e administradores.' },
    { nome: 'observacoes', rotulo: 'Observações do veterinário', tipo: 'area', largura: 'inteira' },
  ]);
  void ligarClienteAnimal(form, 'cliente_id', 'animal_id');
  const prescricoes = criarEditorPrescricoes();

  let salvando = false;
  const botao = criarBotao({ texto: 'Salvar consulta', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: 'Nova consulta',
    largo: true,
    conteudo: el('div', 'stack', [form.elemento, prescricoes.elemento]),
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });

  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const r = await api.invoke('consultas:criar', {
      animal_id: v['animal_id'],
      anamnese: v['anamnese'],
      diagnostico: opcional(v['diagnostico']),
      observacoes: opcional(v['observacoes']),
      prescricoes: prescricoes.obter(),
    });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Consulta registrada.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// bloco "título + texto"
function bloco(rotulo: string, texto: string | undefined, vazio = 'Não informado.'): HTMLElement {
  return el('div', 'detalhe__bloco', [el('h3', '', [rotulo]), el('p', '', [texto || vazio])]);
}

// consulta completa, só leitura
function abrirDetalhe(c: Consulta): void {
  // o atendente não recebe o diagnóstico (o back-end omite)
  const semAcesso = perfilAtual() === 'ATENDENTE' && c.diagnostico === undefined;
  const modal = abrirModal({
    titulo: `Consulta de ${c.animal_nome}`,
    largo: true,
    conteudo: el('div', 'stack', [
      el('p', 'detalhe__meta', [`${formatarDataHora(c.data)} · ${c.veterinario_nome} · Tutor: ${c.cliente_nome}`]),
      bloco('Anamnese', c.anamnese),
      semAcesso ? bloco('Diagnóstico', 'O diagnóstico detalhado não está disponível para o seu perfil.') : bloco('Diagnóstico', c.diagnostico),
      bloco('Observações', c.observacoes),
      el('div', 'detalhe__bloco', [
        el('h3', '', ['Prescrições']),
        c.prescricoes.length
          ? el('div', 'timeline__prescricoes', c.prescricoes.map((p) => criarBadge(`${p.medicamento_nome ?? 'Medicamento'} × ${p.quantidade}${p.posologia ? ` — ${p.posologia}` : ''}`, 'info')))
          : el('p', '', ['Nenhum medicamento prescrito.']),
      ]),
    ]),
    acoes: [criarBotao({ texto: 'Fechar', variante: 'secundario', onClick: () => modal.fechar() })],
  });
}

// lista de consultas (só administrador e veterinário criam)
export function paginaConsultas(): HTMLElement {
  const perfil = perfilAtual();
  const podeCriar = perfil === 'MASTER' || perfil === 'VETERINARIO';
  const estado = { pagina: 1, tamanho: 10, busca: '' };

  const tabela = criarTabela<Consulta>({
    textoVazio: 'Nenhuma consulta registrada.',
    onPagina: (p) => {
      estado.pagina = p;
      void carregar();
    },
    colunas: [
      { chave: 'data', titulo: 'Data', render: (c) => formatarDataHora(c.data) },
      { chave: 'animal_nome', titulo: 'Animal' },
      { chave: 'cliente_nome', titulo: 'Tutor' },
      { chave: 'veterinario_nome', titulo: 'Veterinário(a)' },
      { chave: 'anamnese', titulo: 'Anamnese', render: (c) => (c.anamnese && c.anamnese.length > 60 ? `${c.anamnese.slice(0, 60)}...` : (c.anamnese ?? '—')) },
      { chave: 'acoes', titulo: 'Ações', render: (c) => el('div', 'acoes', [criarBotaoIcone('olho', 'Ver consulta completa', () => abrirDetalhe(c))]) },
    ],
  });

  async function carregar(): Promise<void> {
    tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, carregando: true });
    const r = await api.invoke<Pagina<Consulta>>('consultas:listar', { pagina: estado.pagina, tamanho: estado.tamanho, busca: estado.busca || undefined });
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: estado.pagina, tamanho: estado.tamanho, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados.itens, total: r.dados.total, pagina: r.dados.pagina, tamanho: r.dados.tamanho });
  }

  const raiz = el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: 'Consultas',
      subtitulo: 'Prontuário: anamnese, diagnóstico e prescrições de cada atendimento.',
      acoes: podeCriar ? [criarBotao({ texto: 'Nova consulta', icone: 'mais', onClick: () => abrirNovaConsulta(() => void carregar()) })] : [],
    }),
    perfil === 'ATENDENTE' ? el('p', 'aviso-leitura', ['O diagnóstico detalhado não é exibido para o seu perfil.']) : null,
    el('div', 'barra', [
      criarBusca({
        placeholder: 'Buscar por animal, tutor ou veterinário...',
        aoBuscar: (t) => {
          estado.busca = t;
          estado.pagina = 1;
          void carregar();
        },
      }),
    ]),
    tabela.elemento,
  ]);
  void carregar();
  return raiz;
}
