import { api } from '../../lib/api.js';
import { formatarTelefone } from '../../lib/mascaras.js';
import type { Colaborador } from '../../lib/tipos.js';
import { abrirModal, criarBadge, criarBotao, criarBotaoIcone, criarFormulario, mostrarToast, type Tom } from '../../components/ui/index.js';
import { criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { opcional, soNumeros } from '../comum/util.js';

const NOME_PERFIL: Record<string, { texto: string; tom: Tom }> = {
  MASTER: { texto: 'Administrador', tom: 'info' },
  VETERINARIO: { texto: 'Veterinário(a)', tom: 'sucesso' },
  ATENDENTE: { texto: 'Atendente', tom: 'neutro' },
};

// janela pra redefinir a senha (mínimo 8 caracteres)
function abrirRedefinirSenha(colaborador: Colaborador): void {
  const form = criarFormulario([
    {
      nome: 'nova_senha',
      rotulo: 'Nova senha',
      tipo: 'senha',
      obrigatorio: true,
      largura: 'inteira',
      dica: 'Mínimo de 8 caracteres.',
      validar: (v) => (v.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' : undefined),
    },
  ]);
  let salvando = false;
  const botao = criarBotao({ texto: 'Redefinir senha', icone: 'trava', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: `Redefinir senha de ${colaborador.nome}`,
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });
  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const r = await api.invoke('colaboradores:redefinir_senha', { id: colaborador.id, nova_senha: form.obterValores()['nova_senha'] });
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return form.definirErro('nova_senha', r.erro.mensagem);
    mostrarToast('sucesso', 'Senha redefinida.');
    modal.fechar();
  }
  form.aoEnviar(() => void salvar());
}

// cadastro de colaboradores (só o administrador)
const CONFIG_COLABORADORES: ConfigCrud<Colaborador> = {
  canal: 'colaboradores',
  titulo: 'Colaboradores',
  subtitulo: 'Equipe da clínica e acesso ao sistema. Somente o administrador vê esta tela.',
  singular: 'colaborador',
  textoNovo: 'Novo colaborador',
  textoBusca: 'Buscar por nome, CPF ou login...',
  podeEscrever: (p) => p === 'MASTER',
  nomeDoItem: (c) => c.nome,
  colunas: [
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'cargo', titulo: 'Cargo' },
    { chave: 'crmv', titulo: 'CRMV', render: (c) => c.crmv ?? '—' },
    { chave: 'login', titulo: 'Login' },
    { chave: 'perfil', titulo: 'Perfil', render: (c) => criarBadge(NOME_PERFIL[c.perfil]?.texto ?? c.perfil, NOME_PERFIL[c.perfil]?.tom ?? 'neutro') },
    { chave: 'telefone', titulo: 'Telefone', render: (c) => (c.telefone ? formatarTelefone(c.telefone) : '—') },
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, largura: 'inteira' },
    { nome: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
    { nome: 'cargo', rotulo: 'Cargo', obrigatorio: true },
    {
      nome: 'perfil',
      rotulo: 'Perfil de acesso',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: 'MASTER', texto: 'Administrador (MASTER)' },
        { valor: 'VETERINARIO', texto: 'Veterinário(a)' },
        { valor: 'ATENDENTE', texto: 'Atendente' },
      ],
    },
    {
      nome: 'crmv',
      rotulo: 'CRMV',
      dica: 'Obrigatório para veterinários.',
      validar: (v, todos) => (todos['perfil'] === 'VETERINARIO' && !v ? 'O CRMV é obrigatório para veterinários.' : undefined),
    },
    { nome: 'login', rotulo: 'Login de acesso', obrigatorio: true },
    {
      nome: 'senha',
      rotulo: 'Senha inicial',
      tipo: 'senha',
      obrigatorio: true,
      somenteCriacao: true,
      dica: 'Mínimo de 8 caracteres.',
      validar: (v) => (v.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' : undefined),
    },
  ],
  // erro do back-end -> campo que mostra a mensagem
  errosCampo: { LOGIN_DUPLICADO: 'login', CPF_DUPLICADO: 'cpf', CRMV_OBRIGATORIO: 'crmv' },
  paraFormulario: (c) => ({ nome: c.nome, cpf: c.cpf, telefone: c.telefone ?? '', cargo: c.cargo, perfil: c.perfil, crmv: c.crmv ?? '', login: c.login }),
  // a senha só vai na criação
  paraEnvio: (v, editando) => ({
    nome: v['nome'],
    cpf: soNumeros(v['cpf']),
    telefone: soNumeros(v['telefone']),
    cargo: v['cargo'],
    perfil: v['perfil'],
    crmv: opcional(v['crmv']),
    login: v['login'],
    ...(editando ? {} : { senha: v['senha'] }),
  }),
  acoesExtras: (colaborador) => [criarBotaoIcone('trava', 'Redefinir senha', () => abrirRedefinirSenha(colaborador))],
};

export function paginaColaboradores(): HTMLElement {
  return criarPaginaCrud(CONFIG_COLABORADORES);
}
