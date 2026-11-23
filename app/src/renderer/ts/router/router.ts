import { criarEstadoVazio } from '../components/ui/index.js';
import { encontrarItem, podeAcessar, type Perfil } from '../layout/menu.config.js';

/** desenha uma tela (parametro vem de rotas como #/clientes/123) */
export type RenderizarPagina = (parametro?: string) => HTMLElement | Promise<HTMLElement>;

export interface OpcoesRoteador {
  perfil: Perfil;
  container: HTMLElement;
  paginas: Record<string, RenderizarPagina>;
  aoNavegar?: (rota: string) => void;
}

/** "#/clientes" vira "clientes"; vazio vira "inicio" */
export function rotaDoHash(hash: string): string {
  const rota = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  return rota || 'inicio';
}

/** "clientes/123" vira { base: "clientes", parametro: "123" } */
export function dividirRota(rota: string): { base: string; parametro?: string } {
  const partes = rota.split('/');
  if (partes[0] === 'dev') return { base: partes.slice(0, 2).join('/'), parametro: partes[2] };
  return { base: partes[0] ?? 'inicio', parametro: partes[1] };
}

// troca a tela quando o endereço muda, conferindo a rota e o perfil
export function iniciarRoteador(opcoes: OpcoesRoteador): { navegar: (rota: string) => void; parar: () => void } {
  const { perfil, container, paginas, aoNavegar } = opcoes;

  async function renderizar(): Promise<void> {
    const { base, parametro } = dividirRota(rotaDoHash(window.location.hash));
    aoNavegar?.(base);
    container.replaceChildren();

    // 1) rota que não existe
    if (!encontrarItem(base)) {
      container.append(criarEstadoVazio({ icone: 'buscar', titulo: 'Página não encontrada', descricao: 'Volte ao Início pelo menu.' }));
      return;
    }
    // 2) a rota existe, mas o perfil não pode ver
    if (!podeAcessar(perfil, base)) {
      container.append(criarEstadoVazio({ icone: 'trava', titulo: 'Acesso não permitido', descricao: 'Seu perfil não tem permissão para esta tela.' }));
      return;
    }
    const pagina = paginas[base];
    if (!pagina) {
      container.append(criarEstadoVazio({ icone: 'info', titulo: 'Tela ainda não implementada' }));
      return;
    }
    // 3) tudo certo: desenha e leva o foco pro conteúdo
    container.append(await pagina(parametro));
    container.focus();
  }

  const aoMudarHash = (): void => void renderizar();
  window.addEventListener('hashchange', aoMudarHash);
  void renderizar();

  return {
    navegar(rota) {
      window.location.hash = `#/${rota}`;
    },
    parar() {
      window.removeEventListener('hashchange', aoMudarHash);
    },
  };
}
