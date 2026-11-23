import { randomUUID } from 'crypto';
import type { BancoSql } from '../../db/banco-sql';
import type { Perfil } from './tipos';

export interface UsuarioComColaborador {
  id: string;
  colaboradorId: string;
  login: string;
  senhaHash: string;
  perfil: Perfil;
  nome: string;
}

export interface NovoUsuario {
  nome: string;
  cpf: string;
  cargo: string;
  login: string;
  senhaHash: string;
  perfil: Perfil;
}

// o que o service precisa do banco (dá pra trocar por um falso nos testes)
export interface RepositorioUsuarios {
  buscarAtivoPorLogin(login: string): UsuarioComColaborador | undefined;
  registrarLogin(usuarioId: string): void;
  contar(): number;
  criar(novo: NovoUsuario): void;
}

interface LinhaUsuario {
  id: string;
  colaborador_id: string;
  login: string;
  senha_hash: string;
  perfil: Perfil;
  nome: string;
}

// aqui é o único lugar com SQL do login (regra do projeto: SQL só no repository)
export class UsuarioRepository implements RepositorioUsuarios {
  constructor(private readonly banco: BancoSql) {}

  buscarAtivoPorLogin(login: string): UsuarioComColaborador | undefined {
    // os "?" evitam SQL injection: o valor nunca vira parte do comando
    const linha = this.banco
      .prepare(
        `SELECT u.id, u.colaborador_id, u.login, u.senha_hash, u.perfil, c.nome
         FROM usuarios u
         JOIN colaboradores c ON c.id = u.colaborador_id
         WHERE u.login = ? AND u.ativo = 1 AND c.ativo = 1`,
      )
      .get(login) as LinhaUsuario | undefined;

    if (!linha) return undefined;
    return { id: linha.id, colaboradorId: linha.colaborador_id, login: linha.login, senhaHash: linha.senha_hash, perfil: linha.perfil, nome: linha.nome };
  }

  // o drizzle guarda data em segundos, então a gente também
  registrarLogin(usuarioId: string): void {
    const agora = Math.floor(Date.now() / 1000);
    this.banco.prepare('UPDATE usuarios SET ultimo_login_em = ?, atualizado_em = ? WHERE id = ?').run(agora, agora, usuarioId);
  }

  contar(): number {
    const linha = this.banco.prepare('SELECT COUNT(*) AS total FROM usuarios').get() as { total: number };
    return linha.total;
  }

  // cria o colaborador e o usuário juntos: ou grava os dois, ou nenhum
  // TODO: quando existir a sync_outbox, gravar nela na mesma transação
  criar(novo: NovoUsuario): void {
    const colaboradorId = randomUUID();
    const usuarioId = randomUUID();
    this.banco.transacao(() => {
      this.banco.prepare('INSERT INTO colaboradores (id, nome, cpf, cargo) VALUES (?, ?, ?, ?)').run(colaboradorId, novo.nome, novo.cpf, novo.cargo);
      this.banco
        .prepare('INSERT INTO usuarios (id, colaborador_id, login, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)')
        .run(usuarioId, colaboradorId, novo.login, novo.senhaHash, novo.perfil);
    });
  }
}
