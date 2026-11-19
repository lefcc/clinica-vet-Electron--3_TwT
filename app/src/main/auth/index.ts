// Módulo de autenticação - sessão em memória, bcrypt
import bcrypt from 'bcryptjs';
import { getLocalDb } from '../db/local/client';
import { config } from '../config/env';
import { definirSessao, obterSessao, Sessao } from '../ipc/registry';
import { PerfilPermitido } from '../ipc/registry';

const BCRYPT_COST = config.bcryptCost;
const SESSION_TTL_MS = config.sessionTtlHours * 60 * 60 * 1000;

export interface CredenciaisLogin {
  login: string;
  senha: string;
}

export interface UsuarioAutenticado {
  id: string;
  colaboradorId: string;
  nome: string;
  perfil: PerfilPermitido;
}

export async function autenticar(credenciais: CredenciaisLogin): Promise<UsuarioAutenticado> {
  const db = getLocalDb();

  const usuario = db.prepare(`
    SELECT u.id, u.colaborador_id, u.login, u.senha_hash, u.perfil, c.nome
    FROM usuarios u
    JOIN colaboradores c ON c.id = u.colaborador_id
    WHERE u.login = ? AND u.ativo = 1 AND c.ativo = 1
  `).get(credenciais.login) as
    | { id: string; colaborador_id: string; login: string; senha_hash: string; perfil: PerfilPermitido; nome: string }
    | undefined;

  if (!usuario) {
    throw new Error('Login ou senha inválidos');
  }

  const senhaValida = await bcrypt.compare(credenciais.senha, usuario.senha_hash);
  if (!senhaValida) {
    throw new Error('Login ou senha inválidos');
  }

  const sessao: Sessao = {
    usuarioId: usuario.id,
    perfil: usuario.perfil,
    expiraEm: Date.now() + SESSION_TTL_MS
  };

  definirSessao(sessao);

  // Atualizar último login
  db.prepare('UPDATE usuarios SET ultimo_login_em = ? WHERE id = ?')
    .run(Date.now(), usuario.id);

  return {
    id: usuario.id,
    colaboradorId: usuario.colaborador_id,
    nome: usuario.nome,
    perfil: usuario.perfil
  };
}

export async function logout(): Promise<void> {
  definirSessao(null);
}

export function getSessaoAtual(): Sessao | null {
  return obterSessao();
}

export function isAutenticado(): boolean {
  const sessao = obterSessao();
  if (!sessao) return false;
  if (Date.now() > sessao.expiraEm) {
    definirSessao(null);
    return false;
  }
  return true;
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_COST);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function temPermissao(perfis: PerfilPermitido[]): boolean {
  const sessao = obterSessao();
  if (!sessao) return false;
  return perfis.includes(sessao.perfil);
}