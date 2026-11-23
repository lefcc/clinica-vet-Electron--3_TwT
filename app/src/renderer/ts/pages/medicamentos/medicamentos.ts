import type { Medicamento } from '../../lib/tipos.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { numeroOpcional, opcional } from '../comum/util.js';

// cadastro de medicamentos (só o administrador cadastra)
const CONFIG_MEDICAMENTOS: ConfigCrud<Medicamento> = {
  canal: 'medicamentos',
  titulo: 'Medicamentos',
  subtitulo: 'Cadastro de medicamentos e vacinas usados na clínica. O saldo fica na tela Estoque.',
  singular: 'medicamento',
  textoNovo: 'Novo medicamento',
  textoBusca: 'Buscar por nome ou princípio ativo...',
  podeEscrever: (p) => p === 'MASTER',
  nomeDoItem: (m) => m.nome,
  colunas: [
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'principio_ativo', titulo: 'Princípio ativo', render: (m) => m.principio_ativo ?? '—' },
    { chave: 'unidade', titulo: 'Unidade' },
    { chave: 'dias_alerta', titulo: 'Alerta (dias)', render: (m) => `${m.dias_alerta} dias` },
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, largura: 'inteira' },
    { nome: 'principio_ativo', rotulo: 'Princípio ativo' },
    { nome: 'unidade', rotulo: 'Unidade', obrigatorio: true, placeholder: 'ml, comprimido, dose...' },
    { nome: 'dias_alerta', rotulo: 'Avisar quando restar para (dias)', tipo: 'numero', min: 1, max: 60, valorInicial: '3', obrigatorio: true, dica: 'Entre 1 e 60 dias. Padrão: 3.' },
    {
      nome: 'consumo_inicial_diario',
      rotulo: 'Consumo inicial diário',
      tipo: 'numero',
      min: 0,
      passo: '0.01',
      dica: 'Usado apenas até o sistema acumular 7 dias de saídas reais.',
    },
  ],
  // nome + unidade não podem repetir
  errosCampo: { MEDICAMENTO_DUPLICADO: 'nome' },
  paraFormulario: (m) => ({
    nome: m.nome,
    principio_ativo: m.principio_ativo ?? '',
    unidade: m.unidade,
    dias_alerta: String(m.dias_alerta),
    consumo_inicial_diario: m.consumo_inicial_diario != null ? String(m.consumo_inicial_diario) : '',
  }),
  paraEnvio: (v) => ({
    nome: v['nome'],
    principio_ativo: opcional(v['principio_ativo']),
    unidade: v['unidade'],
    dias_alerta: Number(v['dias_alerta']),
    consumo_inicial_diario: numeroOpcional(v['consumo_inicial_diario']) ?? null,
  }),
};

export function paginaMedicamentos(): HTMLElement {
  return criarPaginaCrud(CONFIG_MEDICAMENTOS);
}
