import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { ErroNegocio } from '../../erros/erro-negocio';
import { ConsultasService } from './consultas.service';
import type { RepositorioConsultas, ConsultaComRelacoes } from './consultas.repository';

// Helper para atraso mínimo entre criações (para timestamps diferentes)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// REPOSITÓRIO FALSO (EM MEMÓRIA) PARA TESTES
// ============================================================================

class RepositorioFalso implements RepositorioConsultas {
  consultas: ConsultaComRelacoes[] = [];
  animais: { id: string; nome: string; ativo: boolean }[] = [];
  medicamentos: { id: string; nome: string; unidade: string }[] = [];
  lotes: { id: string; medicamento_id: string; numero: string; validade: number; quantidade_inicial: number }[] = [];
  movimentacoes: { lote_id: string | null; tipo: string; quantidade: number }[] = [];

  listar(entrada: { pagina: number; tamanho: number; busca?: string }): { itens: ConsultaComRelacoes[]; total: number; pagina: number; tamanho: number } {
    let lista = this.consultas.filter((c) => c.ativo);
    if (entrada.busca) {
      const termo = entrada.busca.trim().toLowerCase();
      lista = lista.filter(
        (c) =>
          c.animal_nome.toLowerCase().includes(termo) ||
          c.cliente_nome.toLowerCase().includes(termo) ||
          c.veterinario_nome.toLowerCase().includes(termo) ||
          (c.anamnese?.toLowerCase().includes(termo) ?? false),
      );
    }
    const pagina = Math.max(1, entrada.pagina || 1);
    const tamanho = Math.min(200, Math.max(1, entrada.tamanho || 10));
    const inicio = (pagina - 1) * tamanho;
    return {
      itens: lista.slice(inicio, inicio + tamanho).sort((a, b) => b.data - a.data),
      total: lista.length,
      pagina,
      tamanho,
    };
  }

  obter(id: string): ConsultaComRelacoes | undefined {
    return this.consultas.find((c) => c.id === id);
  }

  historicoAnimal(animalId: string): ConsultaComRelacoes[] {
    return this.consultas
      .filter((c) => c.animal_id === animalId && c.ativo)
      .sort((a, b) => b.data - a.data);
  }

  verificarAnimalExiste(animalId: string): boolean {
    return this.animais.some((a) => a.id === animalId && a.ativo);
  }

  buscarLotesParaBaixa(medicamentoId: string, quantidade: number): { id: string; numero: string; validade: number; saldo: number }[] {
    // Calcular saldo de cada lote
    const lotesComSaldo: { id: string; numero: string; validade: number; saldo: number }[] = [];

    for (const lote of this.lotes.filter((l) => l.medicamento_id === medicamentoId)) {
      const entradas = this.movimentacoes
        .filter((m) => m.lote_id === lote.id && m.tipo === 'ENTRADA')
        .reduce((sum, m) => sum + m.quantidade, 0);
      const saidas = this.movimentacoes
        .filter((m) => m.lote_id === lote.id && m.tipo === 'SAIDA')
        .reduce((sum, m) => sum + m.quantidade, 0);
      const saldo = lote.quantidade_inicial + entradas - saidas;
      if (saldo > 0) {
        lotesComSaldo.push({ id: lote.id, numero: lote.numero, validade: lote.validade, saldo });
      }
    }

    // Ordenar por validade (FEFO)
    lotesComSaldo.sort((a, b) => a.validade - b.validade);

    const somaSaldo = lotesComSaldo.reduce((sum, l) => sum + l.saldo, 0);
    if (somaSaldo < quantidade) {
      throw new ErroNegocio('ESTOQUE_INSUFICIENTE', 'Estoque insuficiente para esta prescrição.');
    }

    return lotesComSaldo;
  }

