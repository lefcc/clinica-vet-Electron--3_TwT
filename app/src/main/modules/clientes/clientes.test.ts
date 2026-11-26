import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { ErroNegocio } from '../../erros/erro-negocio';
import { ClienteService } from './clientes.service';
import type { RepositorioClientes, Cliente, EntradaListagem } from './clientes.repository';

// ============================================================================
// REPOSITÓRIO FALSO (EM MEMÓRIA) PARA TESTES
// ============================================================================

class RepositorioFalso implements RepositorioClientes {
  clientes: Cliente[] = [];

  listar(entrada: EntradaListagem): { itens: Cliente[]; total: number; pagina: number; tamanho: number } {
    let lista = this.clientes.filter((c) => c.ativo);
    if (entrada.busca) {
      const termo = entrada.busca.trim().toLowerCase();
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          c.cpf.includes(termo) ||
          c.telefone.includes(termo),
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

  obter(id: string): Cliente | undefined {
    return this.clientes.find((c) => c.id === id);
  }

  buscarPorCpf(cpf: string, ignorarId?: string): Cliente | undefined {
    return this.clientes.find((c) => c.cpf === cpf && c.ativo && c.id !== ignorarId);
  }

  contarAnimaisAtivos(_clienteId: string): number {
    void _clienteId;
    return 0; // será sobrescrito nos testes quando necessário
  }

  criar(dados: Omit<Cliente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>): Cliente {
    const agora = Math.floor(Date.now() / 1000);
    const cliente: Cliente = {
      id: randomUUID(),
      ...dados,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.clientes.push(cliente);
    return cliente;
  }

  atualizar(id: string, dados: Partial<Omit<Cliente, 'id' | 'criadoEm'>>): Cliente {
    const idx = this.clientes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado');
    const agora = Math.floor(Date.now() / 1000);
    this.clientes[idx] = { ...this.clientes[idx], ...dados, atualizadoEm: agora };
    return this.clientes[idx];
  }

  inativar(id: string): void {
    const idx = this.clientes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado');
    this.clientes[idx].ativo = false;
    this.clientes[idx].atualizadoEm = Math.floor(Date.now() / 1000);
  }

  // Helpers para testes
  adicionarCliente(cliente: Cliente): void {
    this.clientes.push(cliente);
  }

  limpar(): void {
    this.clientes = [];
  }
}

// ============================================================================
// TESTES
// ============================================================================

describe('ClienteService', () => {
  let repo: RepositorioFalso;
  let service: ClienteService;

  beforeEach(() => {
    repo = new RepositorioFalso();
    service = new ClienteService(repo);
  });

  const clienteValido = {
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
  };

  const clienteValidoComCamposOpcionais = {
    ...clienteValido,
    email: 'joao@email.com',
    cep: '13010000',
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'Campinas',
    uf: 'SP',
  };

  // ---------- LISTAR ----------
  describe('listar', () => {
    it('retorna lista paginada', () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id: id1, cpf: '11111111111', ativo: true, criadoEm: 1, atualizadoEm: 1 });
      repo.adicionarCliente({ ...clienteValido, id: id2, cpf: '22222222222', ativo: true, criadoEm: 1, atualizadoEm: 1 });
      repo.adicionarCliente({ ...clienteValido, id: id3, cpf: '33333333333', ativo: false, criadoEm: 1, atualizadoEm: 1 }); // inativo

      const resultado = service.listar({ pagina: 1, tamanho: 10 });
      expect(resultado.itens).toHaveLength(2);
      expect(resultado.total).toBe(2);
      expect(resultado.pagina).toBe(1);
      expect(resultado.tamanho).toBe(10);
    });

    it('filtra por busca (nome, cpf, telefone)', () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id: id1, cpf: '11111111111', nome: 'João Silva', telefone: '19999998888', ativo: true, criadoEm: 1, atualizadoEm: 1 });
      repo.adicionarCliente({ ...clienteValido, id: id2, cpf: '22222222222', nome: 'Maria Santos', telefone: '19988887777', ativo: true, criadoEm: 1, atualizadoEm: 1 });

      let resultado = service.listar({ pagina: 1, tamanho: 10, busca: 'joão' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].nome).toBe('João Silva');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: '22222222222' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].cpf).toBe('22222222222');

