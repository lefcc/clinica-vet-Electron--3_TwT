/**
 * Mocks em memória para a Trilha 2 (Núcleo Clínico)
 * Permite testar as telas de Clientes, Animais, Agenda e Consultas sem backend real.
 *
 * Canais cobertos:
 * - clientes:listar|obter|criar|atualizar|inativar
 * - animais:listar|obter|criar|atualizar|inativar|listar_por_cliente
 * - agendamentos:listar|criar|atualizar|cancelar|veterinarios
 * - consultas:listar|obter|criar|historico_animal
 *
 * Simula: paginação, idade_texto, CPF_DUPLICADO, CLIENTE_POSSUI_ANIMAIS_ATIVOS,
 * AGENDA_CONFLITO, omissão de diagnostico para ATENDENTE.
 */

import type {
  Cliente,
  Animal,
  Agendamento,
  Consulta,
  Prescricao,
  Pagina,
  EntradaListagem,
  Perfil,
} from '../tipos.js';

// ============================================================================
// DADOS INICIAIS (SEED)
// ============================================================================

const SEED_CLIENTES: Cliente[] = [
  {
    id: 'cli-1',
    nome: 'João Silva',
    cpf: '12345678901',
    telefone: '19999998888',
    email: 'joao@email.com',
    cep: '13010000',
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'Campinas',
    uf: 'SP',
    ativo: true,
  },
  {
    id: 'cli-2',
    nome: 'Maria Santos',
    cpf: '98765432109',
    telefone: '19988887777',
    email: 'maria@email.com',
    cep: '13020000',
    logradouro: 'Av. Brasil',
    numero: '456',
    complemento: '',
    bairro: 'Cambuí',
    cidade: 'Campinas',
    uf: 'SP',
    ativo: true,
  },
  {
    id: 'cli-3',
    nome: 'Carlos Oliveira',
    cpf: '11122233344',
    telefone: '19977776666',
    email: 'carlos@email.com',
    cep: '13030000',
    logradouro: 'Rua A',
    numero: '789',
    complemento: '',
    bairro: 'Jardim',
    cidade: 'Campinas',
    uf: 'SP',
    ativo: false,
  },
];

const SEED_ANIMAIS: Animal[] = [
  {
    id: 'ani-1',
    cliente_id: 'cli-1',
    cliente_nome: 'João Silva',
    nome: 'Rex',
    especie: 'Cachorro',
    raca: 'Labrador',
    sexo: 'M',
    data_nascimento: '2021-03-15',
    peso_kg: 28.5,
    observacoes: 'Vacinas em dia',
    idade_texto: '',
    ativo: true,
  },
  {
    id: 'ani-2',
    cliente_id: 'cli-1',
    cliente_nome: 'João Silva',
    nome: 'Mimi',
    especie: 'Gato',
    raca: 'Siamês',
    sexo: 'F',
    data_nascimento: '2022-08-20',
    peso_kg: 4.2,
    observacoes: 'Alergia a antibiótico X',
    idade_texto: '',
    ativo: true,
  },
  {
    id: 'ani-3',
    cliente_id: 'cli-2',
    cliente_nome: 'Maria Santos',
    nome: 'Thor',
    especie: 'Cachorro',
    raca: 'Golden Retriever',
    sexo: 'M',
    data_nascimento: '2020-01-10',
    peso_kg: 32.0,
    observacoes: '',
    idade_texto: '',
    ativo: true,
  },
  {
    id: 'ani-4',
    cliente_id: 'cli-2',
    cliente_nome: 'Maria Santos',
    nome: 'Luna',
    especie: 'Gato',
    raca: 'Persa',
    sexo: 'F',
    data_nascimento: '2023-05-12',
    peso_kg: 3.8,
    observacoes: '',
    idade_texto: '',
    ativo: false,
  },
];

const SEED_VETERINARIOS = [
  { id: 'vet-1', nome: 'Dra. Ana Paula', perfil: 'VETERINARIO' as Perfil, ativo: true },
  { id: 'vet-2', nome: 'Dr. Bruno Costa', perfil: 'VETERINARIO' as Perfil, ativo: true },
  { id: 'vet-3', nome: 'Dra. Carla Mendes', perfil: 'VETERINARIO' as Perfil, ativo: false },
];

