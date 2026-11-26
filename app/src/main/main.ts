// ponto de entrada do processo principal (main) do Electron
import { app, BrowserWindow, dialog, net } from 'electron';
import * as path from 'path';
import { config } from './config/env';
import { habilitarMysqlInstalado, provisionarMysql } from './config/mysql-local';
import { EsquemaLocal } from './db/local/esquema-local';
import { obterConexaoLocal } from './db/local/client';
import { SeedUsuarioExemplo } from './db/local/seed-usuario-exemplo';
import { AuthIpc } from './ipc/auth.ipc';
import { permitirOrigemIpc, sessoes } from './ipc/registry';
import { criarTrilha1, registrarTrilha1 } from './ipc/trilha1.ipc';
import { registrarEstadoSync } from './ipc/sync.ipc';
import { OutboxRepository } from './modules/admin/outbox.repository';
import { runInTransaction } from './modules/admin/transacao';
import { AuthService } from './modules/auth/auth.service';
import { HashSenha } from './modules/auth/hash-senha';
import { UsuarioRepository } from './modules/auth/usuario.repository';
import { aoReceberMudanca, executarCicloSync, getSyncStatus } from './sync';
import { iniciarAgendadorSync } from './sync/agendador';
import { closeCentralPool } from './db/central/client';

class Aplicacao {
  async iniciar(): Promise<void> {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }
    await app.whenReady();
    if (process.argv.includes('--configurar-mysql')) {
      try {
        provisionarMysql();
        // O Chromium persiste a chave do safeStorage ao encerrar normalmente.
        app.quit();
      } catch {
        dialog.showErrorBox('Configuração MySQL', 'Confira os campos da conexão e a disponibilidade do cofre de credenciais.');
        app.exit(1);
      }
      return;
    }

    if (app.isPackaged) {
      try {
        config.sync.habilitado = habilitarMysqlInstalado();
      } catch {
        dialog.showErrorBox('Configuração MySQL', 'As credenciais locais não puderam ser abertas. O aplicativo continuará no modo local.');
      }
    }

    // primeiro o banco (e o usuário de exemplo), depois a janela com a tela de login
    if (!(await this.prepararBanco())) {
      app.quit();
      return;
    }
    this.criarJanela();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.criarJanela();
    });
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }

  // abre o banco, cria as tabelas, garante o usuário de exemplo e liga os canais de login.
  // se der erro, avisa com um dialog nativo (igual na aula) em vez de quebrar em silêncio
  private async prepararBanco(): Promise<boolean> {
    try {
      const conexao = obterConexaoLocal();
      new EsquemaLocal(conexao).aplicar();

      const hash = new HashSenha(Math.max(10, config.bcryptCost));
      // A primeira conta de uma instalação também precisa sobreviver à configuração posterior do MySQL.
      const usuarios = new UsuarioRepository(conexao, app.isPackaged || config.sync.habilitado);

      const dados = SeedUsuarioExemplo.escolherDados(config.usuarioExemplo, !app.isPackaged && !config.sync.habilitado);
      const resultado = await new SeedUsuarioExemplo(usuarios, hash).executar(dados);
      if (resultado === 'sem-dados' && !config.sync.habilitado) {
        dialog.showErrorBox('Primeiro acesso', 'Configure a conta do administrador local antes de iniciar o aplicativo.');
        return false;
      }
      console.log(`Banco local pronto (usuário de exemplo: ${resultado}).`);

      const trilha1 = criarTrilha1(conexao, hash);
      const auth = new AuthService(usuarios, sessoes, hash, config.sessionTtlHours * 60 * 60 * 1000, {
        executar: (acao, sessao, efetivar) => runInTransaction(conexao, () => {
          efetivar();
          trilha1.auditoria.registrar(sessao, {
            acao, entidade: 'auth', registro_id: sessao.usuarioId,
            descricao: acao === 'LOGIN' ? 'Entrou no sistema.' : 'Saiu do sistema.'
          });
        })
      });
      new AuthIpc(auth).registrar();
      registrarTrilha1(trilha1, () => getSyncStatus().emAndamento);
      registrarEstadoSync(new OutboxRepository(conexao), getSyncStatus);
      const backupAgendado = () => void trilha1.backup.executarAgendado().catch(() => {
        console.error('Não foi possível executar o backup automático.');
      });
      const cronometro = setInterval(backupAgendado, 60_000);
      app.once('before-quit', () => clearInterval(cronometro));
      backupAgendado();
      if (config.sync.habilitado) {
        aoReceberMudanca(({ tabela, registro_id }) => {
          const sessao = sessoes.obter();
          if (!sessao) return;
          if ((tabela === 'usuarios' && registro_id === sessao.usuarioId)
            || (tabela === 'colaboradores' && usuarios.pertenceAoColaborador(sessao.usuarioId, registro_id))) {
            sessoes.definir(null);
          }
        });
        const parar = iniciarAgendadorSync({
          online: () => net.isOnline(),
          executar: executarCicloSync,
          intervaloMs: config.sync.intervalMs,
          aoErro: () => console.warn('O banco central está indisponível. Os dados locais permanecem disponíveis.')
        });
        app.once('before-quit', () => {
          parar();
          void closeCentralPool().catch(() => undefined);
        });
      }
      return true;
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      console.error('Erro ao preparar o banco local:', detalhe);
      dialog.showErrorBox('Erro com o banco de dados', `Não foi possível preparar o banco local.\n\nDetalhes: ${detalhe}`);
      return false;
    }
  }

  private criarJanela(): void {
    const janela = new BrowserWindow({
      width: 1280,
      height: 720,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    permitirOrigemIpc(janela.webContents.id, (remover) => janela.webContents.once('destroyed', remover));
    janela.webContents.on('will-navigate', (evento) => evento.preventDefault());
    janela.webContents.on('will-attach-webview', (evento) => evento.preventDefault());
    janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    void janela.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

void new Aplicacao().iniciar();
