// todo o sql das vacinas fica aqui
import { randomUUID } from 'node:crypto';
import type { VacinaCatalogo, VacinaFila } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { agoraEmSegundos } from '../admin/transacao';

export type DadosVacina = Pick<VacinaCatalogo, 'nome' | 'descricao' | 'intervalo_reforco_dias'>;

export interface NovaAplicacao {
  animal_id: string;
  vacina_id: string;
  veterinario_id: string;
  data: string;
  proxima_dose: string;
  lote?: string;
}

type LinhaVacina = { id: string; nome: string; descricao: string | null; intervalo_reforco_dias: number; ativo: number };
type LinhaFila = Omit<VacinaFila, 'lembrete_enviado'> & { lembrete_enviado: number };

function paraVacina(linha: LinhaVacina): VacinaCatalogo {
  return { ...linha, descricao: linha.descricao ?? undefined, ativo: Boolean(linha.ativo) };
}

const COLUNAS = 'id, nome, descricao, intervalo_reforco_dias, ativo';

// só a aplicação mais recente de cada vacina conta: se o animal já tomou o reforço, a antiga sai da fila
const CONSULTA_FILA = `
  SELECT a.id, an.nome AS animal_nome, c.nome AS cliente_nome, c.telefone, v.nome AS vacina_nome, a.proxima_dose,
    EXISTS (SELECT 1 FROM lembretes_vacina l WHERE l.vacina_id = a.id AND l.status = 'enviado') AS lembrete_enviado
  FROM vacinas_aplicacoes a
  JOIN animais an ON an.id = a.animal_id AND an.ativo = 1
  JOIN clientes c ON c.id = an.cliente_id AND c.ativo = 1
  JOIN vacinas_catalogo v ON v.id = a.vacina_id
  WHERE a.ativo = 1 AND c.telefone IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vacinas_aplicacoes r WHERE r.animal_id = a.animal_id
      AND r.vacina_id = a.vacina_id AND r.ativo = 1 AND r.data > a.data)`;

export class VacinasRepository {
  constructor(private readonly banco: BancoSql) {}

  listar(busca: string, pagina: number, tamanho: number) {
    const filtro = 'WHERE ativo = 1 AND instr(lower(nome), lower(?)) > 0';
    const { total } = this.banco.prepare(`SELECT count(*) AS total FROM vacinas_catalogo ${filtro}`).get(busca) as { total: number };
    const linhas = this.banco.prepare(`SELECT ${COLUNAS} FROM vacinas_catalogo ${filtro} ORDER BY nome COLLATE NOCASE LIMIT ? OFFSET ?`)
      .all(busca, tamanho, (pagina - 1) * tamanho) as LinhaVacina[];
    return { itens: linhas.map(paraVacina), total, pagina, tamanho };
  }

  obter(id: string): VacinaCatalogo | undefined {
    const linha = this.banco.prepare(`SELECT ${COLUNAS} FROM vacinas_catalogo WHERE id = ? AND ativo = 1`).get(id) as LinhaVacina | undefined;
    return linha && paraVacina(linha);
  }

  criar(dados: DadosVacina): string {
    const id = randomUUID();
    this.banco.prepare('INSERT INTO vacinas_catalogo (id, nome, descricao, intervalo_reforco_dias) VALUES (?, ?, ?, ?)')
      .run(id, dados.nome, dados.descricao ?? null, dados.intervalo_reforco_dias);
    return id;
  }

  atualizar(id: string, dados: DadosVacina): void {
    this.banco.prepare('UPDATE vacinas_catalogo SET nome = ?, descricao = ?, intervalo_reforco_dias = ?, atualizado_em = ? WHERE id = ?')
      .run(dados.nome, dados.descricao ?? null, dados.intervalo_reforco_dias, agoraEmSegundos(), id);
  }

  inativar(id: string): void {
    this.banco.prepare('UPDATE vacinas_catalogo SET ativo = 0, atualizado_em = ? WHERE id = ?').run(agoraEmSegundos(), id);
  }

  animalAtivo(id: string): boolean {
    return Boolean(this.banco.prepare('SELECT 1 FROM animais WHERE id = ? AND ativo = 1').get(id));
  }

  // quem está logado é um usuário, mas a aplicação guarda o colaborador
  colaboradorDoUsuario(usuarioId: string): string | undefined {
    const linha = this.banco.prepare('SELECT colaborador_id FROM usuarios WHERE id = ?').get(usuarioId) as { colaborador_id: string } | undefined;
    return linha?.colaborador_id;
  }

  aplicar(dados: NovaAplicacao): string {
    const id = randomUUID();
    this.banco.prepare(
      'INSERT INTO vacinas_aplicacoes (id, animal_id, vacina_id, veterinario_id, data, proxima_dose, lote) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, dados.animal_id, dados.vacina_id, dados.veterinario_id, dados.data, dados.proxima_dose, dados.lote ?? null);
    return id;
  }

  fila(de: string, ate: string): VacinaFila[] {
    const linhas = this.banco.prepare(`${CONSULTA_FILA} AND a.proxima_dose BETWEEN ? AND ? ORDER BY a.proxima_dose, an.nome`)
      .all(de, ate) as LinhaFila[];
    return linhas.map((l) => ({ ...l, lembrete_enviado: Boolean(l.lembrete_enviado) }));
  }

  itemDaFila(id: string): VacinaFila | undefined {
    const linha = this.banco.prepare(`${CONSULTA_FILA} AND a.id = ?`).get(id) as LinhaFila | undefined;
    return linha && { ...linha, lembrete_enviado: Boolean(linha.lembrete_enviado) };
  }

  // um lembrete por aplicação: se reenviar, só atualiza
  registrarLembrete(aplicacaoId: string, mensagem: string, telefone: string): { id: string; novo: boolean } {
    const agora = agoraEmSegundos();
    const existente = this.banco.prepare('SELECT id FROM lembretes_vacina WHERE vacina_id = ?').get(aplicacaoId) as { id: string } | undefined;
    if (existente) {
      this.banco.prepare(`UPDATE lembretes_vacina SET mensagem = ?, telefone = ?, status = 'enviado', enviado_em = ?, atualizado_em = ? WHERE id = ?`)
        .run(mensagem, telefone, agora, agora, existente.id);
      return { id: existente.id, novo: false };
    }
    const id = randomUUID();
    this.banco.prepare(`INSERT INTO lembretes_vacina (id, vacina_id, mensagem, telefone, status, enviado_em) VALUES (?, ?, ?, ?, 'enviado', ?)`)
      .run(id, aplicacaoId, mensagem, telefone, agora);
    return { id, novo: true };
  }

  // linha inteira, do jeito que vai pra fila de sincronização
  linha(tabela: 'vacinas_catalogo' | 'vacinas_aplicacoes' | 'lembretes_vacina', id: string): object {
    return this.banco.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(id) as object;
  }
}
