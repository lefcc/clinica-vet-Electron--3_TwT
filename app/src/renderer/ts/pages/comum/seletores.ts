import { api } from '../../lib/api.js';
import type { Animal, Cliente, Medicamento, Pagina } from '../../lib/tipos.js';
import type { Formulario, OpcaoSelect } from '../../components/ui/index.js';

// TODO: traz até 200 itens; se a clínica crescer, usar autocomplete
const TAMANHO_SELETOR = 200;

export async function opcoesClientes(): Promise<OpcaoSelect[]> {
  const r = await api.invoke<Pagina<Cliente>>('clientes:listar', { pagina: 1, tamanho: TAMANHO_SELETOR });
  return r.ok ? r.dados.itens.map((c) => ({ valor: c.id, texto: c.nome })) : [];
}

export async function opcoesAnimaisDoCliente(clienteId: string): Promise<OpcaoSelect[]> {
  if (!clienteId) return [];
  const r = await api.invoke<Animal[]>('animais:listar_por_cliente', { cliente_id: clienteId });
  return r.ok ? r.dados.map((a) => ({ valor: a.id, texto: `${a.nome} (${a.especie})` })) : [];
}

export async function opcoesMedicamentos(): Promise<(OpcaoSelect & { unidade: string })[]> {
  const r = await api.invoke<Pagina<Medicamento>>('medicamentos:listar', { pagina: 1, tamanho: TAMANHO_SELETOR });
  return r.ok ? r.dados.itens.map((m) => ({ valor: m.id, texto: m.nome, unidade: m.unidade })) : [];
}

export async function opcoesVeterinarios(): Promise<OpcaoSelect[]> {
  const r = await api.invoke<{ id: string; nome: string }[]>('agendamentos:veterinarios');
  return r.ok ? r.dados.map((v) => ({ valor: v.id, texto: v.nome })) : [];
}

/** ao escolher o cliente, a lista de animais passa a ser dele */
export async function ligarClienteAnimal(form: Formulario, campoCliente: string, campoAnimal: string, clienteInicial?: string): Promise<void> {
  form.definirOpcoes(campoCliente, await opcoesClientes());
  const atualizar = async (clienteId: string, animalId?: string): Promise<void> => {
    form.definirOpcoes(campoAnimal, await opcoesAnimaisDoCliente(clienteId));
    if (animalId) form.definirValores({ [campoAnimal]: animalId });
  };
  form.controle(campoCliente).addEventListener('change', () => void atualizar(form.controle(campoCliente).value));
  if (clienteInicial) {
    form.definirValores({ [campoCliente]: clienteInicial });
    await atualizar(clienteInicial);
  }
}