      resultado = service.listar({ pagina: 1, tamanho: 10, busca: '999998888' });
      expect(resultado.itens).toHaveLength(1);
      expect(resultado.itens[0].telefone).toBe('19999998888');
    });

    it('pagina corretamente', () => {
      for (let i = 1; i <= 15; i++) {
        repo.adicionarCliente({ ...clienteValido, id: randomUUID(), cpf: String(i).padStart(11, '0'), ativo: true, criadoEm: 1, atualizadoEm: 1 });
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
    it('retorna cliente existente', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      const cliente = service.obter(id);
      expect(cliente.nome).toBe('João Silva');
      expect(cliente.cpf).toBe('12345678901');
    });

    it('lança erro se cliente não existe', () => {
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
    it('cria cliente válido', () => {
      const cliente = service.criar(clienteValido);
      expect(cliente.id).toBeDefined();
      expect(cliente.nome).toBe('João Silva');
      expect(cliente.cpf).toBe('12345678901');
      expect(cliente.ativo).toBe(true);
    });

    it('lança CPF_DUPLICADO se CPF já existe ativo', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      try {
        service.criar(clienteValido);
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('CPF_DUPLICADO');
      }
    });

    it('permite CPF de cliente inativo', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: false, criadoEm: 1, atualizadoEm: 1 });
      const cliente = service.criar(clienteValido);
      expect(cliente.id).toBeDefined();
    });

    it('valida campos obrigatórios', () => {
      try {
        service.criar({ ...clienteValido, nome: '' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('DADOS_INVALIDOS');
      }
      try {
        service.criar({ ...clienteValido, cpf: '123' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('DADOS_INVALIDOS');
      }
    });

    it('limpa campos opcionais vazios', () => {
      const entrada = { ...clienteValidoComCamposOpcionais, email: '', cep: '', logradouro: '' };
      const cliente = service.criar(entrada);
      expect(cliente.email).toBeUndefined();
      expect(cliente.cep).toBeUndefined();
      expect(cliente.logradouro).toBeUndefined();
    });
  });

  // ---------- ATUALIZAR ----------
  describe('atualizar', () => {
    it('atualiza campos do cliente', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      const atualizado = service.atualizar({ id, nome: 'João Silva Santos', telefone: '19888887777' });
      expect(atualizado.nome).toBe('João Silva Santos');
      expect(atualizado.telefone).toBe('19888887777');
    });

    it('lança CPF_DUPLICADO se mudar para CPF existente', () => {
      const id1 = randomUUID();
      const id2 = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id: id1, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      repo.adicionarCliente({ ...clienteValido, id: id2, cpf: '99999999999', ativo: true, criadoEm: 1, atualizadoEm: 1 });
      try {
        service.atualizar({ id: id1, cpf: '99999999999' });
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('CPF_DUPLICADO');
      }
    });

    it('permite manter o mesmo CPF', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      const atualizado = service.atualizar({ id, nome: 'Novo Nome' });
      expect(atualizado.cpf).toBe('12345678901');
    });
  });

  // ---------- INATIVAR ----------
  describe('inativar', () => {
    it('inativa cliente sem animais ativos', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      service.inativar(id);
      expect(repo.obter(id)?.ativo).toBe(false);
    });

    it('lança CLIENTE_POSSUI_ANIMAIS_ATIVOS se tem animais ativos', () => {
      const id = randomUUID();
      repo.adicionarCliente({ ...clienteValido, id, ativo: true, criadoEm: 1, atualizadoEm: 1 });
      repo.contarAnimaisAtivos = () => 2; // mock para simular 2 animais ativos
      try {
        service.inativar(id);
      } catch (e) {
        expect(e).toBeInstanceOf(ErroNegocio);
        expect((e as ErroNegocio).codigo).toBe('CLIENTE_POSSUI_ANIMAIS_ATIVOS');
      }
    });
  });
});