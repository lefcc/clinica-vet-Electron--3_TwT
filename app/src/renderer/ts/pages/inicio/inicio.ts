import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { diasAte, formatarDia, horaAtualSaoPaulo } from '../../lib/formatadores.js';
import { obterSessao } from '../../lib/sessao.js';
import type { ResumoInicio } from '../../lib/tipos.js';
import { criarBadge, criarCabecalhoPagina, criarCartao, criarEstadoVazio, criarEstatistica, criarSpinner } from '../../components/ui/index.js';
import { horaLocal } from '../comum/util.js';

// "bom dia", "boa tarde" ou "boa noite" conforme a hora (em são paulo)
function saudacao(): string {
  const h = horaAtualSaoPaulo();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** painel inicial (o back-end já filtra os dados por perfil) */
export async function paginaInicio(): Promise<HTMLElement> {
  const sessao = obterSessao();
  const perfil = sessao?.perfil;
  const raiz = el('section', 'pagina', [
    criarCabecalhoPagina({ titulo: `${saudacao()}, ${(sessao?.nome ?? '').split(' ')[0]}`, subtitulo: 'Resumo do dia na clínica.' }),
    criarSpinner(),
  ]);

  const r = await api.invoke<ResumoInicio>('dashboard:resumo');
  raiz.querySelector('.spinner')?.remove();
  if (!r.ok) {
    raiz.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar o resumo', descricao: r.erro.mensagem }));
    return raiz;
  }
  const d = r.dados;

  // cards de número (clicáveis)
  const estatisticas = [
    criarEstatistica({ rotulo: perfil === 'VETERINARIO' ? 'Seus atendimentos hoje' : 'Atendimentos hoje', valor: String(d.agenda_hoje.length), icone: 'agenda', tom: 'info', rota: 'agenda' }),
    criarEstatistica({ rotulo: 'Vacinas para avisar', valor: String(d.vacinas_proximas.length), detalhe: 'nos próximos 3 dias', icone: 'vacinas', tom: d.vacinas_proximas.length ? 'aviso' : 'sucesso', rota: 'vacinas' }),
    criarEstatistica({ rotulo: 'Estoque crítico', valor: String(d.alertas_estoque.length), icone: 'estoque', tom: d.alertas_estoque.length ? 'erro' : 'sucesso', rota: 'estoque' }),
    perfil === 'MASTER' ? criarEstatistica({ rotulo: 'Pendentes de sincronização', valor: String(d.pendencias_sync), icone: 'conflitos', tom: d.pendencias_sync ? 'aviso' : 'sucesso', rota: 'conflitos' }) : null,
  ];
  raiz.append(el('div', 'estatisticas', estatisticas));

  // listas (vazias mostram mensagem simpática)
  const agenda =
    d.agenda_hoje.length === 0
      ? criarEstadoVazio({ icone: 'agenda', titulo: 'Sem atendimentos hoje' })
      : el(
          'ul',
          'lista-simples',
          d.agenda_hoje.map((a) =>
            el('li', 'lista-simples__item', [
              el('strong', 'lista-simples__hora', [horaLocal(a.inicio)]),
              el('span', '', [`${a.animal_nome} — ${a.cliente_nome}`]),
              el('span', 'lista-simples__extra', [a.veterinario_nome]),
              a.confirmado ? null : criarBadge('Não confirmado', 'aviso'),
            ]),
          ),
        );

  const alertas =
    d.alertas_estoque.length === 0
      ? criarEstadoVazio({ icone: 'sucesso', titulo: 'Estoque em dia' })
      : el(
          'ul',
          'lista-simples',
          d.alertas_estoque.map((a) => el('li', 'lista-simples__item', [el('strong', '', [a.medicamento_nome]), el('span', 'lista-simples__extra', [`restam ${a.saldo} ${a.unidade} · ~${a.dias_restantes} dias`])])),
        );

  const vacinas =
    d.vacinas_proximas.length === 0
      ? criarEstadoVazio({ icone: 'vacinas', titulo: 'Nenhum lembrete pendente' })
      : el(
          'ul',
          'lista-simples',
          d.vacinas_proximas.map((v) => {
            const dias = diasAte(v.proxima_dose);
            return el('li', 'lista-simples__item', [
              el('strong', '', [v.animal_nome]),
              el('span', '', [v.vacina_nome]),
              el('span', 'lista-simples__extra', [`${formatarDia(v.proxima_dose)} (${dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`})`]),
            ]);
          }),
        );

  raiz.append(
    el('div', 'painel', [
      criarCartao({ titulo: perfil === 'VETERINARIO' ? 'Sua agenda de hoje' : 'Agenda de hoje', filhos: [agenda], acao: { texto: 'Abrir agenda', onClick: () => (window.location.hash = '#/agenda') } }),
      criarCartao({ titulo: 'Estoque crítico', filhos: [alertas], acao: { texto: 'Ver estoque', onClick: () => (window.location.hash = '#/estoque') } }),
      criarCartao({ titulo: 'Vacinas a avisar', filhos: [vacinas], acao: { texto: 'Ver fila', onClick: () => (window.location.hash = '#/vacinas') } }),
    ]),
  );
  return raiz;
}
