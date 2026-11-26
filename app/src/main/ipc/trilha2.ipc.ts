// Registro dos handlers IPC da Trilha 2 (Clientes, Animais, Agenda, Consultas)
import { registrarHandler } from './registry';
import { obterSessao } from './registry';
import type { Perfil } from '../modules/auth/tipos';
import { criarClienteRepository } from '../modules/clientes/clientes.repository';
import { ClienteService } from '../modules/clientes/clientes.service';
import { criarAnimalRepository } from '../modules/animais/animais.repository';
import { AnimalService } from '../modules/animais/animais.service';
import { criarAgendaRepository } from '../modules/agenda/agenda.repository';
import { AgendaService } from '../modules/agenda/agenda.service';
import { criarConsultasRepository } from '../modules/consultas/consultas.repository';
import { ConsultasService } from '../modules/consultas/consultas.service';
import type { EntradaListagem, Pagina, Cliente } from '../modules/clientes/clientes.repository';
import type { AnimalComCliente } from '../modules/animais/animais.repository';
import type { AgendamentoComRelacoes } from '../modules/agenda/agenda.repository';
import type { ConsultaComRelacoes } from '../modules/consultas/consultas.repository';

// Perfis permitidos por canal (baseado na matriz de permissões do AGENTS.md)
const PERFIS = {
  MASTER: ['MASTER'] as Perfil[],
  VETERINARIO: ['MASTER', 'VETERINARIO'] as Perfil[],
  ATENDENTE: ['MASTER', 'ATENDENTE'] as Perfil[],
  MASTER_VET: ['MASTER', 'VETERINARIO'] as Perfil[],
  MASTER_ATENDENTE: ['MASTER', 'ATENDENTE'] as Perfil[],
  TODOS: ['MASTER', 'VETERINARIO', 'ATENDENTE'] as Perfil[],
};

export function registrarTrilha2Ipc(): void {
  // ============================================================================
  // CLIENTES
  // ============================================================================
  const clienteRepo = criarClienteRepository();
  const clienteService = new ClienteService(clienteRepo);

  registrarHandler<EntradaListagem, Pagina<Cliente>>('clientes:listar', PERFIS.TODOS, async (_evt, dados) => clienteService.listar(dados));
  registrarHandler<{ id: string }, Cliente>('clientes:obter', PERFIS.TODOS, async (_evt, dados) => clienteService.obter(dados.id));
  registrarHandler<unknown, Cliente>('clientes:criar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => clienteService.criar(dados));
  registrarHandler<unknown, Cliente>('clientes:atualizar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => clienteService.atualizar(dados));
  registrarHandler<{ id: string }, void>('clientes:inativar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => clienteService.inativar(dados.id));

  // ============================================================================
  // ANIMAIS
  // ============================================================================
  const animalRepo = criarAnimalRepository();
  const animalService = new AnimalService(animalRepo);

  registrarHandler<EntradaListagem, Pagina<AnimalComCliente>>('animais:listar', PERFIS.TODOS, async (_evt, dados) => animalService.listar(dados));
  registrarHandler<{ id: string }, AnimalComCliente>('animais:obter', PERFIS.TODOS, async (_evt, dados) => animalService.obter(dados.id));
  registrarHandler<{ cliente_id: string }, AnimalComCliente[]>('animais:listar_por_cliente', PERFIS.TODOS, async (_evt, dados) => animalService.listarPorCliente(dados));
  registrarHandler<unknown, AnimalComCliente>('animais:criar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => animalService.criar(dados));
  registrarHandler<unknown, AnimalComCliente>('animais:atualizar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => animalService.atualizar(dados));
  registrarHandler<{ id: string }, void>('animais:inativar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => animalService.inativar(dados.id));

  // ============================================================================
  // AGENDA
  // ============================================================================
  const agendaRepo = criarAgendaRepository();

  // Factory para criar service com sessão atual
  const criarAgendaService = () => new AgendaService(agendaRepo, obterSessao());

  registrarHandler<{ inicio: string; fim: string; veterinario_id?: string }, AgendamentoComRelacoes[]>('agendamentos:listar', PERFIS.TODOS, async (_evt, dados) => criarAgendaService().listar(dados));
  registrarHandler<{ id: string }, AgendamentoComRelacoes>('agendamentos:obter', PERFIS.TODOS, async (_evt, dados) => criarAgendaService().obter(dados.id));
  registrarHandler<unknown, AgendamentoComRelacoes>('agendamentos:criar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => criarAgendaService().criar(dados));
  registrarHandler<unknown, AgendamentoComRelacoes>('agendamentos:atualizar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => criarAgendaService().atualizar(dados));
  registrarHandler<{ id: string }, void>('agendamentos:cancelar', PERFIS.MASTER_ATENDENTE, async (_evt, dados) => criarAgendaService().cancelar(dados));
  registrarHandler<Record<string, never>, { id: string; nome: string; crmv: string | null }[]>('agendamentos:veterinarios', PERFIS.TODOS, async (_evt, dados) => criarAgendaService().listarVeterinarios(dados));

  // ============================================================================
  // CONSULTAS
  // ============================================================================
  const consultasRepo = criarConsultasRepository();

  const criarConsultasService = () => new ConsultasService(consultasRepo, obterSessao());

  registrarHandler<EntradaListagem, { itens: ConsultaComRelacoes[]; total: number; pagina: number; tamanho: number }>('consultas:listar', PERFIS.TODOS, async (_evt, dados) => criarConsultasService().listar(dados));
  registrarHandler<{ id: string }, ConsultaComRelacoes>('consultas:obter', PERFIS.TODOS, async (_evt, dados) => criarConsultasService().obter(dados));
  registrarHandler<unknown, ConsultaComRelacoes>('consultas:criar', PERFIS.MASTER_VET, async (_evt, dados) => criarConsultasService().criar(dados));
  registrarHandler<{ animal_id: string }, ConsultaComRelacoes[]>('consultas:historico_animal', PERFIS.TODOS, async (_evt, dados) => criarConsultasService().historicoAnimal(dados));
}