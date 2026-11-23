// ponto de entrada do processo principal (main) do Electron
import { app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import { config } from './config/env';
import { EsquemaLocal } from './db/local/esquema-local';
import { obterConexaoLocal } from './db/local/client';
import { SeedUsuarioExemplo } from './db/local/seed-usuario-exemplo';
import { AuthIpc } from './ipc/auth.ipc';
import { sessoes } from './ipc/registry';
import { AuthService } from './modules/auth/auth.service';
import { HashSenha } from './modules/auth/hash-senha';
import { UsuarioRepository } from './modules/auth/usuario.repository';

class Aplicacao {
  async iniciar(): Promise<void> {
    await app.whenReady();

    // primeiro o banco (e o usuário de exemplo), depois a janela com a tela de login
    await this.prepararBanco();
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
  private async prepararBanco(): Promise<void> {
    try {
      const conexao = obterConexaoLocal();
      new EsquemaLocal(conexao).aplicar();

      const hash = new HashSenha(config.bcryptCost);
      const usuarios = new UsuarioRepository(conexao);

      const dados = SeedUsuarioExemplo.escolherDados(config.usuarioExemplo, !app.isPackaged);
      const resultado = await new SeedUsuarioExemplo(usuarios, hash).executar(dados);
      console.log(`Banco local pronto (usuário de exemplo: ${resultado}).`);

      const auth = new AuthService(usuarios, sessoes, hash, config.sessionTtlHours * 60 * 60 * 1000);
      new AuthIpc(auth).registrar();
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      console.error('Erro ao preparar o banco local:', detalhe);
      dialog.showErrorBox('Erro com o banco de dados', `Não foi possível preparar o banco local.\n\nDetalhes: ${detalhe}`);
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

    janela.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

void new Aplicacao().iniciar();