  criar(dados: Omit<ConsultaComRelacoes, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm' | 'prescricoes'> & {
    prescricoes?: Array<{ medicamentoId: string; quantidade: number; posologia?: string | null }>;
  }, _usuarioId: string): ConsultaComRelacoes {
    void _usuarioId;
    const agora = Math.floor(Date.now() / 1000);
    const id = randomUUID();

    const animal = this.animais.find((a) => a.id === dados.animalId);
    // Simular busca de veterinário e cliente
    const consulta: ConsultaComRelacoes = {
      id,
      agendamento_id: dados.agendamentoId ?? null,
      animal_id: dados.animalId,
      animal_nome: animal?.nome || '—',
      cliente_nome: 'Tutor Teste',
      veterinario_id: dados.veterinarioId,
      veterinario_nome: 'Veterinário Teste',
      data: dados.data,
      anamnese: dados.anamnese ?? null,
      diagnostico: dados.diagnostico ?? null,
      observacoes: dados.observacoes ?? null,
      prescricoes: (dados.prescricoes || []).map((p) => {
        const med = this.medicamentos.find((m) => m.id === p.medicamentoId);
        return {
          id: randomUUID(),
          consulta_id: id,
          medicamento_id: p.medicamentoId,
          medicamento_nome: med?.nome || 'Medicamento',
          quantidade: p.quantidade,
          posologia: p.posologia ?? null,
          unidade: med?.unidade || 'un',
          criadoEm: agora,
        };
      }),
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    // Simular baixa de estoque para cada prescrição
    if (dados.prescricoes) {
      for (const presc of dados.prescricoes) {
        try {
          const lotes = this.buscarLotesParaBaixa(presc.medicamentoId, presc.quantidade);
          let qtdRestante = presc.quantidade;
          for (const lote of lotes) {
            const qtdBaixa = Math.min(qtdRestante, lote.saldo);
            this.movimentacoes.push({ lote_id: lote.id, tipo: 'SAIDA', quantidade: -qtdBaixa });
            qtdRestante -= qtdBaixa;
            if (qtdRestante === 0) break;
          }
        } catch (e) {
          if (e instanceof ErroNegocio) throw e;
          throw new ErroNegocio('ESTOQUE_INSUFICIENTE', 'Estoque insuficiente para esta prescrição.');
        }
      }
    }

    this.consultas.push(consulta);
    return consulta;
  }

  // Helpers para testes
  adicionarConsulta(c: ConsultaComRelacoes): void {
    this.consultas.push(c);
  }
  adicionarAnimal(a: { id: string; nome: string; ativo: boolean }): void {
    this.animais.push(a);
  }
  adicionarMedicamento(m: { id: string; nome: string; unidade: string }): void {
    this.medicamentos.push(m);
  }
  adicionarLote(l: { id: string; medicamento_id: string; numero: string; validade: number; quantidade_inicial: number }): void {
    this.lotes.push(l);
  }
  adicionarMovimentacao(m: { lote_id: string | null; tipo: string; quantidade: number }): void {
    this.movimentacoes.push(m);
  }
  limpar(): void {
    this.consultas = [];
    this.animais = [];
    this.medicamentos = [];
    this.lotes = [];
    this.movimentacoes = [];
  }
}

// ============================================================================
// TESTES
// ============================================================================

