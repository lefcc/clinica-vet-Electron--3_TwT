import type { Configuracoes } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { agoraEmSegundos } from '../admin/transacao';

const ID_CONFIGURACOES = '6d534382-afe4-4b8c-9160-d99727089ed9';
const campos = [
  'nome_clinica', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'bairro',
  'cidade', 'uf', 'template_lembrete', 'backup_horario', 'backup_manter'
] as const satisfies readonly (keyof Configuracoes)[];

const colunas = campos.join(', ');

export class ConfiguracoesRepository {
  constructor(private readonly banco: BancoSql) {}

  obter(): Configuracoes | undefined {
    const linha = this.banco.prepare(`SELECT ${colunas} FROM configuracoes WHERE id = ?`).get(ID_CONFIGURACOES) as
      Record<string, string | number | null> | undefined;
    if (!linha) return undefined;
    return Object.fromEntries(Object.entries(linha).filter(([, valor]) => valor !== null)) as Configuracoes;
  }

  salvar(dados: Configuracoes) {
    const parametros = campos.map((campo) => dados[campo] ?? null);
    this.banco.prepare(
      `INSERT INTO configuracoes (id, ${colunas}, atualizado_em)
       VALUES (?, ${campos.map(() => '?').join(', ')}, ?)
       ON CONFLICT(id) DO UPDATE SET ${campos.map((campo) => `${campo} = excluded.${campo}`).join(', ')},
         atualizado_em = excluded.atualizado_em`
    ).run(ID_CONFIGURACOES, ...parametros, agoraEmSegundos());
    return {
      id: ID_CONFIGURACOES,
      linha: this.banco.prepare('SELECT * FROM configuracoes WHERE id = ?').get(ID_CONFIGURACOES) as object
    };
  }
}
