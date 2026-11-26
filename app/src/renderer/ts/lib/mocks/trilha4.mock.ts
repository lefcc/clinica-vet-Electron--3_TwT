// respostas de mentira da trilha 4, pra testar as telas sem back-end (nada disso é gravado)
import type { IPCResponse } from '../api.js';
import { hojeEmSaoPaulo } from '../formatadores.js';
import type { Endereco, Orcamento, ResumoInicio, Servico, VacinaCatalogo, VacinaFila } from '../tipos.js';

export type HandlerMockTrilha4 = (dados?: unknown) => IPCResponse<unknown>;

const ok = <T>(dados: T): IPCResponse<T> => ({ ok: true, dados });
const erro = (codigo: string, mensagem: string): IPCResponse<never> => ({ ok: false, erro: { codigo, mensagem } });
const pagina = <T>(itens: T[]) => ok({ itens, total: itens.length, pagina: 1, tamanho: 10 });

export function criarMockTrilha4(): Record<string, HandlerMockTrilha4> {
  const vacinas: VacinaCatalogo[] = [{ id: 'v1', nome: 'V10', intervalo_reforco_dias: 365, ativo: true }];
  const servicos: Servico[] = [{ id: 's1', nome: 'Consulta', valor_centavos: 15000, ativo: true }];
  const fila: VacinaFila[] = [{
    id: 'ap1', animal_nome: 'Rex', cliente_nome: 'Carlos', telefone: '19999998888', vacina_nome: 'V10',
    proxima_dose: hojeEmSaoPaulo(), lembrete_enviado: false
  }];
  const orcamentos: Orcamento[] = [];

  return {
    'dashboard:resumo': () => ok<ResumoInicio>({ agenda_hoje: [], alertas_estoque: [], vacinas_proximas: fila, pendencias_sync: 0 }),
    'cep:buscar': (dados) => {
      const { cep } = dados as { cep: string };
      if (!/^\d{8}$/.test(cep)) return erro('CEP_INVALIDO', 'O CEP precisa ter 8 números.');
      return ok<Endereco>({ cep, logradouro: 'Rua de Exemplo', bairro: 'Centro', cidade: 'Limeira', uf: 'SP' });
    },
    'whatsapp:abrir': () => ok({}),
    'vacinas:catalogo_listar': () => pagina(vacinas),
    'vacinas:fila': () => ok(fila),
    'vacinas:lembrete_registrar': (dados) => {
      const item = fila.find((v) => v.id === (dados as { id: string }).id);
      if (!item) return erro('NAO_ENCONTRADO', 'Aplicação de vacina não encontrada.');
      item.lembrete_enviado = true;
      return ok({});
    },
    'servicos:listar': () => pagina(servicos),
    'orcamentos:listar': () => pagina(orcamentos),
    'orcamentos:criar': (dados) => {
      const d = dados as Pick<Orcamento, 'itens' | 'desconto_centavos' | 'forma_pagamento'>;
      const soma = d.itens.reduce((t, i) => t + i.quantidade * i.valor_unitario_centavos, 0);
      const novo: Orcamento = {
        ...d, id: `o${orcamentos.length + 1}`, numero: orcamentos.length + 1, cliente_nome: 'Carlos',
        criado_em: new Date().toISOString(), total_centavos: Math.max(0, soma - d.desconto_centavos)
      };
      orcamentos.push(novo);
      return ok(novo);
    },
    'orcamentos:pdf': () => erro('PDF_CANCELADO', 'No mock não tem PDF.'),
    'relatorios:cobrancas': () => ok(orcamentos.map((o) => ({ ...o, data: o.criado_em }))),
    'relatorios:estoque_validade': () => ok([]),
    'relatorios:lista_compras': () => ok([]),
    'csv:exportar': () => ok({ nome_arquivo: 'clientes.csv', conteudo: 'nome;cpf' }),
    'csv:importar': () => ok({ importados: 0, ignorados: 0 })
  };
}
