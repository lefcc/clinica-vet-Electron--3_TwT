import { beforeEach, describe, expect, it } from 'vitest';
import type { BancoSql, ComandoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import {
  MedicamentosRepository,
  type AtualizarMedicamentoDados,
  type MedicamentoDto,
  type NovoMedicamentoDados,
  type RepositorioMedicamentos,
} from './medicamentos.repository';
import { MedicamentosService } from './medicamentos.service';

class RepositorioMedicamentosFalso implements RepositorioMedicamentos {
  itens: MedicamentoDto[] = [];
  private seq = 0;

  listarAtivos(): MedicamentoDto[] {
    return this.itens.filter((i) => i.ativo);
  }

  obterAtivoPorId(id: string): MedicamentoDto | undefined {
    return this.itens.find((i) => i.id === id && i.ativo);
  }

  criar(dados: NovoMedicamentoDados): MedicamentoDto {
    this.seq += 1;
    const novo: MedicamentoDto = {
      id: `med-${this.seq}`,
      nome: dados.nome,
      principio_ativo: dados.principio_ativo,
      unidade: dados.unidade,
      dias_alerta: dados.dias_alerta,
      consumo_inicial_diario: dados.consumo_inicial_diario ?? null,
      ativo: true,
    };
    this.itens.push(novo);
    return { ...novo };
  }

  atualizar(dados: AtualizarMedicamentoDados): MedicamentoDto | undefined {
    const item = this.obterAtivoPorId(dados.id);
    if (!item) return undefined;
    if (dados.nome !== undefined) item.nome = dados.nome;
    if (dados.principio_ativo !== undefined) item.principio_ativo = dados.principio_ativo;
    if (dados.unidade !== undefined) item.unidade = dados.unidade;
    if (dados.dias_alerta !== undefined) item.dias_alerta = dados.dias_alerta;
    if (dados.consumo_inicial_diario !== undefined) item.consumo_inicial_diario = dados.consumo_inicial_diario;
    return { ...item };
  }

  inativar(id: string): boolean {
    const item = this.obterAtivoPorId(id);
    if (!item) return false;
    item.ativo = false;
    return true;
  }
}

class BancoSqlEspiao implements BancoSql {
  ddls: string[] = [];
  comandos: Array<{ sql: string; params: unknown[] }> = [];
  transacoesExecutadas = 0;
  private registros = new Map<
    string,
    {
      id: string;
      nome: string;
      principio_ativo: string | null;
      unidade: string;
      dias_alerta: number;
      consumo_inicial_diario: number | null;
      ativo: number;
    }
  >();

  exec(sql: string): void {
    this.ddls.push(sql);
  }

  prepare(sql: string): ComandoSql {
    return {
      run: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('INSERT INTO medicamentos')) {
          const [id, nome, principio_ativo, unidade, dias_alerta, consumo_inicial_diario] = params as [
            string,
            string,
            string | null,
            string,
            number,
            number | null,
          ];
          this.registros.set(id, {
            id,
            nome,
            principio_ativo,
            unidade,
            dias_alerta,
            consumo_inicial_diario,
            ativo: 1,
          });
        } else if (sql.includes('UPDATE medicamentos SET ativo = 0')) {
          const id = params[1] as string;
          const reg = this.registros.get(id);
          if (reg) reg.ativo = 0;
        } else if (sql.includes('UPDATE medicamentos')) {
          const [nome, principio_ativo, unidade, dias_alerta, consumo_inicial_diario, , id] = params as [
            string,
            string | null,
            string,
            number,
            number | null,
            number,
            string,
          ];
          const reg = this.registros.get(id);
          if (reg) {
            reg.nome = nome;
            reg.principio_ativo = principio_ativo;
            reg.unidade = unidade;
            reg.dias_alerta = dias_alerta;
            reg.consumo_inicial_diario = consumo_inicial_diario;
          }
        }
        return { changes: 1 };
      },
      get: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        const id = params[0] as string;
        const reg = this.registros.get(id);
        return reg && reg.ativo === 1 ? reg : undefined;
      },
      all: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        return [...this.registros.values()].filter((r) => r.ativo === 1);
      },
    };
  }

  transacao<T>(funcao: () => T): T {
    this.transacoesExecutadas += 1;
    return funcao();
  }
}