const SEED_AGENDAMENTOS: Agendamento[] = [
  {
    id: 'age-1',
    cliente_id: 'cli-1',
    animal_id: 'ani-1',
    animal_nome: 'Rex',
    cliente_nome: 'João Silva',
    veterinario_id: 'vet-1',
    veterinario_nome: 'Dra. Ana Paula',
    inicio: '2026-11-25T13:00:00.000Z', // 10:00 São Paulo
    duracao_min: 30,
    motivo: 'Consulta de rotina',
    status: 'AGENDADO',
    confirmado: true,
  },
  {
    id: 'age-2',
    cliente_id: 'cli-2',
    animal_id: 'ani-3',
    animal_nome: 'Thor',
    cliente_nome: 'Maria Santos',
    veterinario_id: 'vet-1',
    veterinario_nome: 'Dra. Ana Paula',
    inicio: '2026-11-25T14:30:00.000Z', // 11:30 São Paulo
    duracao_min: 45,
    motivo: 'Vacinação',
    status: 'CONFIRMADO',
    confirmado: true,
  },
  {
    id: 'age-3',
    cliente_id: 'cli-1',
    animal_id: 'ani-2',
    animal_nome: 'Mimi',
    cliente_nome: 'João Silva',
    veterinario_id: 'vet-2',
    veterinario_nome: 'Dr. Bruno Costa',
    inicio: '2026-11-25T16:00:00.000Z', // 13:00 São Paulo
    duracao_min: 30,
    motivo: 'Retorno',
    status: 'AGENDADO',
    confirmado: false, // offline
  },
];

const SEED_CONSULTAS: Consulta[] = [
  {
    id: 'con-1',
    animal_id: 'ani-1',
    animal_nome: 'Rex',
    cliente_nome: 'João Silva',
    veterinario_nome: 'Dra. Ana Paula',
    data: '2026-11-20T13:00:00.000Z',
    anamnese: 'Animal apresenta letargia e falta de apetite há 2 dias.',
    diagnostico: 'Gastrite aguda',
    observacoes: 'Retorno em 7 dias',
    prescricoes: [
      { medicamento_id: 'med-1', medicamento_nome: 'Omeprazol 20mg', quantidade: 14, posologia: '1 comprimido a cada 24h' },
      { medicamento_id: 'med-2', medicamento_nome: 'Sucralfato 1g', quantidade: 20, posologia: '1 comprimido a cada 12h' },
    ],
  },
  {
    id: 'con-2',
    animal_id: 'ani-3',
    animal_nome: 'Thor',
    cliente_nome: 'Maria Santos',
    veterinario_nome: 'Dr. Bruno Costa',
    data: '2026-11-18T15:30:00.000Z',
    anamnese: 'Check-up anual, vacinas em dia.',
    diagnostico: 'Saudável',
    observacoes: '',
    prescricoes: [],
  },
];

// ============================================================================
// ESTADO MUTÁVEL (SIMULA BANCO EM MEMÓRIA)
// ============================================================================

let clientes = [...SEED_CLIENTES.map(c => ({ ...c }))];
let animais = [...SEED_ANIMAIS.map(a => ({ ...a }))];
let agendamentos = [...SEED_AGENDAMENTOS.map(a => ({ ...a }))];
let consultas = [...SEED_CONSULTAS.map(c => ({ ...c }))];

