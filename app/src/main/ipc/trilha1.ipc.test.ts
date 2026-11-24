import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canaisTrilha1 } from '@clinica-vet/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConexaoLocal } from '../db/local/conexao-local';
import { EsquemaLocal } from '../db/local/esquema-local';
import { HashSenha } from '../modules/auth/hash-senha';
import { UsuarioRepository } from '../modules/auth/usuario.repository';
import { permitirOrigemIpc, sessoes } from './registry';
import { criarTrilha1, registrarTrilha1 } from './trilha1.ipc';

type Resposta = { ok: true; dados: unknown } | { ok: false; erro: { codigo: string; mensagem: string } };
const evento = { sender: { id: 1, mainFrame: {} }, senderFrame: {} };
evento.senderFrame = evento.sender.mainFrame;
const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (evento: unknown, dados?: unknown) => Promise<Resposta>>()
}));
vi.mock('electron', () => ({
  ipcMain: { handle: (canal: string, fn: (evento: unknown, dados?: unknown) => Promise<Resposta>) => handlers.set(canal, fn) }
}));

const novo = { nome: 'Rita', cpf: '52998224725', telefone: '', cargo: 'Recepção', perfil: 'ATENDENTE', login: 'rita', senha: 'senha-inicial' };
const pagina = { pagina: 1, tamanho: 10 };
const hash = new HashSenha(10);

