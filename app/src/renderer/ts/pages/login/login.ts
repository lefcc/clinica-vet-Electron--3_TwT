import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { criarIcone } from '../../lib/icones.js';
import type { Sessao } from '../../lib/tipos.js';
import { criarBotao, criarCampo, criarInput } from '../../components/ui/index.js';

/** tela de login (offline; erro sempre "Usuário ou senha inválidos") */
export function montarLogin(raiz: HTMLElement, aoEntrar: (sessao: Sessao) => void): void {
  const login = criarInput({ placeholder: 'Seu usuário', nome: 'login' });
  login.autocomplete = 'username';
  const senha = criarInput({ tipo: 'password', placeholder: 'Sua senha', nome: 'senha' });
  senha.autocomplete = 'current-password';
  const campoLogin = criarCampo({ rotulo: 'Usuário', controle: login });
  const campoSenha = criarCampo({ rotulo: 'Senha', controle: senha });
  const erro = el('p', 'login__erro', [], { role: 'alert' });
  erro.hidden = true;

  const entrar = criarBotao({ texto: 'Entrar', icone: 'trava', tipo: 'submit' });
  entrar.classList.add('btn--cheio');
  const form = el('form', 'login__form', [campoLogin.elemento, campoSenha.elemento, erro, entrar], { novalidate: true });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void enviar();
  });

  // confere os campos, pergunta ao back-end e entra
  async function enviar(): Promise<void> {
    if (entrar.disabled) return;
    campoLogin.definirErro();
    campoSenha.definirErro();
    erro.hidden = true;
    if (!login.value.trim()) return campoLogin.definirErro('Informe o usuário.');
    if (!senha.value) return campoSenha.definirErro('Informe a senha.');

    entrar.disabled = true;
    const r = await api.invoke<Sessao>('auth:login', { login: login.value.trim(), senha: senha.value });
    if (!form.isConnected) return;
    entrar.disabled = false;
    // errou: mostra o erro e limpa a senha
    if (!r.ok) {
      erro.textContent = r.erro.mensagem;
      erro.hidden = false;
      senha.value = '';
      senha.focus();
      return;
    }
    senha.value = '';
    aoEntrar(r.dados);
  }

  // esquerda: marca; direita: form
  const painelMarca = el('aside', 'login__marca', [
    el('div', 'login__logo', [criarIcone('animais', 40)]),
    el('h1', 'login__nome', ['Clínica Vet']),
    el('p', 'login__slogan', ['Cuidar bem dos animais começa por uma clínica organizada.']),
    el('ul', 'login__vantagens', [el('li', '', ['Funciona mesmo sem internet']), el('li', '', ['Agenda, prontuário e estoque num só lugar']), el('li', '', ['Lembretes de vacina para os tutores'])]),
  ]);

  const painelForm = el('main', 'login__painel', [
    el('div', 'login__caixa', [
      el('h2', '', ['Entrar no sistema']),
      el('p', 'login__ajuda', ['Use o usuário e a senha fornecidos pelo administrador.']),
      form,
    ]),
  ]);

  raiz.replaceChildren(el('div', 'login', [painelMarca, painelForm]));
  login.focus();
}
