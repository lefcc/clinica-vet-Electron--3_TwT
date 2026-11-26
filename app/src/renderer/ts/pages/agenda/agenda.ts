import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { criarIcone } from '../../lib/icones.js';
import { diaEmSaoPaulo, saoPauloParaUtc } from '../../lib/formatadores.js';
import { perfilAtual } from '../../lib/sessao.js';
import type { Agendamento } from '../../lib/tipos.js';
import {
  abrirModal,
  confirmar,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarCabecalhoPagina,
  criarEstadoVazio,
  criarFormulario,
  criarSelect,
  criarSpinner,
  mostrarToast,
  type Tom,
} from '../../components/ui/index.js';
import { ligarClienteAnimal, opcoesVeterinarios } from '../comum/seletores.js';
import { hojeISO, horaLocal, limitesDoDia, opcional } from '../comum/util.js';

// cor e texto de cada status do agendamento
const TOM_STATUS: Record<string, Tom> = { AGENDADO: 'info', CONFIRMADO: 'sucesso', REALIZADO: 'neutro', CANCELADO: 'erro' };
const TEXTO_STATUS: Record<string, string> = { AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', REALIZADO: 'Realizado', CANCELADO: 'Cancelado' };

// soma dias (ou subtrai, com negativo) numa data
function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  const novo = new Date(a, m - 1, d + dias);
  return `${novo.getFullYear()}-${String(novo.getMonth() + 1).padStart(2, '0')}-${String(novo.getDate()).padStart(2, '0')}`;
}

