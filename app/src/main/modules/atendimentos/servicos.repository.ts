import { randomUUID } from 'node:crypto';
import type { Servico } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { agoraEmSegundos } from '../admin/transacao';

export type DadosServico = Pick<Servico, 'nome' | 'valor_centavos'>;

type LinhaServico = { id: string; nome: string; valor_centavos: number; ativo: number };
const paraServico = (l: LinhaServico): Servico => ({ ...l, ativo: Boolean(l.ativo) });
const COLUNAS = 'id, nome, valor_centavos, ativo';

export class ServicosRepository {
  constructor(private readonly banco: BancoSql) {}

  // esta função busca os serviços
  listar(busca: string, pagina: number, tamanho: number) {
    const filtro = 'WHERE ativo = 1 AND instr(lower(nome), lower(?)) > 0';
    const { total } = this.banco.prepare(`SELECT count(*) AS total FROM servicos ${filtro}`).get(busca) as { total: number };
    const linhas = this.banco.prepare(`SELECT ${COLUNAS} FROM servicos ${filtro} ORDER BY nome COLLATE NOCASE LIMIT ? OFFSET ?`)
      .all(busca, tamanho, (pagina - 1) * tamanho) as LinhaServico[];
    return { itens: linhas.map(paraServico), total, pagina, tamanho };
  }

  obter(id: string): Servico | undefined {
    const linha = this.banco.prepare(`SELECT ${COLUNAS} FROM servicos WHERE id = ? AND ativo = 1`).get(id) as LinhaServico | undefined;
    return linha && paraServico(linha);
  }

  criar(dados: DadosServico): string {
    const id = randomUUID();
    this.banco.prepare('INSERT INTO servicos (id, nome, valor_centavos) VALUES (?, ?, ?)').run(id, dados.nome, dados.valor_centavos);
    return id;
  }

  atualizar(id: string, dados: DadosServico): void {
    this.banco.prepare('UPDATE servicos SET nome = ?, valor_centavos = ?, atualizado_em = ? WHERE id = ?')
      .run(dados.nome, dados.valor_centavos, agoraEmSegundos(), id);
  }

  inativar(id: string): void {
    this.banco.prepare('UPDATE servicos SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agoraEmSegundos(), id);
  }

  linha(id: string): object {
    return this.banco.prepare('SELECT * FROM servicos WHERE id = ?').get(id) as object;
  }
}
