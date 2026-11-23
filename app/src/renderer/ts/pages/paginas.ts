import { criarEstadoVazio } from '../components/ui/index.js';
import { el } from '../lib/dom.js';
import type { RenderizarPagina } from '../router/router.js';
import { paginaAgenda } from './agenda/agenda.js';
import { paginaAnimais } from './animais/animais.js';
import { paginaAuditoria } from './auditoria/auditoria.js';
import { paginaClienteDetalhe, paginaClientes } from './clientes/clientes.js';
import { paginaColaboradores } from './colaboradores/colaboradores.js';
import { paginaConfiguracoes } from './configuracoes/configuracoes.js';
import { paginaConflitos } from './conflitos/conflitos.js';
import { paginaConsultas } from './consultas/consultas.js';
import { montarCatalogo } from './dev-componentes/catalogo.js';
import { paginaEstoque } from './estoque/estoque.js';
import { paginaFornecedores } from './fornecedores/fornecedores.js';
import { paginaInicio } from './inicio/inicio.js';
import { paginaMedicamentos } from './medicamentos/medicamentos.js';
import { paginaOrcamentos } from './orcamentos/orcamentos.js';
import { paginaRelatorios } from './relatorios/relatorios.js';
import { paginaVacinas } from './vacinas/vacinas.js';

/** liga cada rota à função que desenha a tela */
export function criarPaginas(): Record<string, RenderizarPagina> {
  return {
    inicio: () => paginaInicio(),
    agenda: () => paginaAgenda(),
    consultas: () => paginaConsultas(),
    vacinas: () => paginaVacinas(),
    // clientes: lista (#/clientes) e detalhe (#/clientes/123)
    clientes: (id) => (id ? paginaClienteDetalhe(id) : paginaClientes()),
    animais: () => paginaAnimais(),
    fornecedores: () => paginaFornecedores(),
    colaboradores: () => paginaColaboradores(),
    medicamentos: () => paginaMedicamentos(),
    estoque: () => paginaEstoque(),
    orcamentos: () => paginaOrcamentos(),
    relatorios: () => paginaRelatorios(),
    conflitos: () => paginaConflitos(),
    auditoria: () => paginaAuditoria(),
    configuracoes: () => paginaConfiguracoes(),
    'dev/componentes': () => montarCatalogo(),
    // tela coringa, pra rota sem tela pronta
    __vazia: () => el('section', 'pagina', [criarEstadoVazio({ icone: 'info', titulo: 'Tela em construção' })]),
  };
}
