import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { ErroNegocio } from '../../erros/erro-negocio';
import { AnimalService } from './animais.service';
import type { RepositorioAnimais, AnimalComCliente, EntradaListagem } from './animais.repository';

// ============================================================================
// REPOSITÓRIO FALSO (EM MEMÓRIA) PARA TESTES
// ============================================================================

class RepositorioFalso implements RepositorioAnimais {
  animais: AnimalComCliente[] = [];
  clientes: { id: string; nome: string; ativo: boolean }[] = [];

  listar(entrada: EntradaListagem): { itens: AnimalComCliente[]; total: number; pagina: number; tamanho: number } {
    let lista = this.animais.filter((a) => a.ativo);
    if (entrada.busca) {
      const termo = entrada.busca.trim().toLowerCase();
      lista = lista.filter(
        (a) =>
          a.nome.toLowerCase().includes(termo) ||
          a.especie.toLowerCase().includes(termo) ||
          (a.raca?.toLowerCase().includes(termo) ?? false) ||
          a.cliente_nome.toLowerCase().includes(termo),
      );
    }
    const pagina = Math.max(1, entrada.pagina || 1);
    const tamanho = Math.min(200, Math.max(1, entrada.tamanho || 10));
    const inicio = (pagina - 1) * tamanho;
    return {
      itens: lista.slice(inicio, inicio + tamanho),
      total: lista.length,
      pagina,
      tamanho,
    };
  }

  obter(id: string): AnimalComCliente | undefined {
    return this.animais.find((a) => a.id === id);
  }

  listarPorCliente(clienteId: string): AnimalComCliente[] {
    return this.animais.filter((a) => a.cliente_id === clienteId && a.ativo);
  }

  verificarClienteExiste(clienteId: string): boolean {
    return this.clientes.some((c) => c.id === clienteId && c.ativo);
  }