describe('MedicamentosService e MedicamentosRepository', () => {
  let repo: RepositorioMedicamentosFalso;
  let service: MedicamentosService;

  beforeEach(() => {
    repo = new RepositorioMedicamentosFalso();
    service = new MedicamentosService(repo);
    service.criar({
      nome: 'Dipirona',
      principio_ativo: 'Dipirona sódica',
      unidade: 'ml',
      dias_alerta: 3,
      consumo_inicial_diario: 15,
    });
    service.criar({
      nome: 'Amoxicilina 250mg',
      principio_ativo: 'Amoxicilina',
      unidade: 'comprimido',
      dias_alerta: 5,
      consumo_inicial_diario: 10,
    });
  });

  it('lista medicamentos ativos com paginação e busca case/accent-insensitive', () => {
    const pagina = service.listar({ pagina: 1, tamanho: 10, busca: 'SODICA' });
    expect(pagina.total).toBe(1);
    expect(pagina.itens[0]?.nome).toBe('Dipirona');
  });

  it('bloqueia criação de medicamento com mesmo nome + unidade entre ativos (MEDICAMENTO_DUPLICADO)', () => {
    let erroCapturado: unknown;
    try {
      service.criar({
        nome: '  dipirona  ',
        unidade: ' ML ',
        dias_alerta: 4,
      });
    } catch (erro) {
      erroCapturado = erro;
    }

    expect(erroCapturado).toBeInstanceOf(ErroNegocio);
    expect((erroCapturado as ErroNegocio).codigo).toBe('MEDICAMENTO_DUPLICADO');
  });

  it('permite mesmo nome se a unidade for diferente ou se o anterior estiver inativo', () => {
    const emComprimido = service.criar({
      nome: 'Dipirona',
      unidade: 'comprimido',
      dias_alerta: 3,
    });
    expect(emComprimido.unidade).toBe('comprimido');

    const dipironaMl = repo.listarAtivos().find((m) => m.nome === 'Dipirona' && m.unidade === 'ml')!;
    service.inativar({ id: dipironaMl.id });

    const recriado = service.criar({
      nome: 'Dipirona',
      unidade: 'ml',
      dias_alerta: 5,
    });
    expect(recriado.id).not.toBe(dipironaMl.id);
    expect(recriado.ativo).toBe(true);
  });

  it('bloqueia atualização que colida em nome + unidade com outro medicamento ativo', () => {
    const amoxicilina = repo.listarAtivos().find((m) => m.nome.startsWith('Amoxicilina'))!;
    expect(() =>
      service.atualizar({
        id: amoxicilina.id,
        nome: 'Dipirona',
        unidade: 'ml',
      }),
    ).toThrowError(ErroNegocio);
  });

  it('valida limites de dias_alerta (1 a 60) e campos obrigatórios', () => {
    expect(() =>
      service.criar({
        nome: 'Teste',
        unidade: 'ml',
        dias_alerta: 0,
      }),
    ).toThrowError(ErroNegocio);

    expect(() =>
      service.criar({
        nome: 'Teste',
        unidade: 'ml',
        dias_alerta: 61,
      }),
    ).toThrowError(ErroNegocio);
  });

  it('MedicamentosRepository: garante CREATE TABLE IF NOT EXISTS (medicamentos e sync_outbox), usa transação, grava na sync_outbox e inativa logicamente (ativo = 0)', () => {
    const banco = new BancoSqlEspiao();
    const repoSql = new MedicamentosRepository(banco);

    const criado = repoSql.criar({
      nome: 'Meloxicam',
      principio_ativo: 'Meloxicam',
      unidade: 'ml',
      dias_alerta: 3,
      consumo_inicial_diario: 4,
    });

    // Garantiu tabelas independentes da Trilha 1
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS medicamentos');
    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS sync_outbox');

    // Usou transação e gravou em sync_outbox
    expect(banco.transacoesExecutadas).toBe(1);
    expect(banco.comandos.some((c) => c.sql.includes("INSERT INTO sync_outbox") && c.params[1] === 'inserir')).toBe(
      true,
    );

    // Atualizar grava na outbox em transação
    repoSql.atualizar({ id: criado.id, dias_alerta: 7 });
    expect(banco.transacoesExecutadas).toBe(2);
    expect(banco.comandos.some((c) => c.sql.includes("INSERT INTO sync_outbox") && c.params[1] === 'atualizar')).toBe(
      true,
    );

    // Inativar faz UPDATE ativo = 0 (nunca DELETE físico) e grava na outbox em transação
    const inativou = repoSql.inativar(criado.id);
    expect(inativou).toBe(true);
    expect(banco.transacoesExecutadas).toBe(3);
    expect(banco.comandos.some((c) => c.sql.includes('UPDATE medicamentos SET ativo = 0'))).toBe(true);
    expect(banco.comandos.some((c) => c.sql.toUpperCase().includes('DELETE'))).toBe(false);
    expect(banco.comandos.some((c) => c.sql.includes("INSERT INTO sync_outbox") && c.params[1] === 'inativar')).toBe(
      true,
    );
  });
});
