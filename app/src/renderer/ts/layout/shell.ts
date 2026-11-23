import { el } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { criarIcone } from '../lib/icones.js';
import { criarBotao } from '../components/ui/index.js';
import type { EstadoSync, Perfil } from '../lib/tipos.js';
import { GRUPOS_MENU, itensDoMenu } from './menu.config.js';

export interface SessaoUi {
  nome: string;
  perfil: Perfil;
}

export interface Shell {
  /** onde o roteador desenha a tela */
  conteudo: HTMLElement;
  marcarAtivo: (rota: string) => void;
  /** desliga os timers internos (chamar ao sair) */
  parar: () => void;
}

const NOME_PERFIL: Record<Perfil, string> = {
  MASTER: 'Administrador',
  VETERINARIO: 'Veterinário(a)',
  ATENDENTE: 'Atendente',
};

// iniciais do nome pro avatar ("Will Almeida" = "WA")
function iniciais(nome: string): string {
  const partes = nome.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/** monta o side bar, o header e o botão Sair */
export function montarShell(raiz: HTMLElement, sessao: SessaoUi, aoSair: () => void): Shell {
  const links = new Map<string, HTMLAnchorElement>();

  // --- side bar, por grupos ---
  // só entram as telas que o perfil pode ver
  const itens = itensDoMenu(sessao.perfil);
  const grupos = GRUPOS_MENU.map((grupo) => {
    const doGrupo = itens.filter((i) => i.grupo === grupo);
    if (!doGrupo.length) return null;
    const lista = el('ul', 'menu__lista');
    for (const item of doGrupo) {
      const link = el('a', 'menu__link', [criarIcone(item.icone, 20), el('span', '', [item.titulo])], { href: `#/${item.rota}` });
      links.set(item.rota, link);
      lista.append(el('li', '', [link]));
    }
    return el('div', 'menu__grupo', [el('p', 'menu__titulo', [grupo]), lista]);
  });
  const menu = el('nav', 'menu', [
    el('div', 'menu__marca', [el('span', 'menu__logo', [criarIcone('animais', 22)]), el('span', '', ['Clínica Vet'])]),
    ...grupos,
  ], { 'aria-label': 'Menu principal' });

  // --- header: sincronização, alertas e usuário ---
  const indicador = el('span', 'sync', [el('span', 'sync__ponto'), el('span', 'sync__texto')], { role: 'status' });
  const textoSync = indicador.querySelector('.sync__texto') as HTMLElement;
  const definirSync = (classe: string, texto: string): void => {
    indicador.className = `sync sync--${classe}`;
    textoSync.textContent = texto;
  };

  const contador = el('span', 'sino__contador');
  contador.hidden = true;
  const sino = el('a', 'sino', [criarIcone('sino', 20), contador], { href: '#/estoque', 'aria-label': 'Alertas de estoque', title: 'Alertas de estoque' });

  // atualiza a etiqueta de sincronização (offline é só aviso)
  async function atualizarSync(): Promise<void> {
    if (!navigator.onLine) {
      definirSync('offline', 'Offline — dados salvos neste computador');
      return;
    }
    const resposta = await api.invoke<EstadoSync>('sync:estado');
    if (!resposta.ok) return definirSync('erro', 'Sincronização com problema');
    const { estado, pendentes } = resposta.dados;
    if (estado === 'erro') definirSync('erro', 'Sincronização com problema');
    else if (estado === 'sincronizando' || pendentes > 0) definirSync('pendente', `${pendentes} pendente${pendentes === 1 ? '' : 's'} de envio`);
    else definirSync('ok', 'Sincronizado');
  }

  // número de alertas no sino (some se for zero)
  async function atualizarAlertas(): Promise<void> {
    const resposta = await api.invoke<{ total: number }>('alertas:contar');
    if (!resposta.ok) return;
    contador.textContent = String(resposta.dados.total);
    contador.hidden = resposta.dados.total === 0;
  }

  const atualizarTudo = (): void => {
    void atualizarSync();
    void atualizarAlertas();
  };
  // atualiza ao abrir, quando a internet muda e a cada 20s
  window.addEventListener('online', atualizarTudo);
  window.addEventListener('offline', atualizarTudo);
  atualizarTudo();
  const relogio = window.setInterval(atualizarTudo, 20000);

  const topo = el('header', 'topo', [
    indicador,
    el('div', 'topo__direita', [
      sino,
      el('div', 'topo__usuario', [
        el('span', 'avatar', [iniciais(sessao.nome)], { 'aria-hidden': 'true' }),
        el('div', 'topo__dados', [el('strong', '', [sessao.nome]), el('span', 'topo__perfil', [NOME_PERFIL[sessao.perfil]])]),
      ]),
    ]),
  ]);

  const conteudo = el('main', 'conteudo', [], { id: 'conteudo', tabindex: -1 });

  // fixo no canto de baixo, à direita (css .sair)
  const botaoSair = criarBotao({ texto: 'Sair', icone: 'sair', variante: 'secundario', onClick: aoSair });
  botaoSair.classList.add('sair');

  raiz.replaceChildren(el('div', 'shell', [menu, el('div', 'shell__corpo', [topo, conteudo])]), botaoSair);

  return {
    conteudo,
    // destaca no menu a tela atual
    marcarAtivo(rota) {
      for (const [rotaLink, link] of links) {
        const ativo = rotaLink === rota;
        link.classList.toggle('menu__link--ativo', ativo);
        if (ativo) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
    parar() {
      window.clearInterval(relogio);
      window.removeEventListener('online', atualizarTudo);
      window.removeEventListener('offline', atualizarTudo);
    },
  };
}
