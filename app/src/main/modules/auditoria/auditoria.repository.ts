import { randomUUID } from 'node:crypto';
import type { AuditoriaRegistro, Perfil } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { agoraEmSegundos, dataUtc } from '../admin/transacao';

export interface AutorAuditoria {
  usuarioId: string | null;
  nome?: string;
  perfil: Perfil;
}

export interface EventoAuditoria {
  acao: string;
  entidade: string;
  registro_id?: string;
  descricao: string;
  antes?: object;
  depois?: object;
}

export interface FiltroAuditoria {
  pagina: number;
  tamanho: number;
  busca?: string;
  acao?: string;
  entidade?: string;
  desde?: number;
}

type LinhaAuditoria = Omit<AuditoriaRegistro, 'ocorrido_em' | 'registro_id'> & {
  ocorrido_em: number;
  registro_id: string | null;
};

export class AuditoriaRepository {
  constructor(private readonly banco: BancoSql) {}

  registrar(autor: AutorAuditoria, evento: EventoAuditoria) {
    const agora = agoraEmSegundos();
    const linha = {
      id: randomUUID(), ocorrido_em: agora, usuario_id: autor.usuarioId,
      usuario_nome: autor.nome || 'Sistema', perfil: autor.perfil, acao: evento.acao,
      entidade: evento.entidade, registro_id: evento.registro_id ?? null, descricao: evento.descricao,
      dados_antes: evento.antes ? JSON.stringify(evento.antes) : null,
      dados_depois: evento.depois ? JSON.stringify(evento.depois) : null,
      ativo: 1, criado_em: agora, atualizado_em: agora
    };
    this.banco.prepare(
      `INSERT INTO auditoria (
        id, ocorrido_em, usuario_id, usuario_nome, perfil, acao, entidade, registro_id, descricao,
        dados_antes, dados_depois, ativo, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(...Object.values(linha));
    return linha;
  }

  listar(filtros: FiltroAuditoria) {
    const condicoes: string[] = [];
    const parametros: Array<string | number> = [];
    if (filtros.busca) {
      condicoes.push('(instr(lower(usuario_nome), lower(?)) > 0 OR instr(lower(descricao), lower(?)) > 0)');
      parametros.push(filtros.busca, filtros.busca);
    }
    if (filtros.acao) {
      condicoes.push('acao = ?');
      parametros.push(filtros.acao);
    }
    if (filtros.entidade) {
      condicoes.push('entidade = ?');
      parametros.push(filtros.entidade);
    }
    if (filtros.desde !== undefined) {
      condicoes.push('ocorrido_em >= ?');
      parametros.push(filtros.desde);
    }
    const onde = condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : '';
    const { total } = this.banco.prepare(`SELECT count(*) AS total FROM auditoria ${onde}`).get(...parametros) as { total: number };
    const linhas = this.banco.prepare(
      `SELECT id, ocorrido_em, usuario_nome, perfil, acao, entidade, registro_id, descricao FROM auditoria
       ${onde} ORDER BY ocorrido_em DESC, rowid DESC LIMIT ? OFFSET ?`
    ).all(...parametros, filtros.tamanho, (filtros.pagina - 1) * filtros.tamanho) as LinhaAuditoria[];
    return {
      itens: linhas.map(({ ocorrido_em, registro_id, ...linha }) => ({
        ...linha, ocorrido_em: dataUtc(ocorrido_em), registro_id: registro_id ?? undefined
      })),
      total, pagina: filtros.pagina, tamanho: filtros.tamanho
    };
  }
}
