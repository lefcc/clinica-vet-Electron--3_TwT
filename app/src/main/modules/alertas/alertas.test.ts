import { describe, expect, it, vi } from 'vitest';
import type { BancoSql, ComandoSql } from '../../db/banco-sql';
import type { SaldoEstoqueDto } from '../estoque/estoque.service';
import {
  AlertasEstoqueRepository,
  AlertasService,
  type ProvedorSaldosEstoque,
} from './alertas.service';

const handlersRegistrados = new Map<string, { perfis: string[]; fn: (...args: unknown[]) => Promise<unknown> }>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((canal: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlersRegistrados.set(canal, { perfis: [], fn });
    }),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/fake/path'),
  },
}));

class BancoSqlAlertasEspiao implements BancoSql {
  ddls: string[] = [];
  comandos: Array<{ sql: string; params: unknown[] }> = [];
  transacoesExecutadas = 0;
  private abertosPorMed = new Map<string, string>();

  exec(sql: string): void {
    this.ddls.push(sql);
  }

  prepare(sql: string): ComandoSql {
    return {
      run: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('INSERT INTO alertas_estoque')) {
          const [id, medId] = params as [string, string];
          this.abertosPorMed.set(medId, id);
        } else if (sql.includes("SET status = 'resolvido'")) {
          const medId = params[1] as string;
          this.abertosPorMed.delete(medId);
        }
        return { changes: 1 };
      },
      get: (...params: unknown[]) => {
        this.comandos.push({ sql, params });
        if (sql.includes('FROM alertas_estoque') && sql.includes("status = 'aberto'")) {
          const medId = params[0] as string;
          const id = this.abertosPorMed.get(medId);
          return id ? { id } : undefined;
        }
        return undefined;
      },
      all: () => [],
    };
  }

  transacao<T>(funcao: () => T): T {
    this.transacoesExecutadas += 1;
    return funcao();
  }
}

