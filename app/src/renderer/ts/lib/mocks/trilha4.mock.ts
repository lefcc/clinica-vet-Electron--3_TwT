import type { IPCResponse } from '../api.js';
import { hojeEmSaoPaulo } from '../formatadores.js';
import type { Endereco, Orcamento, ResumoInicio, Servico, VacinaCatalogo, VacinaFila } from '../tipos.js';

export type HandlerMockTrilha4 = (dados?: unknown) => IPCResponse<unknown>;

const ok = <T>(dados: T): IPCResponse<T> => ({ ok: true, dados });
const erro = (codigo: string, mensagem: string): IPCResponse<never> => ({ ok: false, erro: { codigo, mensagem } });
const pagina = <T>(itens: T[]) => ok({ itens, total: itens.length, pagina: 1, tamanho: 10 });

// esta função devolve respostas de mentira pra testar as telas
export function criarMockTrilha4(): Record<string, HandlerMockTrilha4> {
  const vacinas: VacinaCatalogo[] = [{ id: 'v1', nome: 'V10', intervalo_reforco_dias: 365, ativo: true }];
  const servicos: Servico[] = [{ id: 's1', nome: 'Consulta', valor_centavos: 15000, ativo: true }];
  const fila: VacinaFila[] = [{
    id: 'ap1', animal_nome: 'Rex', cliente_nome: 'Carlos', telefone: '19999998888', vacina_nome: 'V10',
    proxima_dose: hojeEmSaoPaulo(), lembrete_enviado: false
  }];
  const orcamentos: Orcamento[] = [];

  // esta função cria as respostas de listar, obter, criar, atualizar e inativar
  function cadastro<T extends { id: string; ativo: boolean }>(lista: T[], prefixo: string): Record<string, HandlerMockTrilha4> {
    const achar = (dados: unknown) => lista.find((i) => i.id === (dados as { id: string }).id && i.ativo);
    const naoAchou = () => erro('NAO_ENCONTRADO', 'Registro não encontrado.');
    return {
      [`${prefixo}listar`]: () => pagina(lista.filter((i) => i.ativo)),
      [`${prefixo}obter`]: (dados) => { const item = achar(dados); return item ? ok(item) : naoAchou(); },
      [`${prefixo}criar`]: (dados) => {
        const item = { ...(dados as T), id: `${prefixo}${lista.length + 1}`, ativo: true };
        lista.push(item);
        return ok(item);
      },
      [`${prefixo}atualizar`]: (dados) => { const item = achar(dados); return item ? ok(Object.assign(item, dados)) : naoAchou(); },
      [`${prefixo}inativar`]: (dados) => {
        const item = achar(dados);
        if (!item) return naoAchou();
        item.ativo = false;
        return ok({});
      }
    };
  }

  return {
    ...cadastro(vacinas, 'vacinas:catalogo_'),
    ...cadastro(servicos, 'servicos:'),
    'vacinas:aplicar': (dados) => {
      const { vacina_id, data } = dados as { vacina_id: string; data: string };
      const vacina = vacinas.find((v) => v.id === vacina_id);
      if (!vacina) return erro('NAO_ENCONTRADO', 'Vacina não encontrada.');
      const proxima = new Date(Date.parse(`${data}T00:00:00Z`) + vacina.intervalo_reforco_dias * 86400000);
      return ok({ id: 'ap2', proxima_dose: proxima.toISOString().slice(0, 10) });
    },
    'orcamentos:obter': (dados) => {
      const orcamento = orcamentos.find((o) => o.id === (dados as { id: string }).id);
      return orcamento ? ok(orcamento) : erro('NAO_ENCONTRADO', 'Orçamento não encontrado.');
    },
    'dashboard:resumo': () => ok<ResumoInicio>({ agenda_hoje: [], alertas_estoque: [], vacinas_proximas: fila, pendencias_sync: 0 }),
    'cep:buscar': (dados) => {
      const { cep } = dados as { cep: string };
      if (!/^\d{8}$/.test(cep)) return erro('CEP_INVALIDO', 'O CEP precisa ter 8 números.');
      return ok<Endereco>({ cep, logradouro: 'Rua de Exemplo', bairro: 'Centro', cidade: 'Limeira', uf: 'SP' });
    },
    'whatsapp:abrir': () => ok({}),
    'vacinas:fila': () => ok(fila),
    'vacinas:lembrete_registrar': (dados) => {
      const item = fila.find((v) => v.id === (dados as { id: string }).id);
      if (!item) return erro('NAO_ENCONTRADO', 'Aplicação de vacina não encontrada.');
      item.lembrete_enviado = true;
      return ok({});
    },
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
