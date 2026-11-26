// regras das vacinas: catálogo, aplicação, fila dos próximos 3 dias e lembrete
import type { VacinaCatalogo, VacinaFila } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OutboxRepository } from '../admin/outbox.repository';
import { diaSaoPaulo, runInTransaction } from '../admin/transacao';
import type { DadosVacina, VacinasRepository } from './vacinas.repository';

export const DIAS_DE_AVISO = 3;

/** soma dias numa data "2026-11-25" */
export function somarDias(dia: string, quantidade: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + quantidade * 86400000).toISOString().slice(0, 10);
}

/** troca {tutor}, {animal}, {vacina} e {data} no texto do lembrete */
export function montarMensagem(modelo: string, item: VacinaFila): string {
  const valores: Record<string, string> = {
    tutor: item.cliente_nome,
    animal: item.animal_nome,
    vacina: item.vacina_nome,
    data: item.proxima_dose.split('-').reverse().join('/')
  };
  return modelo.replace(/\{(tutor|animal|vacina|data)\}/g, (_tudo, chave: string) => valores[chave] ?? '');
}

export class VacinasService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: VacinasRepository,
    private readonly outbox: OutboxRepository,
    private readonly modeloLembrete: () => string,
    private readonly hoje: () => string = () => diaSaoPaulo(new Date())
  ) {}

  catalogoListar(entrada: { pagina: number; tamanho: number; busca?: string }) {
    return this.repository.listar(entrada.busca ?? '', entrada.pagina, entrada.tamanho);
  }

  catalogoObter(id: string): VacinaCatalogo {
    const vacina = this.repository.obter(id);
    if (!vacina) throw new ErroNegocio('NAO_ENCONTRADO', 'Vacina não encontrada.');
    return vacina;
  }

  catalogoCriar(dados: DadosVacina): VacinaCatalogo {
    return runInTransaction(this.banco, () => {
      const id = this.repository.criar(dados);
      this.outbox.enfileirar('vacinas_catalogo', id, 'inserir', this.repository.linha('vacinas_catalogo', id));
      return this.catalogoObter(id);
    });
  }

  catalogoAtualizar({ id, ...campos }: Partial<DadosVacina> & { id: string }): VacinaCatalogo {
    return runInTransaction(this.banco, () => {
      const atual = this.catalogoObter(id);
      this.repository.atualizar(id, { ...atual, ...campos });
      this.outbox.enfileirar('vacinas_catalogo', id, 'atualizar', this.repository.linha('vacinas_catalogo', id));
      return this.catalogoObter(id);
    });
  }

  catalogoInativar(id: string): void {
    runInTransaction(this.banco, () => {
      this.catalogoObter(id);
      this.repository.inativar(id);
      this.outbox.enfileirar('vacinas_catalogo', id, 'inativar', this.repository.linha('vacinas_catalogo', id));
    });
  }

  // a próxima dose é a data da aplicação + o intervalo de reforço da vacina
  aplicar(entrada: { animal_id: string; vacina_id: string; data: string; lote?: string }, usuarioId: string) {
    if (entrada.data > this.hoje()) throw new ErroNegocio('DADOS_INVALIDOS', 'A data da aplicação não pode ser no futuro.');
    return runInTransaction(this.banco, () => {
      const vacina = this.catalogoObter(entrada.vacina_id);
      if (!this.repository.animalAtivo(entrada.animal_id)) throw new ErroNegocio('NAO_ENCONTRADO', 'Animal não encontrado.');
      const veterinario = this.repository.colaboradorDoUsuario(usuarioId);
      if (!veterinario) throw new ErroNegocio('NAO_ENCONTRADO', 'Colaborador não encontrado.');
      const proxima = somarDias(entrada.data, vacina.intervalo_reforco_dias);
      const id = this.repository.aplicar({ ...entrada, veterinario_id: veterinario, proxima_dose: proxima });
      this.outbox.enfileirar('vacinas_aplicacoes', id, 'inserir', this.repository.linha('vacinas_aplicacoes', id));
      return { id, proxima_dose: proxima };
    });
  }

  /** vacinas que vencem de hoje até daqui a 3 dias */
  fila(): VacinaFila[] {
    const hoje = this.hoje();
    return this.repository.fila(hoje, somarDias(hoje, DIAS_DE_AVISO));
  }

  registrarLembrete(aplicacaoId: string): void {
    runInTransaction(this.banco, () => {
      const item = this.repository.itemDaFila(aplicacaoId);
      if (!item) throw new ErroNegocio('NAO_ENCONTRADO', 'Aplicação de vacina não encontrada.');
      const { id, novo } = this.repository.registrarLembrete(aplicacaoId, montarMensagem(this.modeloLembrete(), item), item.telefone);
      this.outbox.enfileirar('lembretes_vacina', id, novo ? 'inserir' : 'atualizar', this.repository.linha('lembretes_vacina', id));
    });
  }
}
