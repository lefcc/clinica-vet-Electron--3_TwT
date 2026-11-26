import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { ErroNegocio } from '../../erros/erro-negocio';
import { AgendaService } from './agenda.service';
import type { RepositorioAgendamentos, AgendamentoComRelacoes } from './agenda.repository';

// ============================================================================
// REPOSITÓRIO FALSO (EM MEMÓRIA) PARA TESTES
// ============================================================================

class RepositorioFalso implements RepositorioAgendamentos {
  agendamentos: AgendamentoComRelacoes[] = [];
  animais: { id: string; nome: string; ativo: boolean }[] = [];
  veterinarios: { id: string; nome: string; crmv: string | null; ativo: boolean; perfil: string }[] = [];

  listar(entrada: { inicio: number; fim: number; veterinario_id?: string }): AgendamentoComRelacoes[] {
    let lista = this.agendamentos.filter(
      (a) => a.ativo && a.inicio >= entrada.inicio && a.inicio < entrada.fim,
    );
    if (entrada.veterinario_id) {
      lista = lista.filter((a) => a.veterinario_id === entrada.veterinario_id);
    }
    return lista.sort((a, b) => a.inicio - b.inicio);
  }

  obter(id: string): AgendamentoComRelacoes | undefined {
    return this.agendamentos.find((a) => a.id === id);
  }

  listarVeterinarios(): { id: string; nome: string; crmv: string | null }[] {
    return this.veterinarios
      .filter((v) => v.ativo && v.perfil === 'VETERINARIO')
      .map((v) => ({ id: v.id, nome: v.nome, crmv: v.crmv }));
  }

  verificarAnimalExiste(animalId: string): boolean {
    return this.animais.some((a) => a.id === animalId && a.ativo);
  }

  verificarVeterinarioExiste(veterinarioId: string): boolean {
    return this.veterinarios.some((v) => v.id === veterinarioId && v.ativo && v.perfil === 'VETERINARIO');
  }

  verificarConflito(veterinarioId: string, inicio: number, fim: number, ignorarId?: string): boolean {
    return this.agendamentos.some(
      (a) =>
        a.veterinario_id === veterinarioId &&
        a.ativo &&
        a.status !== 'CANCELADO' &&
        a.id !== ignorarId &&
        a.inicio < fim &&
        a.inicio + a.duracao_min * 60 > inicio,
    );
  }