describe('AlertasService, AlertasEstoqueRepository e Trilha3Ipc', () => {
  it('lista e conta 1 alerta aberto por medicamento com status CRITICO e resolve quando o estoque deixa de ser crítico', () => {
    const saldosAtuais: SaldoEstoqueDto[] = [
      {
        medicamento_id: 'm1',
        medicamento_nome: 'Amoxicilina 250mg',
        unidade: 'comprimido',
        saldo: 12,
        consumo_medio_diario: 6,
        dias_restantes: 2,
        dias_alerta: 5,
        status: 'CRITICO',
      },
      {
        medicamento_id: 'm2',
        medicamento_nome: 'Dipirona',
        unidade: 'ml',
        saldo: 200,
        consumo_medio_diario: 10,
        dias_restantes: 20,
        dias_alerta: 3,
        status: 'OK',
      },
      {
        medicamento_id: 'm3',
        medicamento_nome: 'Vacina V10',
        unidade: 'dose',
        saldo: 6,
        consumo_medio_diario: 3,
        dias_restantes: 2,
        dias_alerta: 7,
        status: 'CRITICO',
      },
    ];

    const provedor: ProvedorSaldosEstoque = {
      calcularTodosSaldos: () => saldosAtuais,
    };

    const banco = new BancoSqlAlertasEspiao();
    const repo = new AlertasEstoqueRepository(banco);
    const service = new AlertasService(provedor, repo);

    const lista = service.listar();
    const contagem = service.contar();

    expect(banco.ddls[0]).toContain('CREATE TABLE IF NOT EXISTS alertas_estoque');
    expect(lista).toHaveLength(2);
    expect(contagem.total).toBe(2);
    expect(lista[0]).toMatchObject({
      medicamento_nome: 'Amoxicilina 250mg',
      dias_restantes: 2,
      saldo: 12,
      unidade: 'comprimido',
    });

    // Segunda chamada com m1 ainda crítico reutiliza o mesmo ID de alerta aberto (1 por medicamento)
    const idAnteriorM1 = lista[0]!.id;
    const listaRepetida = service.listar();
    expect(listaRepetida[0]?.id).toBe(idAnteriorM1);

    // Se m1 receber reposição e virar OK, o alerta é resolvido e só sobra m3
    saldosAtuais[0]!.status = 'OK';
    saldosAtuais[0]!.saldo = 200;
    saldosAtuais[0]!.dias_restantes = 33;

    const aposReposicao = service.listar();
    expect(aposReposicao).toHaveLength(1);
    expect(aposReposicao[0]?.medicamento_nome).toBe('Vacina V10');
    expect(service.contar().total).toBe(1);
  });

  it('Trilha3Ipc: registra todos os 19 canais IPC da Trilha 3 com validação de perfil (MASTER, VETERINARIO, ATENDENTE e sem sessão)', async () => {
    handlersRegistrados.clear();
    const { definirSessao, permitirOrigemIpc } = await import('../../ipc/registry');
    const { registrarTrilha3Ipc } = await import('../../ipc/trilha3.ipc');

    permitirOrigemIpc(1, () => undefined);
    const eventoValido = { sender: { id: 1, mainFrame: 'frame-1' }, senderFrame: 'frame-1' };

    const banco = new BancoSqlAlertasEspiao();
    registrarTrilha3Ipc(banco);

    const canaisEsperados = [
      'medicamentos:listar',
      'medicamentos:obter',
      'medicamentos:criar',
      'medicamentos:atualizar',
      'medicamentos:inativar',
      'fornecedores:listar',
      'fornecedores:obter',
      'fornecedores:criar',
      'fornecedores:atualizar',
      'fornecedores:inativar',
      'fornecedores:precos_listar',
      'fornecedores:precos_salvar',
      'fornecedores:precos_inativar',
      'dolar:atual',
      'estoque:saldos',
      'estoque:lotes',
      'estoque:movimentar',
      'alertas:listar',
      'alertas:contar',
    ];

    for (const canal of canaisEsperados) {
      expect(handlersRegistrados.has(canal)).toBe(true);
    }

    // 1. Sem sessão -> NAO_AUTENTICADO
    definirSessao(null);
    const respSemSessao = (await handlersRegistrados.get('medicamentos:listar')!.fn(eventoValido, {})) as {
      ok: boolean;
      erro?: { codigo: string };
    };
    expect(respSemSessao.ok).toBe(false);
    expect(respSemSessao.erro?.codigo).toBe('NAO_AUTENTICADO');

    // 2. ATENDENTE pode ler medicamentos:listar e estoque:saldos, mas não pode criar medicamento nem acessar fornecedores:listar
    definirSessao({ usuarioId: 'u-atend', nome: 'Atendente', perfil: 'ATENDENTE', expiraEm: Date.now() + 60_000 });
    const respLeituraAtend = (await handlersRegistrados.get('medicamentos:listar')!.fn(eventoValido, {})) as { ok: boolean };
    expect(respLeituraAtend.ok).toBe(true);

    const respEscritaAtend = (await handlersRegistrados.get('medicamentos:criar')!.fn(eventoValido, {})) as {
      ok: boolean;
      erro?: { codigo: string };
    };
    expect(respEscritaAtend.ok).toBe(false);
    expect(respEscritaAtend.erro?.codigo).toBe('SEM_PERMISSAO');

    const respFornAtend = (await handlersRegistrados.get('fornecedores:listar')!.fn(eventoValido, {})) as {
      ok: boolean;
      erro?: { codigo: string };
    };
    expect(respFornAtend.ok).toBe(false);
    expect(respFornAtend.erro?.codigo).toBe('SEM_PERMISSAO');

    // 3. VETERINARIO pode ler estoque:saldos e alertas:contar, mas não pode estoque:movimentar
    definirSessao({ usuarioId: 'u-vet', nome: 'Veterinário', perfil: 'VETERINARIO', expiraEm: Date.now() + 60_000 });
    const respAlertasVet = (await handlersRegistrados.get('alertas:contar')!.fn(eventoValido, {})) as { ok: boolean };
    expect(respAlertasVet.ok).toBe(true);

    const respMovVet = (await handlersRegistrados.get('estoque:movimentar')!.fn(eventoValido, {})) as {
      ok: boolean;
      erro?: { codigo: string };
    };
    expect(respMovVet.ok).toBe(false);
    expect(respMovVet.erro?.codigo).toBe('SEM_PERMISSAO');

    // 4. MASTER pode acessar fornecedores:listar e medicamentos:criar
    definirSessao({ usuarioId: 'u-master', nome: 'Admin', perfil: 'MASTER', expiraEm: Date.now() + 60_000 });
    const respFornMaster = (await handlersRegistrados.get('fornecedores:listar')!.fn(eventoValido, {})) as { ok: boolean };
    expect(respFornMaster.ok).toBe(true);
  });
});
