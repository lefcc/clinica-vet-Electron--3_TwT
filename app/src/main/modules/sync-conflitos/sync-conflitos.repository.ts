import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { Conflito } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { colunasSincronizaveis } from '../../db/local/tabelas-sincronizaveis';
import { ErroNegocio } from '../../erros/erro-negocio';
import { agoraEmSegundos, dataUtc } from '../admin/transacao';

type LinhaConflito = {
  id: number; tabela: string; registro_id: string; tipo: string;
  dados_local: string; dados_central: string; criado_em: number
};

const objeto = z.record(z.unknown());
type ValorSql = string | number | null;

function valorPublico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(valorPublico);
  if (typeof valor === 'object' && valor !== null) return dadosPublicos(Object.fromEntries(Object.entries(valor)));
  return valor;
}

function dadosPublicos(dados: Record<string, unknown>): Record<string, unknown> {
  const camposSecretos = new Set(['senha', 'senhahash', 'novasenha']);
  return Object.fromEntries(Object.entries(dados)
    .filter(([chave]) => !camposSecretos.has(chave.toLowerCase().replaceAll('_', '')))
    .map(([chave, valor]) => [chave, valorPublico(valor)]));
}

export class SyncConflitosRepository {
  confirmarAgendamento(id: string): void {
    this.banco.prepare('UPDATE agendamentos SET confirmado = 1 WHERE id = ?').run(id);
  }

  constructor(private readonly banco: BancoSql) {}

  listar(): Conflito[] {
    const linhas = this.banco.prepare(
      "SELECT * FROM sync_conflitos WHERE status = 'aberto' ORDER BY criado_em DESC, id DESC"
    ).all() as LinhaConflito[];
    return linhas.map((linha) => ({
      ...linha, id: String(linha.id), criado_em: dataUtc(linha.criado_em),
      dados_local: dadosPublicos(this.lerDados(linha.dados_local)),
      dados_central: dadosPublicos(this.lerDados(linha.dados_central))
    })).map(({ id, tabela, registro_id, tipo, criado_em, dados_local, dados_central }) =>
      ({ id, tabela, registro_id, tipo, criado_em, dados_local, dados_central }));
  }

  obterAberto(id: string): LinhaConflito {
    const linha = this.banco.prepare(
      "SELECT * FROM sync_conflitos WHERE id = ? AND status = 'aberto'"
    ).get(id) as LinhaConflito | undefined;
    if (!linha) throw new ErroNegocio('CONFLITO_NAO_ENCONTRADO', 'Conflito aberto não encontrado.');
    return linha;
  }

  abertoPara(tabela: string, registroId: string): number | undefined {
    const linha = this.banco.prepare(
      "SELECT id FROM sync_conflitos WHERE tabela = ? AND registro_id = ? AND status = 'aberto' ORDER BY id DESC LIMIT 1"
    ).get(tabela, registroId) as { id: number } | undefined;
    return linha?.id;
  }

  abrir(tabela: string, registroId: string, tipo: string, local: object, central: object): number {
    const anterior = this.abertoPara(tabela, registroId);
    const dados = [tipo, JSON.stringify(local), JSON.stringify(central)];
    if (anterior !== undefined) {
      this.banco.prepare('UPDATE sync_conflitos SET tipo = ?, dados_local = ?, dados_central = ? WHERE id = ?')
        .run(...dados, anterior);
      return anterior;
    }
    this.banco.prepare(`INSERT INTO sync_conflitos (tabela, registro_id, tipo, dados_local, dados_central)
      VALUES (?, ?, ?, ?, ?)`).run(tabela, registroId, ...dados);
    return this.abertoPara(tabela, registroId)!;
  }

  lerDados(json: string): Record<string, unknown> {
    try {
      return objeto.parse(JSON.parse(json));
    } catch {
      throw new ErroNegocio('CONFLITO_INVALIDO', 'Os dados deste conflito estão inválidos.');
    }
  }