  criar(dados: Omit<AgendamentoComRelacoes, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): AgendamentoComRelacoes {
    const agora = Math.floor(Date.now() / 1000);
    const animal = this.animais.find((a) => a.id === dados.animalId);
    const vet = this.veterinarios.find((v) => v.id === dados.veterinarioId);
    const clienteId = dados.clienteId ?? null;

    const agendamento: AgendamentoComRelacoes = {
      id: randomUUID(),
      cliente_id: clienteId,
      animal_id: dados.animalId,
      animal_nome: animal?.nome || '—',
      cliente_nome: '—',
      veterinario_id: dados.veterinarioId,
      veterinario_nome: vet?.nome || '—',
      inicio: dados.inicio,
      duracao_min: dados.duracaoMin,
      motivo: dados.motivo ?? null,
      status: 'AGENDADO',
      confirmado: false,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.agendamentos.push(agendamento);
    return agendamento;
  }

  atualizar(id: string, dados: Partial<Omit<AgendamentoComRelacoes, 'id' | 'criadoEm'>>): AgendamentoComRelacoes {
    const idx = this.agendamentos.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Agendamento não encontrado');
    const agora = Math.floor(Date.now() / 1000);
    const existentes = this.agendamentos[idx];
    const novosDados: AgendamentoComRelacoes = { ...existentes, atualizadoEm: agora };
    const mapaCampos: Record<string, string> = {
      clienteId: 'cliente_id',
      animalId: 'animal_id',
      veterinarioId: 'veterinario_id',
      duracaoMin: 'duracao_min',
    };
    for (const [chave, valor] of Object.entries(dados)) {
      if (valor !== undefined && chave !== 'id' && chave !== 'criadoEm') {
        const coluna = mapaCampos[chave] || chave.replace(/([A-Z])/g, '_$1').toLowerCase();
        (novosDados as Record<string, unknown>)[coluna] = valor;
      }
    }
    this.agendamentos[idx] = novosDados;
    return novosDados;
  }

  cancelar(id: string): void {
    const idx = this.agendamentos.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Agendamento não encontrado');
    const agora = Math.floor(Date.now() / 1000);
    this.agendamentos[idx].status = 'CANCELADO';
    this.agendamentos[idx].ativo = false;
    this.agendamentos[idx].atualizadoEm = agora;
  }

  // Helpers para testes
  adicionarAgendamento(ag: AgendamentoComRelacoes): void {
    this.agendamentos.push(ag);
  }
  adicionarAnimal(animal: { id: string; nome: string; ativo: boolean }): void {
    this.animais.push(animal);
  }
  adicionarVeterinario(vet: { id: string; nome: string; crmv: string | null; ativo: boolean; perfil: string }): void {
    this.veterinarios.push(vet);
  }
  limpar(): void {
    this.agendamentos = [];
    this.animais = [];
    this.veterinarios = [];
  }
}

// ============================================================================
// TESTES
// ============================================================================

describe('AgendaService', () => {
  let repo: RepositorioFalso;
  let service: AgendaService;

  const veterinarioId = randomUUID();
  const animalId = randomUUID();
  const outroVeterinarioId = randomUUID();

  const sessaoMaster = { usuarioId: randomUUID(), perfil: 'MASTER' as const };
  const sessaoVet = { usuarioId: veterinarioId, perfil: 'VETERINARIO' as const };

  const inicio = Math.floor(new Date('2026-11-25T10:00:00Z').getTime() / 1000);
  const fim = inicio + 30 * 60;

  beforeEach(() => {
    repo = new RepositorioFalso();
    service = new AgendaService(repo, sessaoMaster);

    repo.adicionarVeterinario({ id: veterinarioId, nome: 'Dr. João', crmv: '12345', ativo: true, perfil: 'VETERINARIO' });
    repo.adicionarVeterinario({ id: outroVeterinarioId, nome: 'Dra. Maria', crmv: '54321', ativo: true, perfil: 'VETERINARIO' });
    repo.adicionarAnimal({ id: animalId, nome: 'Rex', ativo: true });
  });

  // ---------- LISTAR ----------
  describe('listar', () => {
    it('retorna agendamentos do período', () => {
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30, motivo: 'Consulta' });
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date((inicio + 3600) * 1000).toISOString(), duracao_min: 30, motivo: 'Retorno' });

      const resultado = service.listar({ inicio: new Date(inicio * 1000).toISOString(), fim: new Date((fim + 7200) * 1000).toISOString() });
      expect(resultado).toHaveLength(2);
      expect(resultado[0].animal_nome).toBe('Rex');
    });