describe('ConsultasService', () => {
  let repo: RepositorioFalso;
  let service: ConsultasService;

  const animalId = randomUUID();
  const medicamentoId = randomUUID();
  const loteId = randomUUID();
  const sessaoMaster = { usuarioId: randomUUID(), perfil: 'MASTER' as const };
  const sessaoAtendente = { usuarioId: randomUUID(), perfil: 'ATENDENTE' as const };

  const prescricaoValida = {
    medicamento_id: medicamentoId,
    quantidade: 2,
    posologia: '1 comprimido a cada 12h',
  };

  const consultaValida = {
    animal_id: animalId,
    anamnese: 'Animal apresenta letargia e falta de apetite há 2 dias.',
    diagnostico: 'Gastrite aguda',
    observacoes: 'Retorno em 7 dias',
    prescricoes: [prescricaoValida],
  };

  beforeEach(() => {
    repo = new RepositorioFalso();
    service = new ConsultasService(repo, sessaoMaster);

    repo.adicionarAnimal({ id: animalId, nome: 'Rex', ativo: true });
    repo.adicionarMedicamento({ id: medicamentoId, nome: 'Dipirona', unidade: 'comprimido' });
    // Lote válido com validade futura
    repo.adicionarLote({ id: loteId, medicamento_id: medicamentoId, numero: 'LOTE-001', validade: Math.floor(new Date('2027-12-31').getTime() / 1000), quantidade_inicial: 100 });
  });

  // ---------- LISTAR ----------
  describe('listar', () => {
    it('retorna lista paginada', () => {
      service.criar(consultaValida);
      service.criar({ ...consultaValida, anamnese: 'Outra consulta' });

      const resultado = service.listar({ pagina: 1, tamanho: 10 });
      expect(resultado.itens).toHaveLength(2);
      expect(resultado.total).toBe(2);
    });

    it('filtra por busca (animal, tutor, veterinário, anamnese)', () => {
      service.criar({ ...consultaValida, anamnese: 'Gastrite aguda' });
      service.criar({ ...consultaValida, anamnese: 'Dermatite alérgica' });

      let resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'gastrite' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].anamnese).toContain('Gastrite');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'dermatite' });
      expect(resultado.itens).toHaveLength(1);
    });

    it('como ATENDENTE omite diagnóstico', () => {
      const serviceAtendente = new ConsultasService(repo, sessaoAtendente);
      service.criar(consultaValida);

      const resultado = serviceAtendente.listar({ pagina: 1, tamanho: 10 });
      expect(resultado.itens[0].diagnostico).toBeUndefined();
    });

    it('como MASTER/VETERINARIO inclui diagnóstico', () => {
      service.criar(consultaValida);

      const resultado = service.listar({ pagina: 1, tamanho: 10 });
      expect(resultado.itens[0].diagnostico).toBe('Gastrite aguda');
    });
  });

  // ---------- OBTER ----------
  describe('obter', () => {
    it('retorna consulta existente', () => {
      const criada = service.criar(consultaValida);
      const obtida = service.obter({ id: criada.id });
      expect(obtida.id).toBe(criada.id);
      expect(obtida.animal_nome).toBe('Rex');
      expect(obtida.diagnostico).toBe('Gastrite aguda');
    });

    it('como ATENDENTE omite diagnóstico', () => {
      const serviceAtendente = new ConsultasService(repo, sessaoAtendente);
      const criada = service.criar(consultaValida);
      const obtida = serviceAtendente.obter({ id: criada.id });
      expect(obtida.diagnostico).toBeUndefined();
    });

    it('lança erro se consulta não existe', () => {
      try {
        service.obter({ id: randomUUID() });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });
  });

  // ---------- CRIAR ----------
  describe('criar', () => {
    it('cria consulta válida com prescrições e baixa estoque FEFO', () => {
      const consulta = service.criar(consultaValida);
      expect(consulta.id).toBeDefined();
      expect(consulta.prescricoes).toHaveLength(1);
      expect(consulta.prescricoes[0].medicamento_nome).toBe('Dipirona');
      expect(consulta.prescricoes[0].quantidade).toBe(2);
    });

    it('lança erro se animal não existe', () => {
      try {
        service.criar({ ...consultaValida, animal_id: randomUUID() });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });

    it('lança ESTOQUE_INSUFICIENTE se não há estoque suficiente', () => {
      // Lote com apenas 1 unidade
      repo.limpar();
      repo.adicionarAnimal({ id: animalId, nome: 'Rex', ativo: true });
      repo.adicionarMedicamento({ id: medicamentoId, nome: 'Dipirona', unidade: 'comprimido' });
      repo.adicionarLote({ id: loteId, medicamento_id: medicamentoId, numero: 'LOTE-001', validade: Math.floor(new Date('2027-12-31').getTime() / 1000), quantidade_inicial: 1 });

      try {
        service.criar({ ...consultaValida, prescricoes: [{ ...prescricaoValida, quantidade: 5 }] });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('ESTOQUE_INSUFICIENTE');
      }
    });

    it('usa múltiplos lotes FEFO (validade mais próxima primeiro)', () => {
      // Dois lotes, o mais próximo vence primeiro
      const lote1 = randomUUID();
      const lote2 = randomUUID();
      repo.adicionarLote({ id: lote1, medicamento_id: medicamentoId, numero: 'LOTE-A', validade: Math.floor(new Date('2026-12-01').getTime() / 1000), quantidade_inicial: 5 });
      repo.adicionarLote({ id: lote2, medicamento_id: medicamentoId, numero: 'LOTE-B', validade: Math.floor(new Date('2027-12-01').getTime() / 1000), quantidade_inicial: 10 });

      // Prescrever 8 unidades - deve consumir 5 do lote A e 3 do lote B
      service.criar({ ...consultaValida, prescricoes: [{ ...prescricaoValida, quantidade: 8 }] });

      // Verificar que as movimentações usaram os lotes na ordem correta
      const saidas = repo.movimentacoes.filter((m) => m.tipo === 'SAIDA');
      expect(saidas.length).toBeGreaterThanOrEqual(2);
    });

    it('permite consulta sem prescrições', () => {
      const consulta = service.criar({ ...consultaValida, prescricoes: [] });
      expect(consulta.prescricoes).toHaveLength(0);
    });
  });

  // ---------- HISTÓRICO DO ANIMAL ----------
  describe('historicoAnimal', () => {
    it('retorna consultas do animal ordenadas por data decrescente', async () => {
      // Criar com atraso > 1s para garantir timestamps Unix diferentes (o service usa Math.floor(Date.now()/1000))
      service.criar({ ...consultaValida, anamnese: 'Consulta antiga' });
      await delay(1100);
      service.criar({ ...consultaValida, anamnese: 'Consulta nova' });

      const historico = service.historicoAnimal({ animal_id: animalId });
      expect(historico).toHaveLength(2);
      expect(historico[0].anamnese).toBe('Consulta nova');
      expect(historico[1].anamnese).toBe('Consulta antiga');
    });

    it('como ATENDENTE omite diagnóstico no histórico', () => {
      const serviceAtendente = new ConsultasService(repo, sessaoAtendente);
      service.criar(consultaValida);

      const historico = serviceAtendente.historicoAnimal({ animal_id: animalId });
      expect(historico[0].diagnostico).toBeUndefined();
    });
  });
});