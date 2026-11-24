// preload: a ponte entre a tela (renderer) e o main. expõe só o window.api
import { contextBridge, ipcRenderer } from 'electron';

// os canais que a tela pode chamar. qualquer outro nome é barrado aqui mesmo
// (a lista completa e o que cada um faz está em docs/FRONT.md)
const CRUD = ['listar', 'obter', 'criar', 'atualizar', 'inativar'];

const CANAIS_POR_MODULO: Record<string, string[]> = {
  auth: ['login', 'sessao', 'sair'],
  sync: ['estado'],
  cep: ['buscar'],
  dolar: ['atual'],
  whatsapp: ['abrir'],
  dashboard: ['resumo'],
  clientes: CRUD,
  animais: [...CRUD, 'listar_por_cliente'],
  medicamentos: CRUD,
  fornecedores: [...CRUD, 'precos_listar', 'precos_salvar', 'precos_inativar'],
  colaboradores: [...CRUD, 'redefinir_senha'],
  agendamentos: ['listar', 'criar', 'atualizar', 'cancelar', 'veterinarios'],
  consultas: ['listar', 'obter', 'criar', 'historico_animal'],
  estoque: ['saldos', 'lotes', 'movimentar'],
  alertas: ['listar', 'contar'],
  vacinas: ['catalogo_listar', 'catalogo_obter', 'catalogo_criar', 'catalogo_atualizar', 'catalogo_inativar', 'fila', 'aplicar', 'lembrete_registrar'],
  servicos: CRUD,
  orcamentos: ['listar', 'obter', 'criar', 'pdf'],
  relatorios: ['cobrancas', 'estoque_validade', 'lista_compras'],
  csv: ['exportar', 'importar'],
  sync_conflitos: ['listar', 'resolver'],
  auditoria: ['listar'],
  configuracoes: ['obter', 'atualizar'],
  backup: ['listar', 'criar', 'restaurar']
};

const electronAPI = Object.fromEntries(Object.entries(CANAIS_POR_MODULO).flatMap(([modulo, acoes]) =>
  acoes.map((acao) => {
    const canal = `${modulo}:${acao}`;
    return [canal, (dados?: unknown) => ipcRenderer.invoke(canal, dados)] as const;
  })
));

contextBridge.exposeInMainWorld('api', electronAPI);
