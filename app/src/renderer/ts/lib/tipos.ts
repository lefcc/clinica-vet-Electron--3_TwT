export type Perfil = 'MASTER' | 'VETERINARIO' | 'ATENDENTE';

export interface Sessao {
  usuarioId: string;
  nome: string;
  perfil: Perfil;
  expiraEm: number;
}

// formato das listagens: itens da página + total geral
export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

// o que se manda pra pedir uma lista
export interface EntradaListagem {
  pagina: number;
  tamanho: number;
  busca?: string;
  [filtro: string]: unknown;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  ativo: boolean;
}

export interface Animal {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  nome: string;
  especie: string;
  raca?: string;
  sexo: 'M' | 'F';
  data_nascimento?: string;
  peso_kg?: number;
  observacoes?: string;
  /** idade pronta do back-end ("3 anos e 2 meses") */
  idade_texto?: string;
  ativo: boolean;
}

export interface Medicamento {
  id: string;
  nome: string;
  principio_ativo?: string;
  unidade: string;
  dias_alerta: number;
  consumo_inicial_diario?: number | null;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  tipo: 'NACIONAL' | 'IMPORTADO';
  contato?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  crmv?: string;
  telefone?: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
}

export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO';

export interface Agendamento {
  id: string;
  cliente_id?: string;
  animal_id: string;
  animal_nome: string;
  cliente_nome: string;
  veterinario_id: string;
  veterinario_nome: string;
  inicio: string; // utc
  duracao_min: number;
  motivo?: string;
  status: StatusAgendamento;
  /** false = marcado offline, ainda sem confirmação do servidor */
  confirmado: boolean;
}

export interface Prescricao {
  medicamento_id: string;
  medicamento_nome?: string;
  quantidade: number;
  posologia?: string;
}

export interface Consulta {
  id: string;
  animal_id: string;
  animal_nome: string;
  cliente_nome: string;
  veterinario_nome: string;
  data: string; // utc
  anamnese?: string;
  /** não vem pro atendente (privacidade) */
  diagnostico?: string;
  observacoes?: string;
  prescricoes: Prescricao[];
}

// crítico = dias restantes no limite de alerta
export type StatusEstoque = 'OK' | 'ATENCAO' | 'CRITICO';

export interface SaldoEstoque {
  medicamento_id: string;
  medicamento_nome: string;
  unidade: string;
  saldo: number;
  consumo_medio_diario: number;
  dias_restantes: number | null;
  dias_alerta: number;
  status: StatusEstoque;
}

export interface Lote {
  id: string;
  numero: string;
  validade: string; // só a data, tipo "2026-11-20"
  saldo: number;
}

export interface AlertaEstoque {
  id: string;
  medicamento_nome: string;
  dias_restantes: number;
  saldo: number;
  unidade: string;
}

export interface VacinaCatalogo {
  id: string;
  nome: string;
  descricao?: string;
  intervalo_reforco_dias: number;
  ativo: boolean;
}

export interface VacinaFila {
  id: string;
  animal_nome: string;
  cliente_nome: string;
  telefone: string;
  vacina_nome: string;
  proxima_dose: string; // só a data, tipo "2026-11-20"
  lembrete_enviado: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  valor_centavos: number;
  ativo: boolean;
}

// item do orçamento (valor unitário congelado)
export interface ItemOrcamento {
  tipo: 'SERVICO' | 'MEDICAMENTO';
  item_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario_centavos: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  cliente_nome: string;
  animal_nome?: string;
  criado_em: string;
  itens: ItemOrcamento[];
  desconto_centavos: number;
  total_centavos: number;
  forma_pagamento: string;
}

// versões em conflito (dois pcs editaram offline)
export interface Conflito {
  id: string;
  tabela: string;
  registro_id: string;
  tipo: string;
  dados_local: Record<string, unknown>;
  dados_central: Record<string, unknown>;
  criado_em: string;
}

export interface EstadoSync {
  estado: 'sincronizado' | 'sincronizando' | 'erro';
  pendentes: number;
  ultimo_sync_em?: string;
}

export interface Cotacao {
  valor_centavos: number;
  atualizado_em: string;
  origem: 'API' | 'CACHE';
}

export interface ResumoInicio {
  agenda_hoje: Agendamento[];
  alertas_estoque: AlertaEstoque[];
  vacinas_proximas: VacinaFila[];
  pendencias_sync: number;
}

export interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

// uma linha da auditoria: quem fez o quê e quando (registros só de leitura)
export interface AuditoriaRegistro {
  id: string;
  ocorrido_em: string; // data e hora em utc
  usuario_nome: string;
  perfil: Perfil;
  acao: string; // ex.: LOGIN, CRIAR, ATUALIZAR, INATIVAR, BACKUP
  entidade: string; // tela/tabela afetada (ex.: clientes)
  registro_id?: string;
  descricao: string;
}

// configurações da clínica (só o administrador altera)
export interface Configuracoes {
  nome_clinica: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  /** texto do lembrete de vacina, com {tutor}, {animal}, {vacina} e {data} */
  template_lembrete: string;
  backup_horario: string; // "HH:MM"
  backup_manter: number; // quantos backups guardar
}

export interface BackupArquivo {
  id: string;
  criado_em: string; // utc
  tipo: 'AUTOMATICO' | 'MANUAL';
  tamanho_bytes: number;
}

// preço de um medicamento num fornecedor (em reais ou dólar)
export interface PrecoFornecedor {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_tipo: 'NACIONAL' | 'IMPORTADO';
  moeda: 'BRL' | 'USD';
  preco_centavos: number; // na moeda original
  /** já convertido pelo back-end com a cotação do dia (reais, em centavos) */
  preco_reais_centavos: number;
  /** 0 para o mais barato; os outros mostram quanto a mais, em % */
  diferenca_percentual: number;
  mais_barato: boolean;
  atualizado_em: string; // utc
}
