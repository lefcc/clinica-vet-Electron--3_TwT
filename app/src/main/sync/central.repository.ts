import { createHash } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { colunasSincronizaveis } from '../db/local/tabelas-sincronizaveis';
import type { ItemOutbox } from '../modules/admin/outbox.repository';
import { colunasDaTabela, identificador, normalizar, valorMysql } from './dados';
import type { CentralSync, DadosRegistro, MudancaCentral, ResultadoEnvio } from './tipos';

type Transacao = <T>(fn: (conn: PoolConnection) => Promise<T>) => Promise<T>;
type LinhaMudanca = RowDataPacket & { versao: number | string; tabela: string; registro_id: string; dados: unknown };
const camposMudanca = 'versao, tabela, registro_id, dados';
const imutaveis = new Set(['movimentacoes_estoque', 'auditoria']);

function paraMudanca(linha: LinhaMudanca): MudancaCentral {
  const versao = Number(linha.versao);
  if (!Number.isSafeInteger(versao) || versao < 1) throw new Error('Versão de sincronização inválida.');
  const dados: unknown = typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados;
  return { versao, tabela: linha.tabela, registro_id: linha.registro_id, dados: normalizar(linha.tabela, dados) };
}

export class CentralSyncRepository implements CentralSync {
  constructor(private readonly transacao: Transacao) {}

  async preparar(): Promise<void> {
    await this.transacao(async (conn) => {
      const [estado] = await conn.execute<RowDataPacket[]>(
        'SELECT inicializado FROM sync_relogio WHERE id = 1 FOR UPDATE'
      );
      if (!estado.length) throw new Error('Aplique a migration de sincronização no MySQL.');
      if (estado[0].inicializado) return;
      // Publica o estado inicial na ordem das FKs, inclusive em um banco já preenchido.
      for (const tabela of colunasSincronizaveis.keys()) {
        let ultimoId = '';
        while (true) {
          const [linhas] = await conn.execute<RowDataPacket[]>(
            `SELECT * FROM ${identificador(tabela)} WHERE id > ? ORDER BY id LIMIT 100`,
            [ultimoId]
          );
          for (const linha of linhas) {
            ultimoId = String(linha.id);
            const chave = createHash('sha256')
              .update(JSON.stringify(['bootstrap', tabela, ultimoId]))
              .digest('hex');
            await this.registrar(conn, chave, tabela, ultimoId, normalizar(tabela, linha));
          }
          if (linhas.length < 100) break;
        }
      }
      await conn.execute('UPDATE sync_relogio SET inicializado = TRUE WHERE id = 1');
    });
  }

