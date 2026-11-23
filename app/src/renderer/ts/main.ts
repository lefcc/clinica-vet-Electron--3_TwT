import { api, definirAoSessaoExpirada } from './lib/api.js';
import { definirSessao } from './lib/sessao.js';
import type { Sessao } from './lib/tipos.js';
import { mostrarToast } from './components/ui/index.js';
import { montarShell, type Shell } from './layout/shell.js';
import { iniciarRoteador } from './router/router.js';
import { criarPaginas } from './pages/paginas.js';
import { montarLogin } from './pages/login/login.js';

const raiz = document.getElementById('app') as HTMLElement;
let shell: Shell | null = null;
let roteador: { parar: () => void } | null = null;

// desliga menu e roteador
function pararApp(): void {
  roteador?.parar();
  shell?.parar();
  roteador = null;
  shell = null;
}

// desenha o login; se der certo, chama o iniciarApp
function mostrarLogin(): void {
  pararApp();
  definirSessao(null);
  montarLogin(raiz, iniciarApp);
}

// monta o sistema pra quem entrou (sessão, menu e roteador)
function iniciarApp(sessao: Sessao): void {
  pararApp();
  definirSessao(sessao);
  if (!window.location.hash || window.location.hash === '#/') window.location.hash = '#/inicio';

  const novoShell = montarShell(raiz, sessao, () => {
    void api.invoke('auth:sair').finally(() => {
      window.location.hash = '#/inicio';
      mostrarLogin();
    });
  });
  shell = novoShell;
  roteador = iniciarRoteador({
    perfil: sessao.perfil,
    container: novoShell.conteudo,
    paginas: criarPaginas(),
    aoNavegar: (rota) => novoShell.marcarAtivo(rota),
  });
}

async function iniciar(): Promise<void> {
  // sessão expirada em qualquer chamada: volta pro login
  definirAoSessaoExpirada(() => {
    mostrarToast('aviso', 'Sua sessão expirou. Entre novamente.');
    mostrarLogin();
  });
  // se o main ainda lembra de quem logou, entra direto
  const r = await api.invoke<Sessao>('auth:sessao');
  if (r.ok) iniciarApp(r.dados);
  else mostrarLogin();
}

void iniciar();
