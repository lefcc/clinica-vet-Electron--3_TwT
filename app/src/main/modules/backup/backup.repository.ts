import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { BackupRestaurarSchema, type BackupArquivo } from '@clinica-vet/shared';
import type { ConexaoLocal } from '../../db/local/conexao-local';
import { EsquemaLocal } from '../../db/local/esquema-local';
import { colunasSincronizaveis } from '../../db/local/tabelas-sincronizaveis';
import { ErroNegocio } from '../../erros/erro-negocio';

const nomeBackup = /^(AUTOMATICO|MANUAL)_([0-9a-f-]{36})\.sqlite$/i;
const chaveUltimoAutomatico = 'backup_ultimo_dia_automatico';

export class BackupRepository {
  constructor(private readonly conexao: ConexaoLocal, private readonly pasta: string) {}

  listar(): BackupArquivo[] {
    fs.mkdirSync(this.pasta, { recursive: true });
    return fs.readdirSync(this.pasta, { withFileTypes: true }).flatMap((entrada) => {
      const partes = nomeBackup.exec(entrada.name);
      if (!entrada.isFile() || !partes || !BackupRestaurarSchema.safeParse({ id: partes[2] }).success) return [];
      const info = fs.lstatSync(path.join(this.pasta, entrada.name));
      if (!info.isFile() || info.size === 0) return [];
      return [{
        id: partes[2], tipo: partes[1] as BackupArquivo['tipo'],
        criado_em: info.mtime.toISOString(), tamanho_bytes: info.size
      }];
    }).sort((a, b) => b.criado_em.localeCompare(a.criado_em) || a.id.localeCompare(b.id));
  }

  async criar(tipo: BackupArquivo['tipo']): Promise<BackupArquivo> {
    fs.mkdirSync(this.pasta, { recursive: true });
    const id = randomUUID();
    const destino = this.arquivo({ id, tipo });
    const temporario = destino + '.tmp';
    try {
      // A API de backup inclui os dados confirmados que ainda estão no WAL.
      await this.conexao.bruto().backup(temporario);
      this.validar(temporario);
      fs.renameSync(temporario, destino);
      const info = fs.statSync(destino);
      return { id, tipo, criado_em: info.mtime.toISOString(), tamanho_bytes: info.size };
    } finally {
      fs.rmSync(temporario, { force: true });
    }
  }

  remover(arquivo: BackupArquivo): void {
    fs.rmSync(this.arquivo(arquivo), { force: true });
  }

  diaUltimoAutomatico(): string | undefined {
    const linha = this.conexao.prepare('SELECT valor FROM sync_estado WHERE chave = ?')
      .get(chaveUltimoAutomatico) as { valor: string } | undefined;
    return linha?.valor;
  }

  registrarDiaAutomatico(dia: string): void {
    this.conexao.prepare(`INSERT INTO sync_estado (chave, valor) VALUES (?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`).run(chaveUltimoAutomatico, dia);
  }

  restaurar(id: string, aoAbrir: () => void): void {
    const selecionado = this.listar().find((arquivo) => arquivo.id === id);
    if (!selecionado) throw new ErroNegocio('BACKUP_NAO_ENCONTRADO', 'O backup selecionado não está disponível.');
    const origem = this.arquivo(selecionado);
    const atual = this.conexao.caminhoArquivo;
    const temporario = atual + '.restauracao-' + randomUUID() + '.sqlite';
    const anterior = atual + '.anterior-' + randomUUID() + '.sqlite';
    fs.copyFileSync(origem, temporario, fs.constants.COPYFILE_EXCL);
    try {
      this.validar(temporario);
      this.conexao.bruto().pragma('wal_checkpoint(TRUNCATE)');
      this.conexao.fechar();
      let substituido = false;
      try {
        fs.copyFileSync(atual, anterior, fs.constants.COPYFILE_EXCL);
        fs.renameSync(temporario, atual);
        substituido = true;
        this.conexao.abrir();
        new EsquemaLocal(this.conexao).aplicar();
        this.preservarAuditoria(anterior, aoAbrir);
      } catch (erro) {
        this.conexao.fechar();
        if (substituido) fs.renameSync(anterior, atual);
        else fs.rmSync(anterior, { force: true });
        this.conexao.abrir();
        throw erro;
      }
      fs.rmSync(anterior, { force: true });
    } finally {
      fs.rmSync(temporario, { force: true });
    }
  }