  async enviar(item: ItemOutbox, operacaoId: string, versao: number): Promise<ResultadoEnvio> {
    const { tabela, registro_id: id } = item;
    const colunas = colunasDaTabela(tabela);
    const dados = normalizar(tabela, JSON.parse(item.dados));
    if (dados.id !== undefined && dados.id !== id) throw new Error('Identificador de sincronização incorreto.');
    if (item.operacao === 'inativar') dados.ativo = 0;
    if (tabela === 'agendamentos') dados.confirmado = 1;

    return this.transacao(async (conn) => {
      // Serializa a publicação e as regras entre PCs. O cursor observa a mesma ordem dos commits.
      const [relogio] = await conn.execute<RowDataPacket[]>(
        'SELECT inicializado FROM sync_relogio WHERE id = 1 FOR UPDATE'
      );
      if (!relogio[0]?.inicializado) throw new Error('Sincronização central não inicializada.');
      const [confirmadas] = await conn.execute<LinhaMudanca[]>(
        `SELECT ${camposMudanca} FROM sync_mudancas WHERE operacao_id = ?`,
        [operacaoId]
      );
      if (confirmadas[0]) return { ok: true, mudanca: paraMudanca(confirmadas[0]) };

      const [ultimas] = await conn.execute<LinhaMudanca[]>(
        `SELECT ${camposMudanca} FROM sync_mudancas WHERE tabela = ? AND registro_id = ? ORDER BY versao DESC LIMIT 1`,
        [tabela, id]
      );
      const ultima = ultimas[0] && paraMudanca(ultimas[0]);
      const [linhas] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM ${identificador(tabela)} WHERE id = ? FOR UPDATE`,
        [id]
      );
      const existe = Boolean(linhas[0]);
      const atual = existe ? normalizar(tabela, linhas[0]) : {};
      const versaoAtual = ultima?.versao ?? 0;
      const mudou = Object.entries(dados).some(([campo, valor]) => atual[campo] !== valor);
      if (existe && mudou && versaoAtual !== versao) {
        return { ok: false, tipo: 'EDICAO_CONCORRENTE', versao: versaoAtual, dados: atual };
      }
      if (existe && mudou && imutaveis.has(tabela)) {
        return { ok: false, tipo: 'REGISTRO_IMUTAVEL', versao: versaoAtual, dados: atual };
      }
      const conflito = (!existe || mudou) && (await this.conferirRegras(conn, tabela, id, atual, dados));
      if (conflito)
        return { ok: false, tipo: conflito.tipo, versao: versaoAtual, dados: existe ? atual : (conflito.dados ?? {}) };
      const campos = Object.keys(dados).filter((campo) => campo !== 'id' && colunas.has(campo));
      const valores = campos.map((campo) => valorMysql(tabela, campo, dados[campo]));
      const destino = identificador(tabela);
      try {
        if (!existe) {
          const selecao = ['id', ...campos].map(identificador);
          await conn.execute(
            `INSERT INTO ${destino} (${selecao.join(', ')}) VALUES (${selecao.map(() => '?').join(', ')})`,
            [id, ...valores]
          );
        } else if (mudou && campos.length) {
          await conn.execute(
            `UPDATE ${destino} SET ${campos.map((campo) => identificador(campo) + ' = ?').join(', ')} WHERE id = ?`,
            [...valores, id]
          );
        }
      } catch (erro) {
        const codigo = (erro as { code?: string }).code;
        if (codigo === 'ER_DUP_ENTRY' || codigo === 'ER_NO_REFERENCED_ROW_2') {
          return { ok: false, tipo: 'RESTRICAO_CENTRAL', versao: versaoAtual, dados: atual };
        }
        throw erro;
      }
      const [gravadas] = await conn.execute<RowDataPacket[]>(`SELECT * FROM ${destino} WHERE id = ?`, [id]);
      const mudanca = await this.registrar(conn, operacaoId, tabela, id, normalizar(tabela, gravadas[0]));
      return { ok: true, mudanca };
    });
  }

  puxar(cursor: number, limite: number): Promise<MudancaCentral[]> {
    return this.transacao(async (conn) => {
      const [linhas] = await conn.execute<LinhaMudanca[]>(
        `SELECT ${camposMudanca} FROM sync_mudancas WHERE versao > ? ORDER BY versao LIMIT ?`,
        [cursor, limite]
      );
      return linhas.map(paraMudanca);
    });
  }

  private async registrar(conn: PoolConnection, operacao: string, tabela: string, id: string, dados: DadosRegistro) {
    const [inserido] = await conn.execute<ResultSetHeader>(
      'INSERT INTO sync_mudancas (operacao_id, tabela, registro_id, dados) VALUES (?, ?, ?, ?)',
      [operacao, tabela, id, JSON.stringify(dados)]
    );
    const versao = Number(inserido.insertId);
    if (!Number.isSafeInteger(versao)) throw new Error('Versão central fora do intervalo.');
    return { versao, tabela, registro_id: id, dados };
  }

  private async conferirRegras(
    conn: PoolConnection,
    tabela: string,
    id: string,
    atual: DadosRegistro,
    dados: DadosRegistro
  ): Promise<{ tipo: string; dados?: DadosRegistro } | undefined> {
    const novo = { ...atual, ...dados };
    const chave = tabela === 'usuarios' ? 'login' : ['clientes', 'colaboradores'].includes(tabela) ? 'cpf' : null;
    if (chave && novo[chave] !== undefined) {
      const [duplicados] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM ${identificador(tabela)} WHERE ${identificador(chave)} = ? AND id <> ? LIMIT 1 FOR UPDATE`,
        [novo[chave], id]
      );
      if (duplicados[0]) {
        return {
          tipo: chave === 'cpf' ? 'CPF_DUPLICADO' : 'LOGIN_DUPLICADO',
          dados: normalizar(tabela, duplicados[0])
        };
      }
    }

    if (tabela === 'agendamentos' && novo.ativo !== 0 && novo.status !== 'CANCELADO') {
      const inicio = Number(novo.inicio);
      const fim = inicio + Number(novo.duracao_min) * 60;
      const [sobrepostos] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM agendamentos WHERE ativo = TRUE AND status <> 'CANCELADO'
         AND veterinario_id = ? AND id <> ? AND inicio < ? AND TIMESTAMPADD(MINUTE, duracao_min, inicio) > ?
         LIMIT 1 FOR UPDATE`,
        [novo.veterinario_id, id, new Date(fim * 1000), new Date(inicio * 1000)]
      );
      if (sobrepostos[0]) return { tipo: 'AGENDA_SOBREPOSTA', dados: normalizar(tabela, sobrepostos[0]) };
    }

    if (tabela === 'movimentacoes_estoque' && Number(novo.quantidade) < 0) {
      const [saldo] = await conn.execute<RowDataPacket[]>(
        `SELECT COALESCE(SUM(quantidade), 0) AS total,
          COALESCE(SUM(CASE WHEN lote_id = ? THEN quantidade ELSE 0 END), 0) AS lote
         FROM movimentacoes_estoque WHERE medicamento_id = ? AND ativo = TRUE`,
        [novo.lote_id, novo.medicamento_id]
      );
      if (Number(saldo[0].total) + Number(novo.quantidade) < 0 || Number(saldo[0].lote) + Number(novo.quantidade) < 0) {
        return {
          tipo: 'ESTOQUE_INSUFICIENTE',
          dados: { saldo: Number(saldo[0].total), saldo_lote: Number(saldo[0].lote) }
        };
      }
    }

    if (
      (tabela === 'usuarios' &&
        atual.ativo === 1 &&
        atual.perfil === 'MASTER' &&
        (novo.ativo === 0 || novo.perfil !== 'MASTER')) ||
      (tabela === 'colaboradores' && atual.ativo === 1 && novo.ativo === 0)
    ) {
      const campo = tabela === 'usuarios' ? 'u.id' : 'c.id';
      const [masters] = await conn.execute<RowDataPacket[]>(
        `SELECT ${campo} AS id FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
         WHERE u.perfil = 'MASTER' AND u.ativo = TRUE AND c.ativo = TRUE FOR UPDATE`
      );
      if (masters.length === 1 && masters[0].id === id) return { tipo: 'ULTIMO_MASTER' };
    }
    return undefined;
  }
}
