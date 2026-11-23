import { formatarDataHora } from '../../lib/formatadores.js';
import type { AuditoriaRegistro } from '../../lib/tipos.js';
import { criarBadge, type Tom } from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';

// nome e cor de cada ação registrada
const ACOES: Record<string, { texto: string; tom: Tom }> = {
  LOGIN: { texto: 'Entrou', tom: 'neutro' },
  LOGOUT: { texto: 'Saiu', tom: 'neutro' },
  CRIAR: { texto: 'Criou', tom: 'sucesso' },
  ATUALIZAR: { texto: 'Alterou', tom: 'info' },
  INATIVAR: { texto: 'Inativou', tom: 'aviso' },
  MOVIMENTO_ESTOQUE: { texto: 'Estoque', tom: 'info' },
  RESOLVER_CONFLITO: { texto: 'Resolveu conflito', tom: 'aviso' },
  BACKUP: { texto: 'Backup', tom: 'sucesso' },
  RESTAURAR: { texto: 'Restaurou backup', tom: 'erro' },
};

const ENTIDADES = ['clientes', 'animais', 'agendamentos', 'consultas', 'vacinas', 'medicamentos', 'estoque', 'fornecedores', 'orcamentos', 'colaboradores', 'configuracoes'];

// tela só de leitura: ninguém cria, edita ou apaga registro de auditoria
const CONFIG_AUDITORIA: ConfigCrud<AuditoriaRegistro> = {
  canal: 'auditoria',
  titulo: 'Auditoria',
  subtitulo: 'Quem fez o quê no sistema. Os registros não podem ser alterados nem apagados.',
  singular: 'registro',
  textoNovo: '',
  textoBusca: 'Buscar por usuário ou descrição...',
  podeEscrever: () => false,
  ocultarAvisoLeitura: true,
  nomeDoItem: (r) => r.descricao,
  campos: [],
  paraFormulario: () => ({}),
  paraEnvio: () => ({}),
  filtros: [
    {
      nome: 'acao',
      rotulo: 'Ação',
      opcoes: Object.entries(ACOES).map(([valor, a]) => ({ valor, texto: a.texto })),
    },
    { nome: 'entidade', rotulo: 'Tela', opcoes: ENTIDADES.map((e) => ({ valor: e, texto: e })) },
    {
      nome: 'periodo',
      rotulo: 'Período',
      opcoes: [
        { valor: 'HOJE', texto: 'Hoje' },
        { valor: '7D', texto: 'Últimos 7 dias' },
        { valor: '30D', texto: 'Últimos 30 dias' },
      ],
    },
  ],
  colunas: [
    { chave: 'ocorrido_em', titulo: 'Quando', render: (r) => formatarDataHora(r.ocorrido_em) },
    { chave: 'usuario_nome', titulo: 'Usuário', render: (r) => `${r.usuario_nome} (${r.perfil.toLowerCase()})` },
    { chave: 'acao', titulo: 'Ação', render: (r) => criarBadge(ACOES[r.acao]?.texto ?? r.acao, ACOES[r.acao]?.tom ?? 'neutro') },
    { chave: 'entidade', titulo: 'Tela' },
    { chave: 'descricao', titulo: 'O que foi feito' },
  ],
};

export function paginaAuditoria(): HTMLElement {
  return criarPaginaCrud(CONFIG_AUDITORIA);
}
