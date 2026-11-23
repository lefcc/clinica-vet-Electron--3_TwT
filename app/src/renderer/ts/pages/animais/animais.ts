import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarDataHora } from '../../lib/formatadores.js';
import type { Animal, Consulta } from '../../lib/tipos.js';
import { abrirModal, criarBadge, criarBotao, criarBotaoIcone, criarEstadoVazio, criarSpinner, type DefCampo } from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { opcoesClientes } from '../comum/seletores.js';
import { ESPECIES, numeroOpcional, opcional } from '../comum/util.js';

/** prontuário do animal em timeline */
export async function abrirHistoricoAnimal(animal: Pick<Animal, 'id' | 'nome'>): Promise<void> {
  const corpo = el('div', 'timeline', [criarSpinner()]);
  const modal = abrirModal({
    titulo: `Histórico de ${animal.nome}`,
    largo: true,
    conteudo: corpo,
    acoes: [criarBotao({ texto: 'Fechar', variante: 'secundario', onClick: () => modal.fechar() })],
  });
  const r = await api.invoke<Consulta[]>('consultas:historico_animal', { animal_id: animal.id });
  corpo.replaceChildren();
  if (!r.ok) {
    corpo.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar', descricao: r.erro.mensagem }));
    return;
  }
  if (r.dados.length === 0) {
    corpo.append(criarEstadoVazio({ icone: 'historico', titulo: 'Sem consultas registradas', descricao: 'As consultas deste animal aparecerão aqui.' }));
    return;
  }
  for (const c of r.dados) {
    corpo.append(
      el('article', 'timeline__item', [
        el('div', 'timeline__ponto'),
        el('div', 'timeline__conteudo', [
          el('header', 'timeline__cabecalho', [el('strong', '', [formatarDataHora(c.data)]), el('span', 'timeline__vet', [c.veterinario_nome])]),
          c.anamnese ? el('p', '', [el('strong', '', ['Anamnese: ']), c.anamnese]) : null,
          c.diagnostico ? el('p', '', [el('strong', '', ['Diagnóstico: ']), c.diagnostico]) : null,
          c.observacoes ? el('p', '', [el('strong', '', ['Observações: ']), c.observacoes]) : null,
          c.prescricoes.length ? el('div', 'timeline__prescricoes', c.prescricoes.map((p) => criarBadge(`${p.medicamento_nome ?? 'Medicamento'} × ${p.quantidade}`, 'info'))) : null,
        ]),
      ]),
    );
  }
}

// campos do form de animal
const CAMPOS_ANIMAL: DefCampo[] = [
  { nome: 'cliente_id', rotulo: 'Tutor (cliente)', tipo: 'select', obrigatorio: true, largura: 'inteira' },
  { nome: 'nome', rotulo: 'Nome do animal', obrigatorio: true },
  { nome: 'especie', rotulo: 'Espécie', tipo: 'select', opcoes: ESPECIES, obrigatorio: true },
  { nome: 'raca', rotulo: 'Raça' },
  {
    nome: 'sexo',
    rotulo: 'Sexo',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      { valor: 'M', texto: 'Macho' },
      { valor: 'F', texto: 'Fêmea' },
    ],
  },
  { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'data', dica: 'A idade é calculada automaticamente.' },
  { nome: 'peso_kg', rotulo: 'Peso (kg)', tipo: 'numero', passo: '0.01', min: 0.01 },
  { nome: 'observacoes', rotulo: 'Observações', tipo: 'area', largura: 'inteira' },
];

// cadastro de animais (mesmas permissões dos clientes)
const CONFIG_ANIMAIS: ConfigCrud<Animal> = {
  canal: 'animais',
  titulo: 'Animais',
  subtitulo: 'Pacientes da clínica. Cada animal pertence a um cliente.',
  singular: 'animal',
  textoNovo: 'Novo animal',
  textoBusca: 'Buscar por nome, espécie, raça ou tutor...',
  podeEscrever: (p) => p === 'MASTER' || p === 'ATENDENTE',
  nomeDoItem: (a) => a.nome,
  colunas: [
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'cliente_nome', titulo: 'Tutor', render: (a) => (a.cliente_nome ? el('a', 'link-forte', [a.cliente_nome], { href: `#/clientes/${a.cliente_id}` }) : '—') },
    { chave: 'especie', titulo: 'Espécie / raça', render: (a) => [a.especie, a.raca].filter(Boolean).join(' · ') },
    { chave: 'sexo', titulo: 'Sexo', render: (a) => criarBadge(a.sexo === 'M' ? 'Macho' : 'Fêmea') },
    { chave: 'idade_texto', titulo: 'Idade', render: (a) => a.idade_texto ?? '—' },
    { chave: 'peso_kg', titulo: 'Peso', render: (a) => (a.peso_kg ? `${String(a.peso_kg).replace('.', ',')} kg` : '—') },
  ],
  campos: CAMPOS_ANIMAL,
  // carrega os clientes no campo "tutor"
  aoPrepararFormulario: async (form, animal) => {
    form.definirOpcoes('cliente_id', await opcoesClientes());
    if (animal) form.definirValores({ cliente_id: animal.cliente_id });
  },
  paraFormulario: (a) => ({
    cliente_id: a.cliente_id,
    nome: a.nome,
    especie: a.especie,
    raca: a.raca ?? '',
    sexo: a.sexo,
    data_nascimento: a.data_nascimento ?? '',
    peso_kg: a.peso_kg !== undefined ? String(a.peso_kg) : '',
    observacoes: a.observacoes ?? '',
  }),
  paraEnvio: (v) => ({
    cliente_id: v['cliente_id'],
    nome: v['nome'],
    especie: v['especie'],
    raca: opcional(v['raca']),
    sexo: v['sexo'],
    data_nascimento: opcional(v['data_nascimento']),
    peso_kg: numeroOpcional(v['peso_kg']),
    observacoes: opcional(v['observacoes']),
  }),
  // botão extra: histórico clínico
  acoesExtras: (animal) => [criarBotaoIcone('historico', 'Ver histórico clínico', () => void abrirHistoricoAnimal(animal))],
};

export function paginaAnimais(): HTMLElement {
  return criarPaginaCrud(CONFIG_ANIMAIS);
}