  obterRegistro(tabela: string, id: string): Record<string, unknown> | undefined {
    this.exigirTabela(tabela);
    return this.banco.prepare(`SELECT * FROM "${tabela}" WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  }

  aplicarCentral(tabela: string, id: string, dados: Record<string, unknown>): void {
    const colunas = this.exigirTabela(tabela);
    if (dados.id !== id || Object.keys(dados).some((campo) => !colunas.has(campo))) this.invalido();
    const registro = this.obterRegistro(tabela, id);
    const valores: Record<string, ValorSql> = {};
    for (const [campo, coluna] of colunas) {
      let valor = dados[campo];
      if (valor === undefined && registro && !coluna.notNull) valor = null;
      if (valor === undefined || (valor === null && coluna.notNull)) this.invalido();
      if (coluna.columnType === 'SQLiteTimestamp' && typeof valor === 'string') {
        valor = Math.floor(Date.parse(valor) / 1000);
      }
      if (coluna.columnType === 'SQLiteBoolean' && typeof valor === 'boolean') valor = Number(valor);
      if (coluna.columnType === 'SQLiteReal' && typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor)) {
        valor = Number(valor);
      }
      if (coluna.columnType === 'SQLiteTextJson' && typeof valor === 'object' && valor !== null) {
        valor = JSON.stringify(valor);
      }
      if (valor !== null) {
        const tipo = coluna.getSQLType().toUpperCase();
        if (tipo === 'INTEGER' && (typeof valor !== 'number' || !Number.isSafeInteger(valor))) this.invalido();
        if (tipo === 'REAL' && (typeof valor !== 'number' || !Number.isFinite(valor))) this.invalido();
        if (tipo === 'TEXT' && typeof valor !== 'string') this.invalido();
        if (coluna.columnType === 'SQLiteBoolean' && valor !== 0 && valor !== 1) this.invalido();
      }
      if (typeof valor !== 'number' && typeof valor !== 'string' && valor !== null) this.invalido();
      valores[campo] = valor;
    }
    if (registro && ['movimentacoes_estoque', 'auditoria'].includes(tabela)) {
      if (Object.entries(valores).some(([campo, valor]) => registro[campo] !== valor)) {
        throw new ErroNegocio('REGISTRO_IMUTAVEL', 'Registros imutáveis devem ser corrigidos por um novo lançamento.');
      }
      return;
    }
    const campos = [...colunas.keys()];
    const nomes = campos.map((campo) => `"${campo}"`).join(', ');
    const updates = campos.filter((campo) => campo !== 'id').map((campo) => `"${campo}" = excluded."${campo}"`).join(', ');
    this.banco.prepare(
      `INSERT INTO "${tabela}" (${nomes}) VALUES (${campos.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${updates}`
    ).run(...campos.map((campo) => valores[campo]));
  }

  registrarResolucao(id: number, usuarioId: string | null): void {
    this.banco.prepare(
      "UPDATE sync_conflitos SET status = 'resolvido', resolvido_por = ?, resolvido_em = ? WHERE id = ?"
    ).run(usuarioId, agoraEmSegundos(), id);
  }

  aceitarCentralSemVersao(
    tabela: string, id: string, tipo: string, atual: Record<string, unknown> | undefined, usuarioId: string | null
  ): boolean {
    if (!atual) return false;
    if (tabela === 'agendamentos' && tipo === 'AGENDA_SOBREPOSTA') {
      this.banco.prepare("UPDATE agendamentos SET status = 'CANCELADO', ativo = 0, atualizado_em = ? WHERE id = ?")
        .run(agoraEmSegundos(), id);
      return true;
    }
    if (tabela === 'movimentacoes_estoque' && tipo === 'ESTOQUE_INSUFICIENTE' &&
      atual.consulta_id === null && typeof atual.quantidade === 'number' && usuarioId) {
      // O lançamento rejeitado nunca entrou no central. Compensa localmente sem apagar o histórico.
      const estornoId = randomUUID();
      const agora = agoraEmSegundos();
      this.aplicarCentral(tabela, estornoId, {
        ...atual, id: estornoId, tipo: 'AJUSTE', quantidade: -atual.quantidade, usuario_id: usuarioId,
        motivo: 'Estorno local do movimento rejeitado ' + id, criado_em: agora, atualizado_em: agora
      });
      return true;
    }
    return false;
  }

  validarVeterinarios(): void {
    if (this.banco.prepare(
      `SELECT 1 FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
       WHERE u.perfil = 'VETERINARIO' AND u.ativo = 1 AND c.ativo = 1 AND coalesce(trim(c.crmv),'') = '' LIMIT 1`
    ).get()) {
      throw new ErroNegocio('CRMV_OBRIGATORIO', 'Informe o CRMV do veterinário antes de resolver o conflito.');
    }
  }

  private exigirTabela(tabela: string) {
    const colunas = colunasSincronizaveis.get(tabela);
    if (!colunas) this.invalido();
    return colunas;
  }

  private invalido(): never {
    throw new ErroNegocio('CONFLITO_INVALIDO', 'Os dados centrais não correspondem a um registro sincronizável.');
  }
}
