import type { Servico } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OutboxRepository } from '../admin/outbox.repository';
import { runInTransaction } from '../admin/transacao';
import type { DadosServico, ServicosRepository } from './servicos.repository';

export class ServicosService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: ServicosRepository,
    private readonly outbox: OutboxRepository
  ) {}

  listar(entrada: { pagina: number; tamanho: number; busca?: string }) {
    return this.repository.listar(entrada.busca ?? '', entrada.pagina, entrada.tamanho);
  }

  obter(id: string): Servico {
    const servico = this.repository.obter(id);
    if (!servico) throw new ErroNegocio('NAO_ENCONTRADO', 'Serviço não encontrado.');
    return servico;
  }

  // esta função cadastra um serviço
  criar(dados: DadosServico): Servico {
    return runInTransaction(this.banco, () => {
      const id = this.repository.criar(dados);
      this.outbox.enfileirar('servicos', id, 'inserir', this.repository.linha(id));
      return this.obter(id);
    });
  }

  // esta função atualiza um serviço
  atualizar({ id, ...campos }: Partial<DadosServico> & { id: string }): Servico {
    return runInTransaction(this.banco, () => {
      const atual = this.obter(id);
      this.repository.atualizar(id, { ...atual, ...campos });
      this.outbox.enfileirar('servicos', id, 'atualizar', this.repository.linha(id));
      return this.obter(id);
    });
  }

  // esta função inativa um serviço
  inativar(id: string): void {
    runInTransaction(this.banco, () => {
      this.obter(id);
      this.repository.inativar(id);
      this.outbox.enfileirar('servicos', id, 'inativar', this.repository.linha(id));
    });
  }
}
