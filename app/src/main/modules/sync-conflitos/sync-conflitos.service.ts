import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OutboxRepository } from '../admin/outbox.repository';
import { runInTransaction } from '../admin/transacao';
import type { AutorAuditoria } from '../auditoria/auditoria.repository';
import type { AuditoriaService } from '../auditoria/auditoria.service';
import type { ArmazemSessao } from '../auth/sessao-em-memoria';
import type { ColaboradoresRepository } from '../colaboradores/colaboradores.repository';
import { EstadoSyncRepository } from '../../sync/estado.repository';
import type { SyncConflitosRepository } from './sync-conflitos.repository';

export class SyncConflitosService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: SyncConflitosRepository,
    private readonly outbox: OutboxRepository,
    private readonly auditoria: AuditoriaService,
    private readonly colaboradores: ColaboradoresRepository,
    private readonly sessoes: ArmazemSessao
  ) {}

  listar() {
    return this.repository.listar();
  }

  resolver(id: string, escolha: 'LOCAL' | 'CENTRAL', autor: AutorAuditoria): void {
    const invalidarSessao = runInTransaction(this.banco, () => {
      const conflito = this.repository.obterAberto(id);
      const { tabela, registro_id } = conflito;
      const estado = new EstadoSyncRepository(this.banco);
      const versao = estado.versaoConflito(conflito.id);
      const atual = this.repository.obterRegistro(tabela, registro_id);
      if (escolha === 'LOCAL' && !atual) {
        throw new ErroNegocio('REGISTRO_NAO_ENCONTRADO', 'O registro local deixou de existir.');
      }
      this.outbox.substituirPendencias(tabela, registro_id);
      if (escolha === 'LOCAL' && atual) {
        this.outbox.enfileirar(tabela, registro_id, 'atualizar', atual);
      } else {
        const central = this.repository.lerDados(conflito.dados_central);
        if (central.id === registro_id) {
          this.repository.aplicarCentral(tabela, registro_id, central);
        } else if (versao !== 0 || !this.repository.aceitarCentralSemVersao(tabela, registro_id, conflito.tipo, atual, autor.usuarioId)) {
          throw new ErroNegocio('CONFLITO_EXIGE_CORRECAO',
            'Ajuste o cadastro ou lançamento que causou este conflito e reenvie a versão local.');
        }
        if (['colaboradores', 'usuarios'].includes(tabela)) {
          if (this.colaboradores.contarMasters() === 0) {
            throw new ErroNegocio('ULTIMO_MASTER', 'A clínica precisa ter pelo menos um administrador ativo.');
          }
          this.repository.validarVeterinarios();
        }
      }
      estado.salvarVersao(tabela, registro_id, versao);
      this.repository.registrarResolucao(conflito.id, autor.usuarioId);
      this.auditoria.registrar(autor, {
        acao: 'RESOLVER_CONFLITO', entidade: tabela, registro_id,
        descricao: escolha === 'LOCAL' ? 'Manteve o registro local.' : 'Aplicou a versão central do registro.',
        depois: { conflito_id: id, escolha }
      });
      const sessao = this.sessoes.obter();
      return escolha === 'CENTRAL' && sessao && (
        (tabela === 'usuarios' && sessao.usuarioId === registro_id)
        || (tabela === 'colaboradores' && this.colaboradores.obter(registro_id)?.usuarioId === sessao.usuarioId)
      );
    });
    if (invalidarSessao) this.sessoes.definir(null);
  }
}