describe('Trilha 1 via registry IPC e SQLite', () => {
  let pasta: string;
  let banco: ConexaoLocal;
  let masterId: string;
  let destruir: () => void;
  let services: ReturnType<typeof criarTrilha1>;

  beforeEach(async () => {
    pasta = mkdtempSync(join(tmpdir(), 'clinica-trilha1-'));
    banco = new ConexaoLocal(join(pasta, 'clinica.sqlite'));
    banco.abrir();
    new EsquemaLocal(banco).aplicar();
    const usuarios = new UsuarioRepository(banco);
    usuarios.criar({ login: 'admin', nome: 'Admin', cpf: '01234567890', cargo: 'Administrador', perfil: 'MASTER', senhaHash: await hash.gerar('senha-admin') });
    masterId = usuarios.buscarAtivoPorLogin('admin')!.id;
    permitirOrigemIpc(1, (remover) => { destruir = remover; });
    autenticar();
    services = criarTrilha1(banco, hash);
    registrarTrilha1(services);
  });

  afterEach(() => {
    destruir();
    sessoes.definir(null);
    handlers.clear();
    banco.fechar();
    rmSync(pasta, { recursive: true, force: true });
  });

  function autenticar(perfil: 'MASTER' | 'ATENDENTE' | 'VETERINARIO' = 'MASTER', expiraEm = Date.now() + 60_000) {
    sessoes.definir({ usuarioId: masterId, nome: 'Admin', perfil, expiraEm });
  }

  async function invocar(canal: string, dados?: unknown) {
    const handler = handlers.get(canal);
    if (!handler) throw new Error('Canal não registrado: ' + canal);
    return handler(evento, dados);
  }

  async function sucesso(canal: keyof typeof canaisTrilha1, dados?: unknown) {
    const resposta = await invocar(canal, dados);
    expect(resposta).toMatchObject({ ok: true });
    if (!resposta.ok) throw new Error(resposta.erro.mensagem);
    return canaisTrilha1[canal].saida.parse(resposta.dados);
  }

  function contar(tabela: 'auditoria' | 'sync_outbox' | 'colaboradores') {
    return (banco.prepare('SELECT COUNT(*) AS total FROM ' + tabela).get() as { total: number }).total;
  }

  it('registra todos os canais e autoriza somente MASTER, com leitura limitada do lembrete', async () => {
    expect([...handlers.keys()].sort()).toEqual(Object.keys(canaisTrilha1).sort());
    for (const perfil of ['ATENDENTE', 'VETERINARIO'] as const) {
      autenticar(perfil);
      for (const canal of handlers.keys()) {
        const resposta = await invocar(canal);
        if (canal === 'configuracoes:obter') {
          expect(resposta).toMatchObject({ ok: true, dados: { template_lembrete: expect.any(String) } });
          if (resposta.ok) expect(Object.keys(resposta.dados as object)).toEqual(['template_lembrete']);
        } else {
          expect(resposta).toMatchObject({ ok: false, erro: { codigo: 'SEM_PERMISSAO' } });
        }
      }
    }
    autenticar('MASTER', Date.now() - 1);
    expect(await invocar('backup:listar')).toMatchObject({ ok: false, erro: { codigo: 'SESSAO_EXPIRADA' } });
    expect(await invocar('backup:listar')).toMatchObject({ ok: false, erro: { codigo: 'NAO_AUTENTICADO' } });
    autenticar();
    const iframe = { ...evento, senderFrame: {} };
    expect(await handlers.get('backup:listar')!(iframe)).toMatchObject({ ok: false, erro: { codigo: 'SEM_PERMISSAO' } });
  });

  it('cria, lista, altera, redefine senha e inativa com hashes e outbox atômica', async () => {
    const criado = await sucesso('colaboradores:criar', novo) as { id: string };
    expect(criado).not.toHaveProperty('senha');
    expect(criado).not.toHaveProperty('senha_hash');
    expect(await sucesso('colaboradores:obter', { id: criado.id })).toEqual(criado);
    expect(contar('auditoria')).toBe(1);
    expect(contar('sync_outbox')).toBe(3);
    expect(await sucesso('colaboradores:listar', { ...pagina, busca: 'rita' })).toMatchObject({ total: 1, itens: [criado] });
    expect(await sucesso('colaboradores:atualizar', { id: criado.id, telefone: '11999999999' }))
      .toMatchObject({ nome: 'Rita', telefone: '11999999999' });
    await sucesso('colaboradores:redefinir_senha', { id: criado.id, nova_senha: 'outra-senha' });
    const usuario = new UsuarioRepository(banco).buscarAtivoPorLogin('rita')!;
    expect(await hash.comparar('outra-senha', usuario.senhaHash)).toBe(true);
    expect(await hash.comparar(novo.senha, usuario.senhaHash)).toBe(false);
    await sucesso('colaboradores:inativar', { id: criado.id });
    expect(await sucesso('colaboradores:listar', { ...pagina, busca: 'rita' })).toMatchObject({ total: 0 });
    expect(banco.prepare('SELECT ativo FROM usuarios WHERE id = ?').get(usuario.id)).toEqual({ ativo: 0 });
    const aud = await sucesso('auditoria:listar', { ...pagina, periodo: 'HOJE', busca: 'Rita', entidade: 'colaboradores', acao: 'ATUALIZAR' });
    expect(aud).toMatchObject({ total: 2, itens: [expect.objectContaining({ usuario_nome: 'Admin' }), expect.anything()] });
    const json = JSON.stringify(banco.prepare('SELECT * FROM auditoria').all());
    expect(json).not.toMatch(/senha_hash|senha-inicial|outra-senha|\$2[aby]\$/);
  });

  it('aplica códigos de negócio e reverte a escrita se a auditoria falhar', async () => {
    const id = (banco.prepare('SELECT colaborador_id FROM usuarios WHERE id = ?').get(masterId) as { colaborador_id: string }).colaborador_id;
    for (const [canal, entrada, codigo] of [
      ['colaboradores:criar', { ...novo, login: 'ADMIN' }, 'LOGIN_DUPLICADO'],
      ['colaboradores:criar', { ...novo, cpf: '01234567890' }, 'CPF_DUPLICADO'],
      ['colaboradores:criar', { ...novo, perfil: 'VETERINARIO' }, 'CRMV_OBRIGATORIO'],
      ['colaboradores:criar', { ...novo, senha: 'á'.repeat(40) }, 'DADOS_INVALIDOS'],
      ['colaboradores:inativar', { id }, 'ULTIMO_MASTER'],
      ['colaboradores:atualizar', { id, perfil: 'ATENDENTE' }, 'ULTIMO_MASTER']
    ] as const) {
      expect(await invocar(canal, entrada)).toMatchObject({ ok: false, erro: { codigo } });
    }
    expect(contar('sync_outbox')).toBe(0);
    banco.exec("CREATE TRIGGER impedir_auditoria BEFORE INSERT ON auditoria BEGIN SELECT RAISE(ABORT, 'simulado'); END");
    expect(await invocar('colaboradores:criar', novo)).toMatchObject({ ok: false, erro: { codigo: 'ERRO_INTERNO' } });
    expect(contar('colaboradores')).toBe(1);
    expect(contar('sync_outbox')).toBe(0);
    expect(new UsuarioRepository(banco).buscarAtivoPorLogin('rita')).toBeUndefined();
  });

  it('combina atualizações parciais e restaura backup consistente sem apagar auditoria', async () => {
    await sucesso('configuracoes:atualizar', { nome_clinica: 'Veterinária Teste', cep: '', telefone: '' });
    await sucesso('configuracoes:atualizar', { backup_horario: '01:15', backup_manter: 10 });
    const backup = await sucesso('backup:criar') as { id: string };
    expect(backup).toMatchObject({ tipo: 'MANUAL', tamanho_bytes: expect.any(Number) });
    banco.prepare("UPDATE sync_outbox SET enviado_em = 1760000000 WHERE tabela = 'configuracoes'").run();
    await sucesso('configuracoes:atualizar', { nome_clinica: 'Alterada depois do backup' });
    await sucesso('backup:restaurar', { id: backup.id });
    expect(sessoes.obter()).toBeNull();
    autenticar();
    expect(await sucesso('configuracoes:obter')).toMatchObject({ nome_clinica: 'Veterinária Teste', backup_horario: '01:15' });
    expect(await sucesso('backup:listar')).toHaveLength(2);
    expect(await sucesso('auditoria:listar', { ...pagina, acao: 'RESTAURAR' })).toMatchObject({ total: 1 });
    expect(await sucesso('auditoria:listar', pagina)).toMatchObject({ total: 5 });
    expect(banco.prepare("SELECT count(*) AS total FROM sync_outbox WHERE tabela = 'configuracoes' AND enviado_em IS NOT NULL").get())
      .toEqual({ total: 2 });
    expect(await invocar('backup:restaurar', { id: '../clinica.sqlite' })).toMatchObject({ ok: false, erro: { codigo: 'DADOS_INVALIDOS' } });
    writeFileSync(join(pasta, 'backups', 'MANUAL_c42450ca-563a-46fd-ab9b-57e726846d20.sqlite'), 'arquivo inválido');
    expect(await invocar('backup:restaurar', { id: 'c42450ca-563a-46fd-ab9b-57e726846d20' }))
      .toMatchObject({ ok: false, erro: { codigo: 'BACKUP_INVALIDO' } });
    expect(await sucesso('configuracoes:obter')).toMatchObject({ nome_clinica: 'Veterinária Teste' });
  });

  it('agenda uma cópia por dia de São Paulo e mantém a última cópia ao aplicar retenção', async () => {
    await sucesso('configuracoes:atualizar', { backup_horario: '20:00', backup_manter: 1 });
    const antes = new Date('2030-01-11T22:59:00.000Z');
    const horario = new Date('2030-01-11T23:00:00.000Z');
    await services.backup.executarAgendado(antes);
    expect(await sucesso('backup:listar')).toEqual([]);
    await services.backup.executarAgendado(horario);
    expect(await sucesso('backup:listar')).toMatchObject([{ tipo: 'AUTOMATICO' }]);
    const manual = await sucesso('backup:criar');
    expect(await sucesso('backup:listar')).toEqual([manual]);
    await services.backup.executarAgendado(new Date('2030-01-12T00:01:00.000Z'));
    expect(await sucesso('backup:listar')).toEqual([manual]);
    expect(await sucesso('auditoria:listar', { ...pagina, acao: 'BACKUP' })).toMatchObject({ total: 2 });
  });

  it('resolve as duas escolhas e remove apenas pendências substituídas', async () => {
    await sucesso('configuracoes:atualizar', { nome_clinica: 'Versão local' });
    const local = banco.prepare('SELECT * FROM configuracoes').get() as { id: string; nome_clinica: string };
    const inserir = () => banco.prepare(
      'INSERT INTO sync_conflitos (tabela, registro_id, tipo, dados_local, dados_central) VALUES (?, ?, ?, ?, ?)'
    ).run('configuracoes', local.id, 'EDICAO_CONCORRENTE', JSON.stringify(local), JSON.stringify({ ...local, nome_clinica: 'Versão central' }));
    inserir();
    await sucesso('sync_conflitos:resolver', { id: '1', escolha: 'LOCAL' });
    expect(await sucesso('configuracoes:obter')).toMatchObject({ nome_clinica: 'Versão local' });
    const pendentesConfig = () => banco.prepare("SELECT COUNT(*) AS total FROM sync_outbox WHERE tabela = 'configuracoes'").get();
    expect(pendentesConfig()).toEqual({ total: 1 });
    inserir();
    expect(await sucesso('sync_conflitos:listar')).toMatchObject([{ id: '2', dados_central: { nome_clinica: 'Versão central' } }]);
    await sucesso('sync_conflitos:resolver', { id: '2', escolha: 'CENTRAL' });
    expect(pendentesConfig()).toEqual({ total: 0 });
    expect(await sucesso('configuracoes:obter')).toMatchObject({ nome_clinica: 'Versão central' });
    expect(await sucesso('sync_conflitos:listar')).toEqual([]);
    expect(await sucesso('auditoria:listar', { ...pagina, acao: 'RESOLVER_CONFLITO' })).toMatchObject({ total: 2 });
    expect(await invocar('sync_conflitos:resolver', { id: '2', escolha: 'CENTRAL' })).toMatchObject({ ok: false, erro: { codigo: 'CONFLITO_NAO_ENCONTRADO' } });

    const usuario = banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(masterId) as object;
    banco.prepare(
      'INSERT INTO sync_conflitos (tabela, registro_id, tipo, dados_local, dados_central) VALUES (?, ?, ?, ?, ?)'
    ).run('usuarios', masterId, 'EDICAO_CONCORRENTE', JSON.stringify(usuario), JSON.stringify({ ...usuario, ativo: false }));
    const visivel = await sucesso('sync_conflitos:listar');
    expect(JSON.stringify(visivel)).not.toContain('senha_hash');
    expect(await invocar('sync_conflitos:resolver', { id: '3', escolha: 'CENTRAL' }))
      .toMatchObject({ ok: false, erro: { codigo: 'ULTIMO_MASTER' } });
    expect(await sucesso('sync_conflitos:listar')).toEqual(visivel);
    expect(banco.prepare('SELECT ativo FROM usuarios WHERE id = ?').get(masterId)).toEqual({ ativo: 1 });
  });
});
