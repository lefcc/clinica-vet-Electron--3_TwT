import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConexaoLocal } from '../db/local/conexao-local';
import { EsquemaLocal } from '../db/local/esquema-local';
import { permitirOrigemIpc, sessoes } from './registry';
import { registrarTrilha4Ipc } from './trilha4.ipc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resposta = { ok: boolean; dados?: any; erro?: { codigo: string } };
const canais = vi.hoisted(() => new Map<string, (evento: unknown, dados: unknown) => Promise<unknown>>());
const abertos = vi.hoisted(() => [] as string[]);

vi.mock('electron', () => ({
  ipcMain: { handle: (canal: string, fn: (e: unknown, d: unknown) => Promise<unknown>) => canais.set(canal, fn) },
  shell: { openExternal: async (url: string) => void abertos.push(url) },
  net: { isOnline: () => true },
  dialog: {},
  BrowserWindow: {}
}));

const principal = {};
const evento = { sender: { id: 1, mainFrame: principal }, senderFrame: principal };
const chamar = (canal: string, dados?: unknown) => canais.get(canal)!(evento, dados) as Promise<Resposta>;
const entrar = (perfil: 'MASTER' | 'VETERINARIO' | 'ATENDENTE', usuarioId = 'u-master') =>
  sessoes.definir({ usuarioId, nome: 'Teste', perfil, expiraEm: Date.now() + 60000 });

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const maisDias = (n: number) => new Date(Date.parse(`${hoje()}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

describe('Trilha 4 pelo IPC', () => {
  let banco: ConexaoLocal;

  beforeEach(() => {
    canais.clear();
    abertos.length = 0;
    banco = new ConexaoLocal(':memory:');
    banco.abrir();
    new EsquemaLocal(banco).aplicar();
    banco.exec(`
      INSERT INTO colaboradores (id, nome, cpf, cargo) VALUES ('col-master', 'Ana', '11111111111', 'Dona'),
        ('col-vet', 'Dra. Bia', '22222222222', 'Veterinária');
      INSERT INTO usuarios (id, colaborador_id, login, senha_hash, perfil) VALUES ('u-master', 'col-master', 'ana', 'x', 'MASTER'),
        ('u-vet', 'col-vet', 'bia', 'x', 'VETERINARIO');
      INSERT INTO clientes (id, nome, cpf, telefone) VALUES ('c1', 'Carlos', '33333333333', '19999998888');
      INSERT INTO animais (id, cliente_id, nome, especie, sexo) VALUES ('a1', 'c1', 'Rex', 'Cão', 'M');
    `);
    permitirOrigemIpc(1, () => undefined);
    registrarTrilha4Ipc(banco, {
      configuracoes: () => ({ nome_clinica: 'Clínica', template_lembrete: '{tutor}: {vacina} de {animal} em {data}', backup_horario: '20:00', backup_manter: 7 })
    });
    entrar('MASTER');
  });

  afterEach(() => {
    sessoes.definir(null);
    banco.fechar();
  });

  const contar = (sql: string) => (banco.prepare(sql).get() as { n: number }).n;

  it('vacina: aplica, calcula o reforço, entra na fila e registra o lembrete', async () => {
    const vacina = await chamar('vacinas:catalogo_criar', { nome: 'V10', intervalo_reforco_dias: 2 });
    expect(vacina.ok).toBe(true);
    const aplicada = await chamar('vacinas:aplicar', { animal_id: 'a1', vacina_id: vacina.dados.id, data: hoje() });
    expect(aplicada.dados.proxima_dose).toBe(maisDias(2));

    const fila = await chamar('vacinas:fila');
    expect(fila.dados).toHaveLength(1);
    expect(fila.dados[0]).toMatchObject({ animal_nome: 'Rex', cliente_nome: 'Carlos', lembrete_enviado: false });

    expect((await chamar('vacinas:lembrete_registrar', { id: fila.dados[0].id })).ok).toBe(true);
    expect((await chamar('vacinas:lembrete_registrar', { id: fila.dados[0].id })).ok).toBe(true);
    expect((await chamar('vacinas:fila')).dados[0].lembrete_enviado).toBe(true);
    expect(contar('SELECT count(*) AS n FROM lembretes_vacina')).toBe(1);
    expect(contar("SELECT count(*) AS n FROM sync_outbox WHERE tabela = 'vacinas_aplicacoes'")).toBe(1);
  });

  it('vacina: reforço longe não aparece e data no futuro é recusada', async () => {
    const vacina = await chamar('vacinas:catalogo_criar', { nome: 'Raiva', intervalo_reforco_dias: 365 });
    await chamar('vacinas:aplicar', { animal_id: 'a1', vacina_id: vacina.dados.id, data: hoje() });
    expect((await chamar('vacinas:fila')).dados).toHaveLength(0);
    const futura = await chamar('vacinas:aplicar', { animal_id: 'a1', vacina_id: vacina.dados.id, data: maisDias(1) });
    expect(futura.erro?.codigo).toBe('DADOS_INVALIDOS');
  });

  it('orçamento: recalcula o total, numera em sequência e usa o nome do banco', async () => {
    const servico = await chamar('servicos:criar', { nome: 'Consulta', valor_centavos: 15000 });
    entrar('ATENDENTE');
    const pedido = {
      cliente_id: 'c1', animal_id: 'a1', forma_pagamento: 'PIX', desconto_centavos: 1000,
      itens: [{ tipo: 'SERVICO', item_id: servico.dados.id, descricao: 'texto qualquer', quantidade: 2, valor_unitario_centavos: 15000 }]
    };
    const um = await chamar('orcamentos:criar', pedido);
    expect(um.dados).toMatchObject({ numero: 1, total_centavos: 29000, cliente_nome: 'Carlos', animal_nome: 'Rex' });
    expect(um.dados.itens[0].descricao).toBe('Consulta');
    const dois = await chamar('orcamentos:criar', { ...pedido, desconto_centavos: 999999 });
    expect(dois.dados).toMatchObject({ numero: 2, total_centavos: 0 });
    expect((await chamar('orcamentos:listar', { pagina: 1, tamanho: 10, busca: 'rex' })).dados.total).toBe(2);
  });

  it('orçamento com item inexistente não grava nada', async () => {
    const r = await chamar('orcamentos:criar', {
      cliente_id: 'c1', forma_pagamento: 'PIX', desconto_centavos: 0,
      itens: [{ tipo: 'SERVICO', item_id: 'nao-existe', descricao: 'x', quantidade: 1, valor_unitario_centavos: 100 }]
    });
    expect(r.erro?.codigo).toBe('NAO_ENCONTRADO');
    expect(contar('SELECT count(*) AS n FROM orcamentos')).toBe(0);
    expect(contar("SELECT count(*) AS n FROM sync_outbox WHERE tabela = 'orcamentos'")).toBe(0);
  });

  it('perfis: veterinário não vê orçamento nem envia lembrete; atendente não vê relatório', async () => {
    entrar('VETERINARIO', 'u-vet');
    expect((await chamar('orcamentos:listar', { pagina: 1, tamanho: 10 })).erro?.codigo).toBe('SEM_PERMISSAO');
    expect((await chamar('whatsapp:abrir', { telefone: '19999998888', mensagem: 'oi' })).erro?.codigo).toBe('SEM_PERMISSAO');
    entrar('ATENDENTE');
    expect((await chamar('relatorios:cobrancas')).erro?.codigo).toBe('SEM_PERMISSAO');
    expect((await chamar('servicos:criar', { nome: 'x', valor_centavos: 1 })).erro?.codigo).toBe('SEM_PERMISSAO');
  });

  it('whatsapp só abre link do wa.me', async () => {
    expect((await chamar('whatsapp:abrir', { telefone: '19999998888', mensagem: 'olá & tchau' })).ok).toBe(true);
    expect(abertos).toEqual(['https://wa.me/5519999998888?text=ol%C3%A1%20%26%20tchau']);
    expect((await chamar('whatsapp:abrir', { telefone: 'evil.com', mensagem: 'oi' })).erro?.codigo).toBe('DADOS_INVALIDOS');
  });

  it('painel: veterinário recebe só a própria agenda', async () => {
    const agora = Math.floor(Date.parse(`${hoje()}T10:00:00-03:00`) / 1000);
    banco.prepare(`INSERT INTO agendamentos (id, animal_id, veterinario_id, inicio, duracao_min) VALUES ('g1', 'a1', 'col-vet', ?, 30),
      ('g2', 'a1', 'col-master', ?, 30)`).run(agora, agora + 3600);
    expect((await chamar('dashboard:resumo')).dados.agenda_hoje).toHaveLength(2);
    entrar('VETERINARIO', 'u-vet');
    const doVet = await chamar('dashboard:resumo');
    expect(doVet.dados.agenda_hoje).toHaveLength(1);
    expect(doVet.dados.agenda_hoje[0].veterinario_nome).toBe('Dra. Bia');
    expect(doVet.dados.pendencias_sync).toBe(0);
  });

  it('relatórios: cobranças, validade e lista de compras', async () => {
    banco.exec(`
      INSERT INTO medicamentos (id, nome, unidade, dias_alerta, consumo_inicial_diario) VALUES ('m1', 'Dipirona', 'ml', 3, 5);
      INSERT INTO lotes_estoque (id, medicamento_id, numero, validade) VALUES ('l1', 'm1', 'A1', '2027-01-01');
      INSERT INTO movimentacoes_estoque (id, medicamento_id, lote_id, usuario_id, tipo, quantidade) VALUES ('mv1', 'm1', 'l1', 'u-master', 'ENTRADA', 10);
    `);
    expect((await chamar('relatorios:estoque_validade')).dados).toEqual([{ medicamento_nome: 'Dipirona', numero: 'A1', validade: '2027-01-01', saldo: 10 }]);
    expect((await chamar('relatorios:lista_compras')).dados).toEqual([{ medicamento_nome: 'Dipirona', unidade: 'ml', saldo: 10, sugerido: 140 }]);
    expect((await chamar('relatorios:cobrancas')).dados).toEqual([]);
    expect((await chamar('dashboard:resumo')).dados.alertas_estoque).toHaveLength(1);
  });

  it('csv: importa, ignora cpf repetido e exporta sem virar fórmula no excel', async () => {
    const clientes = String.fromCharCode(0xfeff) + '"nome";cpf;telefone\r\n"=Maria; Silva";444.444.444-44;(19) 98888-7777\r\nCarlos de novo;33333333333;19999998888\r\nSem telefone;55555555555;';
    expect((await chamar('csv:importar', { entidade: 'clientes', conteudo: clientes })).dados).toEqual({ importados: 1, ignorados: 2 });
    const animais = 'cliente_cpf;nome;especie;sexo;data_nascimento;peso_kg\n44444444444;Mia;Gato;f;2024-05-10;3,5\n44444444444;Mia;Gato;f;;\n00000000000;Sem dono;Cão;M;;';
    expect((await chamar('csv:importar', { entidade: 'animais', conteudo: animais })).dados).toEqual({ importados: 1, ignorados: 2 });

    const saida = await chamar('csv:exportar', { entidade: 'clientes' });
    expect(saida.dados.conteudo).toContain('"\'=Maria; Silva"');
    expect((await chamar('csv:exportar', { entidade: 'animais' })).dados.conteudo).toContain('"2024-05-10"');
    expect((await chamar('csv:importar', { entidade: 'clientes', conteudo: 'a;b\n1;2' })).erro?.codigo).toBe('CSV_INVALIDO');
  });
});
