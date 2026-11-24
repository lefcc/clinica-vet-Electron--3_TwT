import type { Colaborador, EntradaListagem, Pagina } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { agoraEmSegundos } from '../admin/transacao';

export type CadastroColaborador = Omit<Colaborador, 'id' | 'ativo'>;

type LinhaColaborador = Omit<Colaborador, 'ativo' | 'crmv' | 'telefone'> & {
  crmv: string | null;
  telefone: string | null;
  ativo: number;
  usuario_id: string;
  usuario_ativo: number;
};

function paraDto(linha: LinhaColaborador): Colaborador {
  return {
    id: linha.id, nome: linha.nome, cpf: linha.cpf, cargo: linha.cargo,
    crmv: linha.crmv ?? undefined, telefone: linha.telefone ?? undefined,
    login: linha.login, perfil: linha.perfil, ativo: Boolean(linha.ativo && linha.usuario_ativo)
  };
}

const consulta = `SELECT c.id, c.nome, c.cpf, c.cargo, c.crmv, c.telefone, c.ativo,
  u.login, u.perfil, u.id AS usuario_id, u.ativo AS usuario_ativo
  FROM colaboradores c JOIN usuarios u ON u.colaborador_id = c.id`;

export class ColaboradoresRepository {
  constructor(private readonly banco: BancoSql) {}

  listar({ busca = '', pagina, tamanho }: EntradaListagem): Pagina<Colaborador> {
    const filtro = `WHERE c.ativo = 1 AND u.ativo = 1 AND
      (instr(lower(c.nome), lower(?)) > 0 OR instr(c.cpf, ?) > 0 OR instr(lower(u.login), lower(?)) > 0)`;
    const { total } = this.banco.prepare(
      `SELECT count(*) AS total FROM colaboradores c JOIN usuarios u ON u.colaborador_id = c.id ${filtro}`
    ).get(busca, busca, busca) as { total: number };
    const linhas = this.banco.prepare(
      `${consulta} ${filtro} ORDER BY c.nome COLLATE NOCASE, c.id LIMIT ? OFFSET ?`
    ).all(busca, busca, busca, tamanho, (pagina - 1) * tamanho) as LinhaColaborador[];
    return { itens: linhas.map(paraDto), total, pagina, tamanho };
  }

  obter(id: string): { colaborador: Colaborador; usuarioId: string } | undefined {
    const linha = this.banco.prepare(`${consulta} WHERE c.id = ?`).get(id) as LinhaColaborador | undefined;
    return linha && { colaborador: paraDto(linha), usuarioId: linha.usuario_id };
  }

  cpfOcupado(cpf: string, exceto: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM colaboradores WHERE cpf = ? AND id <> ?').get(cpf, exceto));
  }

  loginOcupado(login: string, exceto: string): boolean {
    return Boolean(this.banco.prepare(
      'SELECT 1 FROM usuarios WHERE login = ? COLLATE NOCASE AND colaborador_id <> ?'
    ).get(login, exceto));
  }

  contarMasters(): number {
    const linha = this.banco.prepare(
      `SELECT count(*) AS total FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
       WHERE u.perfil = 'MASTER' AND u.ativo = 1 AND c.ativo = 1`
    ).get() as { total: number };
    return linha.total;
  }

  criar(id: string, usuarioId: string, dados: CadastroColaborador, hash: string): void {
    this.banco.prepare(
      'INSERT INTO colaboradores (id, nome, cpf, cargo, crmv, telefone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, dados.nome, dados.cpf, dados.cargo, dados.crmv ?? null, dados.telefone ?? null);
    this.banco.prepare(
      'INSERT INTO usuarios (id, colaborador_id, login, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)'
    ).run(usuarioId, id, dados.login, hash, dados.perfil);
  }

  atualizar(id: string, usuarioId: string, dados: CadastroColaborador): void {
    const agora = agoraEmSegundos();
    this.banco.prepare(
      'UPDATE colaboradores SET nome = ?, cpf = ?, cargo = ?, crmv = ?, telefone = ?, atualizado_em = ? WHERE id = ?'
    ).run(dados.nome, dados.cpf, dados.cargo, dados.crmv ?? null, dados.telefone ?? null, agora, id);
    this.banco.prepare('UPDATE usuarios SET login = ?, perfil = ?, atualizado_em = ? WHERE id = ?')
      .run(dados.login, dados.perfil, agora, usuarioId);
  }

  inativar(id: string, usuarioId: string): void {
    const agora = agoraEmSegundos();
    this.banco.prepare('UPDATE colaboradores SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agora, id);
    this.banco.prepare('UPDATE usuarios SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agora, usuarioId);
  }

  redefinirSenha(usuarioId: string, hash: string): void {
    this.banco.prepare('UPDATE usuarios SET senha_hash = ?, atualizado_em = ? WHERE id = ?')
      .run(hash, agoraEmSegundos(), usuarioId);
  }

  dadosColaborador(id: string): object {
    return this.banco.prepare('SELECT * FROM colaboradores WHERE id = ?').get(id) as object;
  }

  dadosUsuario(id: string): object {
    return this.banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as object;
  }
}
