import { AnimalCriarSchema, ClienteCriarSchema } from '@clinica-vet/shared';
import type { BancoSql } from '../../db/banco-sql';
import { ErroNegocio } from '../../erros/erro-negocio';
import type { OutboxRepository } from '../admin/outbox.repository';
import { runInTransaction } from '../admin/transacao';
import type { LinhaCsv, RelatoriosRepository } from './relatorios.repository';

export type EntidadeCsv = 'clientes' | 'animais';

const COLUNAS: Record<EntidadeCsv, string[]> = {
  clientes: ['nome', 'cpf', 'telefone', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'],
  animais: ['cliente_cpf', 'nome', 'especie', 'raca', 'sexo', 'data_nascimento', 'peso_kg', 'observacoes']
};

// esta função formata uma célula do csv
function celula(valor: string | number | null | undefined): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarCsv(colunas: string[], linhas: LinhaCsv[]): string {
  return [colunas.join(';'), ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(';'))].join('\r\n');
}

// esta função lê o arquivo csv
export function lerCsv(conteudo: string): Record<string, string>[] {
  const texto = conteudo.charCodeAt(0) === 0xfeff ? conteudo.slice(1) : conteudo;
  const primeira = texto.split('\n')[0] ?? '';
  const separador = primeira.includes(';') ? ';' : ',';
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }

  const [cabecalho, ...resto] = linhas;
  if (!cabecalho) return [];
  const chaves = cabecalho.map((c) => c.trim().toLowerCase());
  return resto
    .filter((l) => l.some((v) => v.trim()))
    .map((l) => Object.fromEntries(chaves.map((chave, i) => [chave, (l[i] ?? '').trim().replace(/^'(?=[=+\-@])/, '')])));
}

function limpar(registro: Record<string, string>, colunas: string[]): Record<string, string> {
  return Object.fromEntries(colunas.filter((c) => registro[c]).map((c) => [c, registro[c] as string]));
}

const soNumeros = (v?: string) => v?.replace(/\D/g, '');

export class CsvService {
  constructor(
    private readonly banco: BancoSql,
    private readonly repository: RelatoriosRepository,
    private readonly outbox: OutboxRepository
  ) {}

  // esta função exporta o csv
  exportar(entidade: EntidadeCsv) {
    const linhas = entidade === 'clientes' ? this.repository.clientesParaCsv() : this.repository.animaisParaCsv();
    return { nome_arquivo: `${entidade}.csv`, conteudo: gerarCsv(COLUNAS[entidade], linhas) };
  }

  // esta função importa o csv
  importar(entidade: EntidadeCsv, conteudo: string) {
    const registros = lerCsv(conteudo);
    const obrigatoria = entidade === 'clientes' ? 'cpf' : 'cliente_cpf';
    if (!registros[0] || !(obrigatoria in registros[0])) {
      throw new ErroNegocio('CSV_INVALIDO', `O arquivo precisa ter o cabeçalho com a coluna "${obrigatoria}".`);
    }
    return runInTransaction(this.banco, () => {
      let importados = 0;
      for (const registro of registros) {
        const entrou = entidade === 'clientes' ? this.importarCliente(registro) : this.importarAnimal(registro);
        if (entrou) importados++;
      }
      return { importados, ignorados: registros.length - importados };
    });
  }

  private importarCliente(registro: Record<string, string>): boolean {
    const dados = limpar(registro, COLUNAS.clientes);
    const validado = ClienteCriarSchema.safeParse({
      ...dados, cpf: soNumeros(dados['cpf']), telefone: soNumeros(dados['telefone']), cep: soNumeros(dados['cep']) ?? '',
      uf: dados['uf']?.toUpperCase()
    });
    if (!validado.success || this.repository.cpfCadastrado(validado.data.cpf)) return false;
    const campos = Object.fromEntries(Object.entries(validado.data).filter(([, v]) => v !== undefined)) as Record<string, string>;
    const { id, linha } = this.repository.inserir('clientes', campos);
    this.outbox.enfileirar('clientes', id, 'inserir', linha);
    return true;
  }

  private importarAnimal(registro: Record<string, string>): boolean {
    const clienteId = this.repository.clientePorCpf(soNumeros(registro['cliente_cpf']) ?? '');
    if (!clienteId) return false;
    const dados = limpar(registro, COLUNAS.animais.filter((c) => c !== 'cliente_cpf'));
    const validado = AnimalCriarSchema.safeParse({
      ...dados, cliente_id: clienteId, sexo: dados['sexo']?.toUpperCase(),
      peso_kg: dados['peso_kg'] ? Number(dados['peso_kg'].replace(',', '.')) : undefined
    });
    if (!validado.success || this.repository.animalExiste(clienteId, validado.data.nome)) return false;
    const { data_nascimento, ...resto } = validado.data;
    const campos = Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined)) as Record<string, string | number>;
    const nascimento = data_nascimento ? Math.floor(Date.parse(`${data_nascimento}T00:00:00Z`) / 1000) : null;
    const { id, linha } = this.repository.inserir('animais', { ...campos, data_nascimento: nascimento });
    this.outbox.enfileirar('animais', id, 'inserir', linha);
    return true;
  }
}