    it('filtra por veterinário_id', () => {
      repo.adicionarAnimal({ id: animalId, nome: 'Rex', ativo: true });
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      service.criar({ animal_id: animalId, veterinario_id: outroVeterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });

      const resultado = service.listar({
        inicio: new Date(inicio * 1000).toISOString(),
        fim: new Date(fim * 1000).toISOString(),
        veterinario_id: veterinarioId,
      });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].veterinario_id).toBe(veterinarioId);
    });

    it('como VETERINARIO filtra apenas próprios agendamentos', () => {
      const serviceVet = new AgendaService(repo, sessaoVet);
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      service.criar({ animal_id: animalId, veterinario_id: outroVeterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });

      const resultado = serviceVet.listar({ inicio: new Date(inicio * 1000).toISOString(), fim: new Date(fim * 1000).toISOString() });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].veterinario_id).toBe(veterinarioId);
    });
  });

  // ---------- OBTER ----------
  describe('obter', () => {
    it('retorna agendamento existente', () => {
      const criado = service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      const obtido = service.obter(criado.id);
      expect(obtido.id).toBe(criado.id);
      expect(obtido.animal_nome).toBe('Rex');
    });

    it('lança erro se agendamento não existe', () => {
      try {
        service.obter(randomUUID());
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });
  });

  // ---------- CRIAR ----------
  describe('criar', () => {
    it('cria agendamento válido com confirmado: false', () => {
      const agendamento = service.criar({
        animal_id: animalId,
        veterinario_id: veterinarioId,
        inicio: new Date(inicio * 1000).toISOString(),
        duracao_min: 30,
        motivo: 'Consulta de rotina',
      });
      expect(agendamento.id).toBeDefined();
      expect(agendamento.confirmado).toBe(false);
      expect(agendamento.status).toBe('AGENDADO');
    });

    it('lança erro se animal não existe', () => {
      try {
        service.criar({
          animal_id: randomUUID(),
          veterinario_id: veterinarioId,
          inicio: new Date(inicio * 1000).toISOString(),
          duracao_min: 30,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });

    it('lança erro se veterinário não existe', () => {
      try {
        service.criar({
          animal_id: animalId,
          veterinario_id: randomUUID(),
          inicio: new Date(inicio * 1000).toISOString(),
          duracao_min: 30,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });

    it('lança AGENDA_CONFLITO se houver sobreposição', () => {
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      try {
        service.criar({
          animal_id: animalId,
          veterinario_id: veterinarioId,
          inicio: new Date((inicio + 15 * 60) * 1000).toISOString(), // 15 min depois (sobrepõe)
          duracao_min: 30,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('AGENDA_CONFLITO');
      }
    });

    it('permite agendamentos consecutivos sem sobreposição', () => {
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      const ag2 = service.criar({
        animal_id: animalId,
        veterinario_id: veterinarioId,
        inicio: new Date(fim * 1000).toISOString(), // exatamente no fim do anterior
        duracao_min: 30,
      });
      expect(ag2.id).toBeDefined();
    });

    it('VETERINARIO só pode criar para si mesmo', () => {
      const serviceVet = new AgendaService(repo, sessaoVet);
      try {
        serviceVet.criar({
          animal_id: animalId,
          veterinario_id: outroVeterinarioId,
          inicio: new Date(inicio * 1000).toISOString(),
          duracao_min: 30,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('SEM_PERMISSAO');
      }
    });
  });

  // ---------- ATUALIZAR ----------
  describe('atualizar', () => {
    it('atualiza campos do agendamento', () => {
      const criado = service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      const atualizado = service.atualizar({ id: criado.id, motivo: 'Novo motivo', duracao_min: 45 });
      expect(atualizado.motivo).toBe('Novo motivo');
      expect(atualizado.duracao_min).toBe(45);
    });

    it('lança AGENDA_CONFLITO se novo horário conflita', () => {
      service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      const ag2 = service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date((fim + 3600) * 1000).toISOString(), duracao_min: 30 });
      try {
        service.atualizar({ id: ag2.id, inicio: new Date((inicio + 15 * 60) * 1000).toISOString() }); // move para sobrepor o primeiro
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('AGENDA_CONFLITO');
      }
    });

    it('VETERINARIO só pode atualizar seus próprios agendamentos', () => {
      const serviceVet = new AgendaService(repo, sessaoVet);
      const ag = service.criar({ animal_id: animalId, veterinario_id: outroVeterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      try {
        serviceVet.atualizar({ id: ag.id, motivo: 'Tentativa' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('SEM_PERMISSAO');
      }
    });

    it('VETERINARIO não pode transferir agendamento para outro veterinário', () => {
      const serviceVet = new AgendaService(repo, sessaoVet);
      const ag = service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      try {
        serviceVet.atualizar({ id: ag.id, veterinario_id: outroVeterinarioId });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('SEM_PERMISSAO');
      }
    });
  });

  // ---------- CANCELAR ----------
  describe('cancelar', () => {
    it('cancela agendamento existente', () => {
      const criado = service.criar({ animal_id: animalId, veterinario_id: veterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      service.cancelar({ id: criado.id });
      const obtido = repo.obter(criado.id);
      expect(obtido?.status).toBe('CANCELADO');
      expect(obtido?.ativo).toBe(false);
    });

    it('VETERINARIO só pode cancelar seus próprios agendamentos', () => {
      const serviceVet = new AgendaService(repo, sessaoVet);
      const ag = service.criar({ animal_id: animalId, veterinario_id: outroVeterinarioId, inicio: new Date(inicio * 1000).toISOString(), duracao_min: 30 });
      try {
        serviceVet.cancelar({ id: ag.id });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('SEM_PERMISSAO');
      }
    });
  });

  // ---------- LISTAR VETERINÁRIOS ----------
  describe('listarVeterinarios', () => {
    it('retorna apenas veterinários ativos', () => {
      repo.adicionarVeterinario({ id: randomUUID(), nome: 'Inativo', crmv: '99999', ativo: false, perfil: 'VETERINARIO' });
      const vets = service.listarVeterinarios({});
      expect(vets).toHaveLength(2);
      expect(vets.map((v) => v.nome)).toContain('Dr. João');
      expect(vets.map((v) => v.nome)).toContain('Dra. Maria');
    });
  });
});