// Sessão mockada (pode ser alterada para testar perfis diferentes)
let sessaoAtual: { usuarioId: string; nome: string; perfil: Perfil; expiraEm: number } = {
  usuarioId: 'user-1',
  nome: 'João Silva',
  perfil: 'MASTER',
  expiraEm: Date.now() + 8 * 60 * 60 * 1000,
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function agoraUtc(): string {
  return new Date().toISOString();
}

function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function buscarCaseInsensitive<T extends Record<string, unknown>>(array: T[], campos: string[], termo: string): T[] {
  const t = normalizarBusca(termo);
  return array.filter(item => campos.some(campo => {
    const valor = item[campo];
    return valor && normalizarBusca(String(valor)).includes(t);
  }));
}

// Versão tipada para arrays de objetos (usada no mock) - usa unknown para evitar problemas de index signature
function buscarCaseInsensitiveTipado<T>(array: T[], campos: string[], termo: string): T[] {
  const t = normalizarBusca(termo);
  return array.filter(item => {
    const obj = item as Record<string, unknown>;
    return campos.some(campo => {
      const valor = obj[campo];
      return valor && normalizarBusca(String(valor)).includes(t);
    });
  });
}

function paginar<T>(itens: T[], entrada: EntradaListagem): Pagina<T> {
  const pagina = Math.max(1, entrada.pagina || 1);
  const tamanho = Math.min(200, Math.max(1, entrada.tamanho || 10));
  const inicio = (pagina - 1) * tamanho;
  const fim = inicio + tamanho;
  return {
    itens: itens.slice(inicio, fim),
    total: itens.length,
    pagina,
    tamanho,
  };
}

function calcularIdadeTexto(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  const nascimento = new Date(dataNascimento + 'T00:00:00');
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
    anos--;
    meses += 12;
  }
  if (anos > 0 && meses > 0) return `${anos} ano${anos > 1 ? 's' : ''} e ${meses} mês${meses > 1 ? 'es' : ''}`;
  if (anos > 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
  if (meses > 0) return `${meses} mês${meses > 1 ? 'es' : ''}`;
  const diffDias = Math.floor((hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffDias} dia${diffDias !== 1 ? 's' : ''}`;
}

function enriquecerAnimal(animal: Animal): Animal {
  const cliente = clientes.find(c => c.id === animal.cliente_id);
  return {
    ...animal,
    cliente_nome: cliente?.nome,
    idade_texto: calcularIdadeTexto(animal.data_nascimento),
  };
}

function enriquecerAgendamento(ag: Agendamento): Agendamento {
  const animal = animais.find(a => a.id === ag.animal_id);
  const cliente = clientes.find(c => c.id === ag.cliente_id);
  const vet = SEED_VETERINARIOS.find(v => v.id === ag.veterinario_id);
  return {
    ...ag,
    animal_nome: animal?.nome || '',
    cliente_nome: cliente?.nome || '',
    veterinario_nome: vet?.nome || '',
  };
}

function enriquecerConsulta(con: Consulta): Consulta {
  const animal = animais.find(a => a.id === con.animal_id);
  const cliente = animal ? clientes.find(c => c.id === animal.cliente_id) : undefined;
  return {
    ...con,
    animal_nome: animal?.nome || '',
    cliente_nome: cliente?.nome || '',
  };
}

function cpfExiste(cpf: string, ignorarId?: string): boolean {
  return clientes.some(c => c.cpf === cpf && c.ativo && c.id !== ignorarId);
}

function clienteTemAnimaisAtivos(clienteId: string): boolean {
  return animais.some(a => a.cliente_id === clienteId && a.ativo);
}

function verificarConflitoAgenda(veterinarioId: string, inicio: string, duracaoMin: number, ignorarId?: string): boolean {
  const inicioDt = new Date(inicio);
  const fimDt = new Date(inicioDt.getTime() + duracaoMin * 60000);
  return agendamentos.some(a => {
    if (a.id === ignorarId) return false;
    if (a.veterinario_id !== veterinarioId) return false;
    if (a.status === 'CANCELADO') return false;
    const aInicio = new Date(a.inicio);
    const aFim = new Date(aInicio.getTime() + a.duracao_min * 60000);
    return inicioDt < aFim && fimDt > aInicio; // sobreposição
  });
}

function formatoRespostaErro(codigo: string, mensagem: string) {
  return { ok: false as const, erro: { codigo, mensagem } };
}

// ============================================================================
// HANDLERS MOCKADOS
// ============================================================================

// ---------- CLIENTES ----------
async function clientesListar(entrada: EntradaListagem): Promise<Pagina<Cliente>> {
  let lista = clientes.filter(c => c.ativo);
  if (entrada.busca) {
    lista = buscarCaseInsensitive(lista, ['nome', 'cpf', 'telefone'], entrada.busca);
  }
  return paginar(lista, entrada);
}

async function clientesObter({ id }: { id: string }): Promise<Cliente> {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) throw new Error('Cliente não encontrado');
  return cliente;
}

async function clientesCriar(dados: Omit<Cliente, 'id' | 'ativo'> & { id?: string }): Promise<Cliente> {
  if (cpfExiste(dados.cpf)) {
    throw formatoRespostaErro('CPF_DUPLICADO', 'Já existe um cliente com este CPF.');
  }
  const novo: Cliente = {
    id: dados.id || gerarId('cli'),
    ...dados,
    ativo: true,
  };
  clientes.push(novo);
  return novo;
}

async function clientesAtualizar(dados: Partial<Cliente> & { id: string }): Promise<Cliente> {
  const idx = clientes.findIndex(c => c.id === dados.id);
  if (idx === -1) throw new Error('Cliente não encontrado');
  if (dados.cpf && cpfExiste(dados.cpf, dados.id)) {
    throw formatoRespostaErro('CPF_DUPLICADO', 'Já existe um cliente com este CPF.');
  }
  clientes[idx] = { ...clientes[idx], ...dados };
  return clientes[idx];
}

async function clientesInativar({ id }: { id: string }): Promise<void> {
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Cliente não encontrado');
  if (clienteTemAnimaisAtivos(id)) {
    throw formatoRespostaErro('CLIENTE_POSSUI_ANIMAIS_ATIVOS', 'Não é possível inativar: o cliente possui animais ativos.');
  }
  clientes[idx].ativo = false;
}

// ---------- ANIMAIS ----------
async function animaisListar(entrada: EntradaListagem): Promise<Pagina<Animal>> {
  let lista = animais.filter(a => a.ativo).map(enriquecerAnimal);
  if (entrada.busca) {
    lista = buscarCaseInsensitiveTipado(lista, ['nome', 'especie', 'raca', 'cliente_nome'], entrada.busca);
  }
  return paginar(lista, entrada);
}

async function animaisObter({ id }: { id: string }): Promise<Animal> {
  const animal = animais.find(a => a.id === id);
  if (!animal) throw new Error('Animal não encontrado');
  return enriquecerAnimal(animal);
}

async function animaisListarPorCliente({ cliente_id }: { cliente_id: string }): Promise<Animal[]> {
  return animais
    .filter(a => a.cliente_id === cliente_id && a.ativo)
    .map(enriquecerAnimal);
}

async function animaisCriar(dados: Omit<Animal, 'id' | 'ativo' | 'idade_texto' | 'cliente_nome'> & { id?: string }): Promise<Animal> {
  const novo: Animal = {
    id: dados.id || gerarId('ani'),
    ...dados,
    ativo: true,
    idade_texto: '',
    cliente_nome: '',
  };
  animais.push(novo);
  return enriquecerAnimal(novo);
}

async function animaisAtualizar(dados: Partial<Animal> & { id: string }): Promise<Animal> {
  const idx = animais.findIndex(a => a.id === dados.id);
  if (idx === -1) throw new Error('Animal não encontrado');
  animais[idx] = { ...animais[idx], ...dados };
  return enriquecerAnimal(animais[idx]);
}

async function animaisInativar({ id }: { id: string }): Promise<void> {
  const idx = animais.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Animal não encontrado');
  animais[idx].ativo = false;
}

// ---------- AGENDAMENTOS ----------
async function agendamentosListar({
  inicio,
  fim,
  veterinario_id,
}: { inicio: string; fim: string; veterinario_id?: string }): Promise<Agendamento[]> {
  const ini = new Date(inicio);
  const fm = new Date(fim);
  let lista = agendamentos.filter(a => {
    const aIni = new Date(a.inicio);
    return aIni >= ini && aIni <= fm && a.status !== 'CANCELADO';
  });
  if (veterinario_id) {
    lista = lista.filter(a => a.veterinario_id === veterinario_id);
  }
  return lista.map(enriquecerAgendamento).sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
}

async function agendamentosVeterinarios(): Promise<{ id: string; nome: string }[]> {
  return SEED_VETERINARIOS.filter(v => v.ativo).map(v => ({ id: v.id, nome: v.nome }));
}

async function agendamentosCriar(dados: Omit<Agendamento, 'id' | 'animal_nome' | 'cliente_nome' | 'veterinario_nome' | 'confirmado' | 'status'> & { id?: string }): Promise<Agendamento> {
  if (verificarConflitoAgenda(dados.veterinario_id, dados.inicio, dados.duracao_min)) {
    throw formatoRespostaErro('AGENDA_CONFLITO', 'Já existe um atendimento para este veterinário neste horário.');
  }
  const novo: Agendamento = {
    id: dados.id || gerarId('age'),
    ...dados,
    status: 'AGENDADO',
    confirmado: false, // offline: não confirmado até sincronizar
    animal_nome: '',
    cliente_nome: '',
    veterinario_nome: '',
  };
  agendamentos.push(novo);
  return enriquecerAgendamento(novo);
}

async function agendamentosAtualizar(dados: Partial<Agendamento> & { id: string }): Promise<Agendamento> {
  const idx = agendamentos.findIndex(a => a.id === dados.id);
  if (idx === -1) throw new Error('Agendamento não encontrado');
  // Verifica conflito se mudou veterinário ou horário
  const vetId = dados.veterinario_id || agendamentos[idx].veterinario_id;
  const inicio = dados.inicio || agendamentos[idx].inicio;
  const duracao = dados.duracao_min || agendamentos[idx].duracao_min;
  if (verificarConflitoAgenda(vetId, inicio, duracao, dados.id)) {
    throw formatoRespostaErro('AGENDA_CONFLITO', 'Já existe um atendimento para este veterinário neste horário.');
  }
  agendamentos[idx] = { ...agendamentos[idx], ...dados };
  return enriquecerAgendamento(agendamentos[idx]);
}

async function agendamentosCancelar({ id }: { id: string }): Promise<void> {
  const idx = agendamentos.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agendamento não encontrado');
  agendamentos[idx].status = 'CANCELADO';
}

// ---------- CONSULTAS ----------
function filtrarDiagnosticoParaPerfil(consulta: Consulta, perfil: Perfil): Consulta {
  if (perfil === 'ATENDENTE') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { diagnostico: _diagnostico, ...resto } = consulta;
    return { ...resto, diagnostico: undefined };
  }
  return consulta;
}

async function consultasListar(entrada: EntradaListagem): Promise<Pagina<Consulta>> {
  let lista = consultas.map(c => enriquecerConsulta(c));
  if (entrada.busca) {
    lista = buscarCaseInsensitiveTipado(lista, ['animal_nome', 'cliente_nome', 'veterinario_nome', 'anamnese'], entrada.busca);
  }
  // Ordenar por data decrescente (mais recente primeiro)
  lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  // Aplicar filtro de perfil ANTES de paginar
  const perfil = sessaoAtual.perfil;
  const listaFiltrada = lista.map(c => filtrarDiagnosticoParaPerfil(c, perfil));
  return paginar(listaFiltrada, entrada);
}

async function consultasObter({ id }: { id: string }): Promise<Consulta> {
  const consulta = consultas.find(c => c.id === id);
  if (!consulta) throw new Error('Consulta não encontrada');
  const enriquecida = enriquecerConsulta(consulta);
  return filtrarDiagnosticoParaPerfil(enriquecida, sessaoAtual.perfil);
}

async function consultasHistoricoAnimal({ animal_id }: { animal_id: string }): Promise<Consulta[]> {
  const lista = consultas
    .filter(c => c.animal_id === animal_id)
    .map(enriquecerConsulta)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return lista.map(c => filtrarDiagnosticoParaPerfil(c, sessaoAtual.perfil));
}

async function consultasCriar(dados: {
  animal_id: string;
  anamnese: string;
  diagnostico?: string;
  observacoes?: string;
  prescricoes: Prescricao[];
}): Promise<Consulta> {
  const animal = animais.find(a => a.id === dados.animal_id);
  if (!animal) throw new Error('Animal não encontrado');
  const cliente = clientes.find(c => c.id === animal.cliente_id);
  if (!cliente) throw new Error('Cliente do animal não encontrado');

  const nova: Consulta = {
    id: gerarId('con'),
    animal_id: dados.animal_id,
    animal_nome: animal.nome,
    cliente_nome: cliente.nome,
    veterinario_nome: sessaoAtual.nome,
    data: agoraUtc(),
    anamnese: dados.anamnese,
    diagnostico: dados.diagnostico,
    observacoes: dados.observacoes,
    prescricoes: dados.prescricoes.map(p => ({
      ...p,
      medicamento_nome: p.medicamento_nome || 'Medicamento',
    })),
  };
  consultas.push(nova);
  // NOTA: baixa de estoque FEFO seria feita aqui no backend real
  // No mock apenas registramos a consulta
  return filtrarDiagnosticoParaPerfil(nova, sessaoAtual.perfil);
}

// ============================================================================
// MAPA DE HANDLERS EXPORTADO
// ============================================================================

/**
 * Mapa de handlers mockados para a Trilha 2.
 * Uso no front-end (enquanto backend não existe):
 *
 * import { trilha2Mock } from '../lib/mocks/trilha2.mock.js';
 *
 * // No api.ts ou onde faz a chamada:
 * const handler = trilha2Mock['clientes:listar'];
 * if (handler) return handler({ pagina: 1, tamanho: 10, busca: '' });
 */
// Tipagem mais flexível para permitir handlers com parâmetros específicos
type MockHandler = (entrada: unknown) => Promise<unknown>;
export const trilha2Mock: Record<string, MockHandler> = {
  // Clientes
  'clientes:listar': clientesListar as MockHandler,
  'clientes:obter': clientesObter as MockHandler,
  'clientes:criar': clientesCriar as MockHandler,
  'clientes:atualizar': clientesAtualizar as MockHandler,
  'clientes:inativar': clientesInativar as MockHandler,

  // Animais
  'animais:listar': animaisListar as MockHandler,
  'animais:obter': animaisObter as MockHandler,
  'animais:criar': animaisCriar as MockHandler,
  'animais:atualizar': animaisAtualizar as MockHandler,
  'animais:inativar': animaisInativar as MockHandler,
  'animais:listar_por_cliente': animaisListarPorCliente as MockHandler,

  // Agendamentos
  'agendamentos:listar': agendamentosListar as MockHandler,
  'agendamentos:criar': agendamentosCriar as MockHandler,
  'agendamentos:atualizar': agendamentosAtualizar as MockHandler,
  'agendamentos:cancelar': agendamentosCancelar as MockHandler,
  'agendamentos:veterinarios': agendamentosVeterinarios as MockHandler,

  // Consultas
  'consultas:listar': consultasListar as MockHandler,
  'consultas:obter': consultasObter as MockHandler,
  'consultas:criar': consultasCriar as MockHandler,
  'consultas:historico_animal': consultasHistoricoAnimal as MockHandler,
};

// ============================================================================
// FUNÇÕES AUXILIARES PARA TESTES MANUAIS / DEBUG
// ============================================================================

/** Permite trocar o perfil da sessão mockada para testar permissões */
export function setMockPerfil(perfil: Perfil): void {
  sessaoAtual.perfil = perfil;
}

/** Permite trocar o usuário da sessão mockada */
export function setMockUsuario(usuario: { usuarioId: string; nome: string; perfil: Perfil }): void {
  sessaoAtual = { ...sessaoAtual, ...usuario };
}

/** Reseta todos os dados para o seed inicial */
export function resetMockData(): void {
  clientes = [...SEED_CLIENTES.map(c => ({ ...c }))];
  animais = [...SEED_ANIMAIS.map(a => ({ ...a }))];
  agendamentos = [...SEED_AGENDAMENTOS.map(a => ({ ...a }))];
  consultas = [...SEED_CONSULTAS.map(c => ({ ...c }))];
}

/** Retorna snapshot atual dos dados (útil para debug) */
export function getMockState() {
  return {
    clientes: [...clientes],
    animais: [...animais],
    agendamentos: [...agendamentos],
    consultas: [...consultas],
    sessao: { ...sessaoAtual },
  };
}