// data por extenso ("sexta-feira, 20 de novembro de 2026")
function textoDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// janela de novo agendamento ou edição
function abrirFormulario(item: Agendamento | undefined, diaInicial: string, aoSalvar: () => void): void {
  const form = criarFormulario([
    { nome: 'cliente_id', rotulo: 'Cliente (tutor)', tipo: 'select', obrigatorio: true },
    { nome: 'animal_id', rotulo: 'Animal', tipo: 'select', obrigatorio: true },
    { nome: 'veterinario_id', rotulo: 'Veterinário(a)', tipo: 'select', obrigatorio: true, largura: 'inteira' },
    {
      nome: 'data',
      rotulo: 'Data',
      tipo: 'data',
      obrigatorio: true,
      largura: 'terco',
      valorInicial: diaInicial,
      validar: (v) => (v && v < hojeISO() ? 'Não é possível agendar em uma data passada.' : undefined),
    },
    {
      nome: 'hora',
      rotulo: 'Horário',
      tipo: 'hora',
      obrigatorio: true,
      largura: 'terco',
      validar: (v, todos) => {
        if (!v || !todos['data']) return undefined;
        const inicioUtc = saoPauloParaUtc(todos['data'], v);
        if (new Date(inicioUtc).getTime() < Date.now() - 60_000) {
          return 'Não é possível agendar em um horário que já passou.';
        }
        return undefined;
      },
    },
    {
      nome: 'duracao_min',
      rotulo: 'Duração',
      tipo: 'select',
      obrigatorio: true,
      largura: 'terco',
      opcoes: [15, 30, 45, 60, 90].map((m) => ({ valor: String(m), texto: `${m} min` })),
    },
    { nome: 'motivo', rotulo: 'Motivo da consulta', tipo: 'area', largura: 'inteira' },
  ]);
  void ligarClienteAnimal(form, 'cliente_id', 'animal_id', item?.cliente_id).then(() => {
    if (item) form.definirValores({ animal_id: item.animal_id });
  });
  void opcoesVeterinarios().then((ops) => {
    form.definirOpcoes('veterinario_id', ops);
    if (item) form.definirValores({ veterinario_id: item.veterinario_id });
  });
  form.definirValores({ duracao_min: item ? String(item.duracao_min) : '30' });
  if (item) {
    // na edição, mostra data e hora de são paulo
    form.definirValores({
      data: diaEmSaoPaulo(item.inicio),
      hora: horaLocal(item.inicio),
      motivo: item.motivo ?? '',
    });
  }

  let salvando = false;
  const botao = criarBotao({ texto: 'Salvar', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: item ? 'Editar agendamento' : 'Novo agendamento',
    largo: true,
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });

  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const dados = {
      animal_id: v['animal_id'],
      veterinario_id: v['veterinario_id'],
      // junta data + hora (são paulo) e converte pra utc
      inicio: saoPauloParaUtc(v['data'] ?? '', v['hora']),
      duracao_min: Number(v['duracao_min']),
      motivo: opcional(v['motivo']),
    };
    const r = await api.invoke(item ? 'agendamentos:atualizar' : 'agendamentos:criar', item ? { id: item.id, ...dados } : dados);
    salvando = false;
    botao.disabled = false;
    if (!r.ok) {
      // conflito de horário: erro embaixo do campo de horário
      if (r.erro.codigo === 'AGENDA_CONFLITO') form.definirErro('hora', r.erro.mensagem);
      else mostrarToast('erro', r.erro.mensagem);
      return;
    }
    mostrarToast('sucesso', 'Agendamento salvo.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// tela da agenda (um dia por vez, com filtro de veterinário)
export function paginaAgenda(): HTMLElement {
  const perfil = perfilAtual();
  const podeEscrever = perfil === 'MASTER' || perfil === 'ATENDENTE';
  const estado = { dia: hojeISO(), veterinario: '' };

  const lista = el('div', 'agenda__lista');
  const titulo = el('h2', 'agenda__dia');
  const inputDia = el('input', 'input agenda__data', [], { type: 'date', 'aria-label': 'Escolher dia' });
  inputDia.value = estado.dia;

  const filtroVet = criarSelect([], { placeholder: 'Todos os veterinários' });
  filtroVet.setAttribute('aria-label', 'Filtrar por veterinário');
  filtroVet.classList.add('agenda__filtro');
  void opcoesVeterinarios().then((ops) => {
    for (const o of ops) filtroVet.append(el('option', '', [o.texto], { value: o.valor }));
  });
  filtroVet.addEventListener('change', () => {
    estado.veterinario = filtroVet.value;
    void carregar();
  });

  function irPara(dia: string): void {
    estado.dia = dia;
    inputDia.value = dia;
    void carregar();
  }
  inputDia.addEventListener('change', () => inputDia.value && irPara(inputDia.value));

  // busca os atendimentos do dia e desenha os cards
  async function carregar(): Promise<void> {
    titulo.textContent = textoDia(estado.dia);
    lista.replaceChildren(criarSpinner());
    const { inicio, fim } = limitesDoDia(estado.dia);
    const r = await api.invoke<Agendamento[]>('agendamentos:listar', { inicio, fim, veterinario_id: estado.veterinario || undefined });
    lista.replaceChildren();
    if (!r.ok) {
      lista.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar a agenda', descricao: r.erro.mensagem }));
      return;
    }
    if (r.dados.length === 0) {
      lista.append(
        criarEstadoVazio({
          icone: 'agenda',
          titulo: 'Nenhum atendimento neste dia',
          descricao: podeEscrever ? 'Use o botão "Novo agendamento" para marcar.' : undefined,
        }),
      );
      return;
    }
    for (const a of r.dados) lista.append(criarLinha(a));
  }

  // card de um atendimento (cancelado fica apagado)
  function criarLinha(a: Agendamento): HTMLElement {
    const cancelado = a.status === 'CANCELADO';
    const fim = new Date(new Date(a.inicio).getTime() + a.duracao_min * 60000).toISOString();
    const alteravel = podeEscrever && !cancelado && a.status !== 'REALIZADO';
    return el('article', `compromisso${cancelado ? ' compromisso--cancelado' : ''}`, [
      el('div', 'compromisso__hora', [el('strong', '', [horaLocal(a.inicio)]), el('span', '', [`até ${horaLocal(fim)}`])]),
      el('div', 'compromisso__corpo', [
        el('h3', 'compromisso__titulo', [`${a.animal_nome} — ${a.cliente_nome}`]),
        el('p', 'compromisso__detalhe', [criarIcone('usuario', 16), `${a.veterinario_nome}`, a.motivo ? ` · ${a.motivo}` : '']),
        el('div', 'compromisso__selos', [
          criarBadge(TEXTO_STATUS[a.status] ?? a.status, TOM_STATUS[a.status] ?? 'neutro'),
          // marcado offline: só vira definitivo quando o servidor confirmar
          a.confirmado ? null : criarBadge('Não confirmado até sincronizar', 'aviso'),
        ]),
      ]),
      alteravel
        ? el('div', 'acoes', [
            criarBotaoIcone('editar', 'Editar agendamento', () => abrirFormulario(a, estado.dia, () => void carregar())),
            criarBotaoIcone(
              'fechar',
              'Cancelar agendamento',
              () =>
                void confirmar({ titulo: 'Cancelar agendamento', mensagem: `Cancelar o atendimento de ${a.animal_nome} às ${horaLocal(a.inicio)}?`, textoConfirmar: 'Cancelar agendamento', textoCancelar: 'Voltar', perigo: true }).then(async (sim) => {
                  if (!sim) return;
                  const r = await api.invoke('agendamentos:cancelar', { id: a.id });
                  if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
                  mostrarToast('sucesso', 'Agendamento cancelado.');
                  void carregar();
                }),
              true,
            ),
          ])
        : null,
    ]);
  }

  const navegador = el('div', 'agenda__navegador', [
    criarBotaoIcone('anterior', 'Dia anterior', () => irPara(somarDias(estado.dia, -1))),
    inputDia,
    criarBotaoIcone('proxima', 'Próximo dia', () => irPara(somarDias(estado.dia, 1))),
    criarBotao({ texto: 'Hoje', variante: 'secundario', onClick: () => irPara(hojeISO()) }),
    perfil === 'VETERINARIO' ? null : filtroVet,
  ]);

  const raiz = el('section', 'pagina', [
    criarCabecalhoPagina({
      titulo: 'Agenda',
      subtitulo: perfil === 'VETERINARIO' ? 'Seus atendimentos do dia.' : 'Atendimentos agendados por dia e veterinário.',
      acoes: podeEscrever ? [criarBotao({ texto: 'Novo agendamento', icone: 'mais', onClick: () => abrirFormulario(undefined, estado.dia, () => void carregar()) })] : [],
    }),
    navegador,
    titulo,
    lista,
  ]);
  void carregar();
  return raiz;
}
