import { createHash } from 'node:crypto';
import type { BancoSql } from '../db/banco-sql';
import { ErroNegocio } from '../erros/erro-negocio';
import { OutboxRepository, type ItemOutbox } from '../modules/admin/outbox.repository';
import { agoraEmSegundos, runInTransaction } from '../modules/admin/transacao';
import { SyncConflitosRepository } from '../modules/sync-conflitos/sync-conflitos.repository';
import { ColaboradoresRepository } from '../modules/colaboradores/colaboradores.repository';
import { EstadoSyncRepository } from './estado.repository';
import type { CentralSync, DadosRegistro, MudancaCentral, SyncStatus } from './tipos';

export class MotorSync {
  private readonly estado: EstadoSyncRepository;
  private readonly conflitos: SyncConflitosRepository;
  private readonly outbox: OutboxRepository;
  private readonly status: SyncStatus = { pendentes: 0, ultimaSync: null, emAndamento: false, erro: null };

  constructor(
    private readonly banco: BancoSql,
    private readonly central: CentralSync,
    private readonly lote: number,
    private readonly aoAplicar?: (mudanca: MudancaCentral) => void
  ) {
    this.estado = new EstadoSyncRepository(banco);
    this.conflitos = new SyncConflitosRepository(banco);
    this.outbox = new OutboxRepository(banco);
  }

  obterStatus(): SyncStatus {
    return { ...this.status, pendentes: this.outbox.contarPendencias() };
  }

  contarPendentes(): number {
    return this.outbox.contarPendencias();
  }

  executarPush() {
    return this.exclusivo(() => this.enviarPendencias());
  }

  executarPull() {
    return this.exclusivo(() => this.receberMudancas());
  }

  executarCiclo() {
    return this.exclusivo(async () => {
      const push = await this.enviarPendencias();
      if (push.erros) return { ...push, atualizados: 0 };
      return { ...push, ...(await this.receberMudancas()) };
    });
  }

  private async exclusivo<T>(executar: () => Promise<T>): Promise<T> {
    if (this.status.emAndamento) throw new Error('Sincronização já em andamento.');
    this.status.emAndamento = true;
    this.status.erro = null;
    try {
      await this.central.preparar();
      const resultado = await executar();
      if (this.status.erro === null) this.status.ultimaSync = Date.now();
      return resultado;
    } catch (erro) {
      this.status.erro = 'Não foi possível sincronizar com o banco central.';
      throw erro;
    } finally {
      this.status.emAndamento = false;
    }
  }

  private async enviarPendencias(): Promise<{ enviados: number; erros: number }> {
    const itens = this.outbox.selecionarParaEnvio(this.lote);
    const instalacao = this.estado.instalacao();
    let enviados = 0;
    for (const item of itens) {
      if (this.conflitos.abertoPara(item.tabela, item.registro_id) !== undefined) continue;
      const origem = [instalacao, item.id, item.tabela, item.registro_id, item.operacao, item.dados];
      const operacao = createHash('sha256').update(JSON.stringify(origem)).digest('hex');
      try {
        const versao = this.estado.versao(item.tabela, item.registro_id);
        const resposta = await this.central.enviar(item, operacao, versao);
        if (!resposta.ok) {
          runInTransaction(this.banco, () => this.abrirConflito(item, resposta.tipo, resposta.versao, resposta.dados));
          continue;
        }
        runInTransaction(this.banco, () => {
          this.outbox.confirmar(item.id, agoraEmSegundos());
          const { mudanca } = resposta;
          this.estado.salvarVersao(item.tabela, item.registro_id, mudanca.versao);
          if (item.tabela === 'agendamentos' && !this.outbox.temPendencia(item.tabela, item.registro_id)) {
            this.conflitos.confirmarAgendamento(item.registro_id);
          }
        });
        enviados++;
      } catch {
        this.status.erro = 'Não foi possível enviar o registro ao banco central.';
        this.outbox.falhar(item.id, this.status.erro);
        return { enviados, erros: 1 };
      }
    }
    return { enviados, erros: 0 };
  }

  private async receberMudancas(): Promise<{ atualizados: number }> {
    const cursor = this.estado.cursor();
    const recebidas = await this.central.puxar(cursor, this.lote);
    let atualizados = 0;
    let anterior = cursor;
    for (const mudanca of recebidas) {
      if (mudanca.versao <= anterior) throw new Error('Mudanças centrais fora de ordem.');
      anterior = mudanca.versao;
      const aplicada = runInTransaction(this.banco, () => {
        const { tabela, registro_id, versao, dados } = mudanca;
        let aplicou = false;
        if (versao > this.estado.versao(tabela, registro_id)) {
          if (
            this.outbox.temPendencia(tabela, registro_id) ||
            this.conflitos.abertoPara(tabela, registro_id) !== undefined
          ) {
            this.abrirConflito(mudanca, 'EDICAO_CONCORRENTE', versao, dados);
          } else {
            try {
              runInTransaction(this.banco, () => this.aplicarProtegido(mudanca));
              this.estado.salvarVersao(tabela, registro_id, versao);
              aplicou = true;
            } catch (erro) {
              const codigo = (erro as { code?: string }).code;
              if (erro instanceof ErroNegocio && erro.codigo === 'ULTIMO_MASTER') {
                this.abrirConflito(mudanca, erro.codigo, versao, dados);
              } else if (codigo?.startsWith('SQLITE_CONSTRAINT')) {
                this.abrirConflito(mudanca, 'RESTRICAO_LOCAL', versao, dados);
              } else {
                throw erro;
              }
            }
          }
        }
        this.estado.salvarCursor(versao);
        return aplicou;
      });
      if (aplicada) {
        atualizados++;
        this.aoAplicar?.(mudanca);
      }
    }
    return { atualizados };
  }

  private aplicarProtegido({ tabela, registro_id, dados }: MudancaCentral): void {
    const colaboradores = new ColaboradoresRepository(this.banco);
    const protecao = (tabela === 'usuarios' || tabela === 'colaboradores') && colaboradores.contarMasters() > 0;
    this.conflitos.aplicarCentral(tabela, registro_id, dados);
    if (protecao && colaboradores.contarMasters() === 0) {
      throw new ErroNegocio('ULTIMO_MASTER', 'Este computador precisa manter um administrador ativo.');
    }
  }

  private abrirConflito(
    item: Pick<ItemOutbox, 'tabela' | 'registro_id'>,
    tipo: string,
    versao: number,
    dados: DadosRegistro
  ): void {
    const { tabela, registro_id } = item;
    const anterior = this.conflitos.abertoPara(tabela, registro_id);
    if (anterior !== undefined && this.estado.versaoConflito(anterior) >= versao) return;
    const local = this.conflitos.obterRegistro(tabela, registro_id) ?? {};
    const id = this.conflitos.abrir(tabela, registro_id, tipo, local, dados);
    this.estado.guardarVersaoConflito(id, versao);
  }
}