  private preservarAuditoria(anterior: string, aoAbrir: () => void): void {
    const db = this.conexao.bruto();
    db.prepare('ATTACH DATABASE ? AS anterior').run(anterior);
    try {
      this.conexao.transacao(() => {
        // Recuperar dados antigos preserva o histórico e os envios confirmados desde a cópia.
        db.exec(`INSERT INTO auditoria SELECT * FROM anterior.auditoria WHERE true ON CONFLICT(id) DO NOTHING`);
        db.exec(`UPDATE sync_outbox AS copia
          SET enviado_em = recente.enviado_em, tentativas = recente.tentativas, ultimo_erro = recente.ultimo_erro
          FROM anterior.sync_outbox AS recente
          WHERE copia.enviado_em IS NULL AND recente.enviado_em IS NOT NULL
            AND copia.id = recente.id AND copia.tabela = recente.tabela AND copia.registro_id = recente.registro_id
            AND copia.operacao = recente.operacao AND copia.dados = recente.dados AND copia.criado_em = recente.criado_em`);
        db.exec(`INSERT INTO sync_outbox (tabela, registro_id, operacao, dados, criado_em, tentativas, ultimo_erro, enviado_em)
          SELECT o.tabela, o.registro_id, o.operacao, o.dados, o.criado_em, o.tentativas, o.ultimo_erro, o.enviado_em
          FROM anterior.sync_outbox o WHERE o.tabela = 'auditoria' AND NOT EXISTS (
            SELECT 1 FROM sync_outbox atual WHERE atual.tabela = o.tabela AND atual.registro_id = o.registro_id
          )`);
        aoAbrir();
      });
    } finally {
      db.exec('DETACH DATABASE anterior');
    }
  }

  private arquivo({ id, tipo }: Pick<BackupArquivo, 'id' | 'tipo'>): string {
    BackupRestaurarSchema.parse({ id });
    return path.join(this.pasta, tipo + '_' + id + '.sqlite');
  }

  private validar(arquivo: string): void {
    let db: Database.Database | undefined;
    try {
      db = new Database(arquivo, { readonly: true, fileMustExist: true });
      const tabelas = new Map(db.prepare(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')"
      ).all().map((linha) => {
        const { name, type } = linha as { name: string; type: string };
        return [name, type];
      }));
      for (const [tabela, colunas] of colunasSincronizaveis) {
        const tipo = tabelas.get(tabela);
        // Backups de antes da Trilha 1 podem ter apenas as tabelas de login.
        if (tipo === undefined && tabela !== 'usuarios' && tabela !== 'colaboradores') continue;
        const nomes = new Set(db.prepare('SELECT name FROM pragma_table_info(?)').all(tabela)
          .map((linha) => (linha as { name: string }).name));
        if (tipo !== 'table' || [...colunas.keys()].some((nome) => !nomes.has(nome))) {
          throw new ErroNegocio('BACKUP_INVALIDO', 'O esquema do backup é incompatível.');
        }
      }
      const violacoes = db.pragma('foreign_key_check');
      if (db.pragma('quick_check', { simple: true }) !== 'ok' || !Array.isArray(violacoes) || violacoes.length) {
        throw new ErroNegocio('BACKUP_INVALIDO', 'O arquivo de backup está inconsistente.');
      }
      if (!db.prepare(`SELECT 1 FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
        WHERE u.perfil = 'MASTER' AND u.ativo = 1 AND c.ativo = 1 LIMIT 1`).get()) {
        throw new ErroNegocio('BACKUP_SEM_MASTER', 'O backup precisa conter um administrador ativo.');
      }
    } catch (erro) {
      if (erro instanceof ErroNegocio) throw erro;
      throw new ErroNegocio('BACKUP_INVALIDO', 'Não foi possível validar o arquivo de backup.');
    } finally {
      db?.close();
    }
  }
}
