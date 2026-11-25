import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { expect, it } from 'vitest';
import { ConexaoLocal } from '../db/local/conexao-local';
import { EsquemaLocal } from '../db/local/esquema-local';
import { OutboxRepository } from '../modules/admin/outbox.repository';
import { agoraEmSegundos } from '../modules/admin/transacao';
import { AuditoriaRepository } from '../modules/auditoria/auditoria.repository';
import { AuditoriaService } from '../modules/auditoria/auditoria.service';
import { SessaoEmMemoria } from '../modules/auth/sessao-em-memoria';
import { ColaboradoresRepository } from '../modules/colaboradores/colaboradores.repository';
import { SyncConflitosRepository } from '../modules/sync-conflitos/sync-conflitos.repository';
import { SyncConflitosService } from '../modules/sync-conflitos/sync-conflitos.service';
import { CentralSyncRepository } from './central.repository';
import { EstadoSyncRepository } from './estado.repository';
import { MotorSync } from './motor';
import type { CentralSync } from './tipos';

const porta = process.env.TESTE_MYSQL_SYNC_PORTA;
const schema = process.env.TESTE_MYSQL_SYNC_BANCO;
const executar = porta && schema ? it : it.skip;

executar(
  'sincroniza dois SQLite reais via MySQL, preserva a ordem após falha e detecta conflitos',
  async () => {
    if (!porta || !schema?.startsWith('teste_sync_')) throw new Error('Use um MySQL isolado para testes.');
    const pasta = mkdtempSync(join(tmpdir(), 'teste-sync-trilha1-'));
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: Number(porta),
      user: 'root',
      database: schema,
      timezone: '+00:00',
      dateStrings: ['DATE'],
      ...(process.env.TESTE_MYSQL_SYNC_CA && {
        ssl: { ca: process.env.TESTE_MYSQL_SYNC_CA, rejectUnauthorized: true, verifyIdentity: true }
      })
    });
    const central = new CentralSyncRepository(async (trabalho) => {
      const conn = await pool.getConnection();
      try {
        await conn.query("SET time_zone = '+00:00'");
        await conn.beginTransaction();
        const saida = await trabalho(conn);
        await conn.commit();
        return saida;
      } catch (erro) {
        await conn.rollback();
        throw erro;
      } finally {
        conn.release();
      }
    });
    const a = new ConexaoLocal(join(pasta, 'a.sqlite'));
    const b = new ConexaoLocal(join(pasta, 'b.sqlite'));
    const abrir = (banco: ConexaoLocal) => {
      banco.abrir();
      new EsquemaLocal(banco).aplicar();
    };
    const primeiro = new MotorSync(a, central, 100);
    const segundo = new MotorSync(b, central, 100);
    const filaA = new OutboxRepository(a);
    const filaB = new OutboxRepository(b);
    const idConfig = randomUUID();
    const idPessoa = randomUUID();
    const idConta = randomUUID();
    const instante = agoraEmSegundos();

    function salvar(
      banco: ConexaoLocal,
      fila: OutboxRepository,
      tabela: string,
      id: string,
      operacao: 'inserir' | 'atualizar' = 'inserir'
    ) {
      const dados = new SyncConflitosRepository(banco).obterRegistro(tabela, id);
      if (!dados) throw new Error('Registro de teste não criado.');
      fila.enfileirar(tabela, id, operacao, dados);
    }

    const nome = (banco: ConexaoLocal) =>
      banco.prepare('SELECT nome_clinica FROM configuracoes WHERE id = ?').get(idConfig);

    function resolver(banco: ConexaoLocal, fila: OutboxRepository, id: string, escolha: 'LOCAL' | 'CENTRAL') {
      new SyncConflitosService(
        banco,
        new SyncConflitosRepository(banco),
        fila,
        new AuditoriaService(new AuditoriaRepository(banco), fila),
        new ColaboradoresRepository(banco),
        new SessaoEmMemoria()
      ).resolver(id, escolha, { usuarioId: idConta, nome: 'Conta de teste', perfil: 'MASTER' });
    }

    try {
      abrir(a);
      abrir(b);
      a.prepare('INSERT INTO colaboradores (id, nome, cpf, cargo) VALUES (?, ?, ?, ?)').run(
        idPessoa,
        'Teste',
        '88776655544',
        'Administrador'
      );
      a.prepare(
        "INSERT INTO usuarios (id, colaborador_id, login, senha_hash, perfil) VALUES (?, ?, ?, ?, 'MASTER')"
      ).run(idConta, idPessoa, 'teste_sync', 'valor-sintetico');
      a.prepare(
        `INSERT INTO configuracoes (id, nome_clinica, template_lembrete, backup_horario, backup_manter)
      VALUES (?, ?, ?, ?, ?)`
      ).run(idConfig, 'Antes', 'Teste', '20:00', 7);
      salvar(a, filaA, 'colaboradores', idPessoa);
      salvar(a, filaA, 'usuarios', idConta);
      salvar(a, filaA, 'configuracoes', idConfig);

      // Perder a confirmação após o COMMIT deve deixar a operação pronta para uma repetição idempotente.
      const semConfirmacao: CentralSync = {
        preparar: () => central.preparar(),
        puxar: (cursor, limite) => central.puxar(cursor, limite),
        enviar: async (...args) => {
          await central.enviar(...args);
          throw new Error('Conexão interrompida após o commit.');
        }
      };
      const duranteQueda = new MotorSync(a, semConfirmacao, 100);
      expect(await duranteQueda.executarPush()).toEqual({ enviados: 0, erros: 1 });
      expect(filaA.contarPendencias()).toBe(3);
      expect(await primeiro.executarPush()).toEqual({ enviados: 3, erros: 0 });
      expect((await central.puxar(0, 100)).map((x) => x.tabela)).toEqual([
        'colaboradores',
        'usuarios',
        'configuracoes'
      ]);
      expect(await segundo.executarPull()).toEqual({ atualizados: 3 });
      expect(nome(b)).toEqual({ nome_clinica: 'Antes' });
      expect(filaB.contarPendencias()).toBe(0);

      // Os dois PCs editaram a mesma versão offline.
      a.prepare('UPDATE configuracoes SET nome_clinica = ?, atualizado_em = ? WHERE id = ?').run(
        'Alteração do A',
        instante + 1,
        idConfig
      );
      b.prepare('UPDATE configuracoes SET nome_clinica = ?, atualizado_em = ? WHERE id = ?').run(
        'Alteração do B',
        instante + 2,
        idConfig
      );
      salvar(a, filaA, 'configuracoes', idConfig, 'atualizar');
      salvar(b, filaB, 'configuracoes', idConfig, 'atualizar');

      const resultados = await Promise.all([primeiro.executarPush(), segundo.executarPush()]);
      expect(resultados.map((r) => r.enviados).sort()).toEqual([0, 1]);
      const aVenceu = resultados[0].enviados === 1;
      const perdedor = aVenceu ? b : a;
      const perdedorMotor = aVenceu ? segundo : primeiro;
      const ganhadorMotor = aVenceu ? primeiro : segundo;
      const perdedorFila = aVenceu ? filaB : filaA;
      const conflitoRepo = new SyncConflitosRepository(perdedor);
      const [conflito] = conflitoRepo.listar();
      expect(conflito).toMatchObject({ tipo: 'EDICAO_CONCORRENTE', registro_id: idConfig });
      await perdedorMotor.executarPull();
      expect(conflitoRepo.listar()).toHaveLength(1);
      resolver(perdedor, perdedorFila, conflito.id, 'LOCAL');
      expect(await perdedorMotor.executarPush()).toMatchObject({ enviados: 2, erros: 0 });
      await ganhadorMotor.executarPull();
      expect(nome(a)).toEqual(nome(b));
      expect(nome(a)).toEqual({ nome_clinica: aVenceu ? 'Alteração do B' : 'Alteração do A' });

      const cursor = new EstadoSyncRepository(b).cursor();
      b.fechar();
      abrir(b);
      expect(new EstadoSyncRepository(b).cursor()).toBe(cursor);
      await segundo.executarPull();
      expect(filaB.contarPendencias()).toBe(0);

      // O central preserva seu último administrador mesmo diante de um dado local incorreto.
      a.prepare("UPDATE usuarios SET perfil = 'ATENDENTE' WHERE id = ?").run(idConta);
      salvar(a, filaA, 'usuarios', idConta, 'atualizar');
      expect(await primeiro.executarPush()).toEqual({ enviados: 0, erros: 0 });
      const [bloqueio] = new SyncConflitosRepository(a).listar();
      expect(bloqueio).toMatchObject({ tipo: 'ULTIMO_MASTER', registro_id: idConta });
      resolver(a, filaA, bloqueio.id, 'CENTRAL');
      expect(a.prepare('SELECT perfil FROM usuarios WHERE id = ?').get(idConta)).toEqual({ perfil: 'MASTER' });

      const cliente = randomUUID();
      const animal = randomUUID();
      const medicamento = randomUUID();
      const lote = randomUUID();
      const movimento = randomUUID();
      a.prepare('INSERT INTO clientes (id, nome, cpf) VALUES (?, ?, ?)').run(cliente, 'Teste Cliente', '33322244455');
      a.prepare(
        "INSERT INTO animais (id, cliente_id, nome, especie, sexo) VALUES (?, ?, 'Teste Animal', 'Canina', 'F')"
      ).run(animal, cliente);
      a.prepare("INSERT INTO medicamentos (id, nome, unidade) VALUES (?, 'Teste Medicamento', 'un')").run(medicamento);
      a.prepare(
        "INSERT INTO lotes_estoque (id, medicamento_id, numero, validade) VALUES (?, ?, 'LT1', '2099-01-01')"
      ).run(lote, medicamento);
      function mover(banco: ConexaoLocal, id: string, quantidade: number) {
        banco
          .prepare(
            `INSERT INTO movimentacoes_estoque (id, medicamento_id, lote_id, usuario_id, tipo, quantidade)
        VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(id, medicamento, lote, idConta, quantidade > 0 ? 'ENTRADA' : 'SAIDA', quantidade);
      }
      mover(a, movimento, 2);
      for (const [tabela, id] of [
        ['clientes', cliente],
        ['animais', animal],
        ['medicamentos', medicamento],
        ['lotes_estoque', lote],
        ['movimentacoes_estoque', movimento]
      ])
        salvar(a, filaA, tabela, id);
      expect((await primeiro.executarCiclo()).erros).toBe(0);
      await segundo.executarPull();

      const novosA = { cpf: randomUUID(), agenda: randomUUID(), movimento: randomUUID() };
      const novosB = { cpf: randomUUID(), agenda: randomUUID(), movimento: randomUUID() };
      for (const [banco, fila, ids, quantidade] of [
        [a, filaA, novosA, -2],
        [b, filaB, novosB, -1]
      ] as const) {
        banco
          .prepare("INSERT INTO clientes (id, nome, cpf) VALUES (?, 'Cadastro offline', '01234567890')")
          .run(ids.cpf);
        banco
          .prepare(
            `INSERT INTO agendamentos (id, animal_id, veterinario_id, inicio, duracao_min)
        VALUES (?, ?, ?, ?, 30)`
          )
          .run(ids.agenda, animal, idPessoa, instante + 3600);
        mover(banco, ids.movimento, quantidade);
        salvar(banco, fila, 'clientes', ids.cpf);
        salvar(banco, fila, 'agendamentos', ids.agenda);
        salvar(banco, fila, 'movimentacoes_estoque', ids.movimento);
      }
      expect(await primeiro.executarPush()).toEqual({ enviados: 3, erros: 0 });
      expect(await segundo.executarPush()).toEqual({ enviados: 0, erros: 0 });
      const abertosB = new SyncConflitosRepository(b).listar();
      expect(abertosB.map((c) => c.tipo).sort()).toEqual([
        'AGENDA_SOBREPOSTA',
        'CPF_DUPLICADO',
        'ESTOQUE_INSUFICIENTE'
      ]);
      for (const conflito of abertosB.filter((c) => c.tipo !== 'CPF_DUPLICADO')) {
        resolver(b, filaB, conflito.id, 'CENTRAL');
      }
      expect(b.prepare('SELECT status, ativo FROM agendamentos WHERE id = ?').get(novosB.agenda)).toEqual({
        status: 'CANCELADO',
        ativo: 0
      });
      expect(
        b
          .prepare('SELECT SUM(quantidade) AS saldo FROM movimentacoes_estoque WHERE medicamento_id = ?')
          .get(medicamento)
      ).toEqual({ saldo: 2 });
      const cpf = abertosB.find((c) => c.tipo === 'CPF_DUPLICADO')!;
      b.prepare("UPDATE clientes SET cpf = '12345678901' WHERE id = ?").run(novosB.cpf);
      resolver(b, filaB, cpf.id, 'LOCAL');
      expect((await segundo.executarCiclo()).erros).toBe(0);
      expect(
        b
          .prepare('SELECT SUM(quantidade) AS saldo FROM movimentacoes_estoque WHERE medicamento_id = ?')
          .get(medicamento)
      ).toEqual({ saldo: 0 });
      expect(new SyncConflitosRepository(b).listar()).toEqual([]);

      const replicas = Array.from({ length: 5 }, () => new ConexaoLocal(':memory:'));
      try {
        const motores = replicas.map((banco) => {
          abrir(banco);
          return new MotorSync(banco, central, 100);
        });
        await Promise.all(motores.map((motor) => motor.executarPull()));
        for (const [indice, banco] of replicas.entries()) {
          banco
            .prepare('UPDATE configuracoes SET nome_clinica = ? WHERE id = ?')
            .run('Editor concorrente ' + indice, idConfig);
          salvar(banco, new OutboxRepository(banco), 'configuracoes', idConfig, 'atualizar');
        }
        const edicoes = await Promise.all(motores.map((motor) => motor.executarPush()));
        expect(edicoes.filter((r) => r.enviados === 1)).toHaveLength(1);
        expect(edicoes.every((r) => r.erros === 0)).toBe(true);
        expect(replicas.flatMap((banco) => new SyncConflitosRepository(banco).listar())).toHaveLength(4);
      } finally {
        for (const banco of replicas) banco.fechar();
      }
    } finally {
      await pool.end();
      a.fechar();
      b.fechar();
      rmSync(pasta, { recursive: true, force: true });
    }
  },
  30000
);