  criar(dados: Omit<AnimalComCliente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm' | 'cliente_nome' | 'idade_texto'>): AnimalComCliente {
    const agora = Math.floor(Date.now() / 1000);
    const cliente = this.clientes.find((c) => c.id === dados.clienteId);
    const animal: AnimalComCliente = {
      id: randomUUID(),
      cliente_id: dados.clienteId,
      nome: dados.nome,
      especie: dados.especie,
      raca: dados.raca ?? '',
      sexo: dados.sexo,
      data_nascimento: dados.dataNascimento ? new Date(dados.dataNascimento * 1000).toISOString().split('T')[0] : undefined,
      peso_kg: dados.pesoKg ?? undefined,
      observacoes: dados.observacoes ?? '',
      cliente_nome: cliente?.nome || '—',
      idade_texto: this.calcularIdade(dados.dataNascimento),
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.animais.push(animal);
    return animal;
  }

  atualizar(id: string, dados: Partial<Omit<AnimalComCliente, 'id' | 'criadoEm'>>): AnimalComCliente {
    const idx = this.animais.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Animal não encontrado');
    const agora = Math.floor(Date.now() / 1000);
    const existentes = this.animais[idx];
    const novosDados: AnimalComCliente = { ...existentes, atualizadoEm: agora };
    // Mapear camelCase para snake_case
    if (dados.clienteId !== undefined) {
      novosDados.cliente_id = dados.clienteId;
      const cliente = this.clientes.find((c) => c.id === dados.clienteId);
      novosDados.cliente_nome = cliente?.nome || '—';
    }
    if (dados.nome !== undefined) novosDados.nome = dados.nome;
    if (dados.especie !== undefined) novosDados.especie = dados.especie;
    if (dados.raca !== undefined) novosDados.raca = dados.raca;
    if (dados.sexo !== undefined) novosDados.sexo = dados.sexo;
    if (dados.dataNascimento !== undefined) {
      novosDados.data_nascimento = dados.dataNascimento ? new Date(dados.dataNascimento * 1000).toISOString().split('T')[0] : undefined;
      novosDados.idade_texto = this.calcularIdade(dados.dataNascimento);
    }
    if (dados.pesoKg !== undefined) novosDados.peso_kg = dados.pesoKg;
    if (dados.observacoes !== undefined) novosDados.observacoes = dados.observacoes;
    this.animais[idx] = novosDados;
    return novosDados;
  }

  inativar(id: string): void {
    const idx = this.animais.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Animal não encontrado');
    this.animais[idx].ativo = false;
    this.animais[idx].atualizadoEm = Math.floor(Date.now() / 1000);
  }

  private calcularIdade(dataNascimento: number | undefined): string {
    if (!dataNascimento) return '—';
    const nascimento = new Date(dataNascimento * 1000);
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

  // Helpers para testes
  adicionarAnimal(animal: AnimalComCliente): void {
    this.animais.push(animal);
  }
  adicionarCliente(cliente: { id: string; nome: string; ativo: boolean }): void {
    this.clientes.push(cliente);
  }
  limpar(): void {
    this.animais = [];
    this.clientes = [];
  }
}

// ============================================================================
// TESTES
// ============================================================================

describe('AnimalService', () => {
  let repo: RepositorioFalso;
  let service: AnimalService;

  beforeEach(() => {
    repo = new RepositorioFalso();
    service = new AnimalService(repo);
  });

  const clienteId = randomUUID();
  const animalValido = {
    cliente_id: clienteId,
    nome: 'Rex',
    especie: 'Cachorro',
    raca: 'Labrador',
    sexo: 'M' as const,
    data_nascimento: '2021-03-15',
    peso_kg: 28.5,
    observacoes: 'Vacinas em dia',
  };

  beforeEach(() => {
    repo.adicionarCliente({ id: clienteId, nome: 'João Silva', ativo: true });
  });

  // ---------- LISTAR ----------
  describe('listar', () => {
    it('retorna lista paginada com idade_texto e cliente_nome', () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id: id1,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos e 8 meses',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      repo.adicionarAnimal({
        ...animalValido,
        id: id2,
        nome: 'Mimi',
        especie: 'Gato',
        cliente_nome: 'João Silva',
        idade_texto: '2 anos e 3 meses',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      repo.adicionarAnimal({
        ...animalValido,
        id: id3,
        nome: 'Inativo',
        ativo: false,
        criadoEm: 1,
        atualizadoEm: 1,
      });

      const resultado = service.listar({ pagina: 1, tamanho: 10 });
      expect(resultado.itens).toHaveLength(2);
      expect(resultado.total).toBe(2);
      expect(resultado.itens[0]).toHaveProperty('idade_texto');
      expect(resultado.itens[0]).toHaveProperty('cliente_nome');
      expect(resultado.itens[0].cliente_nome).toBe('João Silva');
    });

    it('filtra por busca (nome, espécie, raça, tutor)', () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id: id1,
        nome: 'Rex',
        especie: 'Cachorro',
        raca: 'Labrador',
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      repo.adicionarAnimal({
        ...animalValido,
        id: id2,
        nome: 'Mimi',
        especie: 'Gato',
        raca: 'Siamês',
        cliente_nome: 'Maria Santos',
        idade_texto: '2 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });

      let resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'rex' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].nome).toBe('Rex');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'gato' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].especie).toBe('Gato');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'siam' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].raca).toBe('Siamês');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'maria' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].cliente_nome).toBe('Maria Santos');
    });

    it('pagina corretamente', () => {
      for (let i = 1; i <= 15; i++) {
        repo.adicionarAnimal({
          ...animalValido,
          id: randomUUID(),
          nome: `Animal ${i}`,
          cliente_nome: 'João Silva',
          idade_texto: '1 ano',
          ativo: true,
          criadoEm: 1,
          atualizadoEm: 1,
        });
      }

      const pagina1 = service.listar({ pagina: 1, tamanho: 10 });
      expect(pagina1.itens).toHaveLength(10);
      expect(pagina1.total).toBe(15);

      const pagina2 = service.listar({ pagina: 2, tamanho: 10 });
      expect(pagina2.itens).toHaveLength(5);
    });
  });

  // ---------- OBTER ----------
  describe('obter', () => {
    it('retorna animal existente com idade_texto e cliente_nome', () => {
      const id = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos e 8 meses',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      const animal = service.obter(id);
      expect(animal.nome).toBe('Rex');
      expect(animal.idade_texto).toBe('5 anos e 8 meses');
      expect(animal.cliente_nome).toBe('João Silva');
    });

    it('lança erro se animal não existe', () => {
      try {
        service.obter(randomUUID());
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });
  });

  // ---------- LISTAR POR CLIENTE ----------
  describe('listarPorCliente', () => {
    it('retorna apenas animais do cliente', () => {
      const outroClienteId = randomUUID();
      repo.adicionarCliente({ id: outroClienteId, nome: 'Maria Santos', ativo: true });
      const id1 = randomUUID();
      const id2 = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id: id1,
        cliente_id: clienteId,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      repo.adicionarAnimal({
        ...animalValido,
        id: id2,
        cliente_id: outroClienteId,
        nome: 'Thor',
        cliente_nome: 'Maria Santos',
        idade_texto: '3 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });

      const resultado = service.listarPorCliente({ cliente_id: clienteId });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Rex');
    });

    it('lança erro se cliente não existe', () => {
      try {
        service.listarPorCliente({ cliente_id: randomUUID() });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });
  });

  // ---------- CRIAR ----------
  describe('criar', () => {
    it('cria animal válido com idade_texto calculado', () => {
      const animal = service.criar(animalValido);
      expect(animal.id).toBeDefined();
      expect(animal.nome).toBe('Rex');
      expect(animal.idade_texto).toContain('ano');
      expect(animal.cliente_nome).toBe('João Silva');
    });

    it('lança erro se cliente não existe', () => {
      try {
        service.criar({ ...animalValido, cliente_id: randomUUID() });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });

    it('lança erro se cliente está inativo', () => {
      const clienteInativoId = randomUUID();
      repo.adicionarCliente({ id: clienteInativoId, nome: 'Inativo', ativo: false });
      try {
        service.criar({ ...animalValido, cliente_id: clienteInativoId });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });

    it('valida campos obrigatórios', () => {
      try {
        service.criar({ ...animalValido, nome: '' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('DADOS_INVALIDOS');
      }
      try {
        service.criar({ ...animalValido, especie: '' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('DADOS_INVALIDOS');
      }
      try {
        service.criar({ ...animalValido, sexo: 'X' as 'M' | 'F' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('DADOS_INVALIDOS');
      }
    });

    it('data_nascimento opcional: sem data não quebra idade_texto', () => {
      const animal = service.criar({ ...animalValido, data_nascimento: '' });
      expect(animal.idade_texto).toBe('—');
    });

    it('aceita peso_kg como número', () => {
      const animal = service.criar({ ...animalValido, peso_kg: '10.5' });
      expect(animal.peso_kg).toBe(10.5);
    });
  });

  // ---------- ATUALIZAR ----------
  describe('atualizar', () => {
    it('atualiza campos do animal', () => {
      const id = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      const atualizado = service.atualizar({ id, nome: 'Rex Novo', peso_kg: 30 });
      expect(atualizado.nome).toBe('Rex Novo');
      expect(atualizado.peso_kg).toBe(30);
    });

    it('recalcula idade_texto se data_nascimento mudar', () => {
      const id = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      const atualizado = service.atualizar({ id, data_nascimento: '2023-01-01' });
      expect(atualizado.idade_texto).not.toBe('5 anos');
    });

    it('valida cliente_id se mudar', () => {
      const id = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      try {
        service.atualizar({ id, cliente_id: randomUUID() });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('NAO_ENCONTRADO');
      }
    });
  });

  // ---------- INATIVAR ----------
  describe('inativar', () => {
    it('inativa animal existente', () => {
      const id = randomUUID();
      repo.adicionarAnimal({
        ...animalValido,
        id,
        cliente_nome: 'João Silva',
        idade_texto: '5 anos',
        ativo: true,
        criadoEm: 1,
        atualizadoEm: 1,
      });
      service.inativar(id);
      expect(repo.obter(id)?.ativo).toBe(false);
    });
  });
});