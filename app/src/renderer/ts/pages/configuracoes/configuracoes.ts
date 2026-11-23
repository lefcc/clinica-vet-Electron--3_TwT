import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarDia, formatarDataHora, formatarTamanho } from '../../lib/formatadores.js';
import { MARCADORES_LEMBRETE, TEMPLATE_LEMBRETE_PADRAO, montarMensagem } from '../../lib/lembrete.js';
import type { BackupArquivo, Configuracoes } from '../../lib/tipos.js';
import {
  confirmar,
  criarAbas,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarCabecalhoPagina,
  criarCampo,
  criarCartao,
  criarEstadoVazio,
  criarFormulario,
  criarSpinner,
  criarTabela,
  criarTextarea,
  mostrarToast,
  type Aba,
} from '../../components/ui/index.js';
import { opcional, soNumeros, UFS } from '../comum/util.js';

// pega as configurações no back-end; se falhar, mostra o erro na própria aba
async function carregarConfig(destino: HTMLElement): Promise<Configuracoes | null> {
  const r = await api.invoke<Configuracoes>('configuracoes:obter');
  if (r.ok) return r.dados;
  destino.replaceChildren(criarEstadoVazio({ icone: 'aviso', titulo: 'Não foi possível carregar', descricao: r.erro.mensagem }));
  return null;
}

// salva só os campos enviados (o back-end junta com o que já existe)
async function salvarConfig(campos: Partial<Configuracoes>): Promise<boolean> {
  const r = await api.invoke('configuracoes:atualizar', campos);
  if (!r.ok) {
    mostrarToast('erro', r.erro.mensagem);
    return false;
  }
  mostrarToast('sucesso', 'Configurações salvas.');
  return true;
}

// ---------- aba Backup ----------
async function abaBackup(): Promise<HTMLElement> {
  const raiz = el('div', 'stack', [criarSpinner()]);
  const config = await carregarConfig(raiz);
  if (!config) return raiz;

  const lista = el('div');
  const tabela = criarTabela<BackupArquivo>({
    textoVazio: 'Nenhum backup feito ainda.',
    onPagina: () => undefined,
    colunas: [
      { chave: 'criado_em', titulo: 'Quando', render: (b) => formatarDataHora(b.criado_em) },
      { chave: 'tipo', titulo: 'Tipo', render: (b) => criarBadge(b.tipo === 'AUTOMATICO' ? 'Automático' : 'Manual', b.tipo === 'AUTOMATICO' ? 'info' : 'sucesso') },
      { chave: 'tamanho_bytes', titulo: 'Tamanho', render: (b) => formatarTamanho(b.tamanho_bytes) },
      { chave: 'acoes', titulo: 'Ações', render: (b) => el('div', 'acoes', [criarBotaoIcone('historico', 'Restaurar este backup', () => void restaurar(b), true)]) },
    ],
  });
  lista.append(tabela.elemento);

  async function recarregar(): Promise<void> {
    tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, carregando: true });
    const r = await api.invoke<BackupArquivo[]>('backup:listar');
    if (!r.ok) return tabela.atualizar({ linhas: [], total: 0, pagina: 1, tamanho: 1, erro: r.erro.mensagem });
    tabela.atualizar({ linhas: r.dados, total: r.dados.length, pagina: 1, tamanho: Math.max(r.dados.length, 1) });
  }

  async function fazerAgora(botao: HTMLButtonElement): Promise<void> {
    botao.disabled = true;
    const r = await api.invoke<BackupArquivo>('backup:criar');
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Backup feito.');
    void recarregar();
  }

  // restaurar troca os dados atuais pelos do backup, por isso pede confirmação
  async function restaurar(b: BackupArquivo): Promise<void> {
    const sim = await confirmar({
      titulo: 'Restaurar backup',
      mensagem: `Os dados atuais serão substituídos pelos do backup de ${formatarDataHora(b.criado_em)}. Isso não pode ser desfeito.`,
      textoConfirmar: 'Restaurar',
      perigo: true,
    });
    if (!sim) return;
    const r = await api.invoke('backup:restaurar', { id: b.id });
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Backup restaurado.');
    void recarregar();
  }

  const botaoAgora = criarBotao({ texto: 'Fazer backup agora', icone: 'baixar', onClick: () => void fazerAgora(botaoAgora) });

  // agendamento do backup automático
  const form = criarFormulario([
    { nome: 'backup_horario', rotulo: 'Horário do backup automático', tipo: 'hora', obrigatorio: true },
    { nome: 'backup_manter', rotulo: 'Quantos backups guardar', tipo: 'numero', min: 1, max: 90, obrigatorio: true, dica: 'Os mais antigos são apagados.' },
  ]);
  form.definirValores({ backup_horario: config.backup_horario, backup_manter: String(config.backup_manter) });
  const botaoSalvar = criarBotao({
    texto: 'Salvar agendamento',
    icone: 'sucesso',
    variante: 'secundario',
    onClick: () => {
      if (form.validar()) void salvarConfig({ backup_horario: form.obterValores()['backup_horario'], backup_manter: Number(form.obterValores()['backup_manter']) });
    },
  });
  form.aoEnviar(() => botaoSalvar.click());

  raiz.replaceChildren(
    criarCartao({
      titulo: 'Backup dos dados',
      subtitulo: 'Cópia de segurança do banco deste computador. Guarde também uma cópia fora dele (pendrive ou nuvem).',
      filhos: [el('div', 'barra', [botaoAgora])],
    }),
    criarCartao({ titulo: 'Agendamento automático', filhos: [form.elemento, el('div', 'barra', [botaoSalvar])] }),
    criarCartao({ titulo: 'Backups feitos', filhos: [lista] }),
  );
  void recarregar();
  return raiz;
}

// ---------- aba Dados da clínica ----------
async function abaClinica(): Promise<HTMLElement> {
  const raiz = el('div', 'stack', [criarSpinner()]);
  const config = await carregarConfig(raiz);
  if (!config) return raiz;

  // o cep preenche o endereço sozinho (formulario.ts)
  const form = criarFormulario([
    { nome: 'nome_clinica', rotulo: 'Nome da clínica', obrigatorio: true, largura: 'inteira' },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
    { nome: 'cep', rotulo: 'CEP', tipo: 'cep', largura: 'terco' },
    { nome: 'logradouro', rotulo: 'Rua / Avenida', largura: 'doisTercos' },
    { nome: 'numero', rotulo: 'Número', largura: 'terco' },
    { nome: 'bairro', rotulo: 'Bairro', largura: 'terco' },
    { nome: 'cidade', rotulo: 'Cidade', largura: 'terco' },
    { nome: 'uf', rotulo: 'UF', tipo: 'select', opcoes: UFS, largura: 'terco' },
  ]);
  form.definirValores({
    nome_clinica: config.nome_clinica,
    telefone: config.telefone ?? '',
    email: config.email ?? '',
    cep: config.cep ?? '',
    logradouro: config.logradouro ?? '',
    numero: config.numero ?? '',
    bairro: config.bairro ?? '',
    cidade: config.cidade ?? '',
    uf: config.uf ?? '',
  });

  async function salvar(): Promise<void> {
    if (!form.validar()) return;
    const v = form.obterValores();
    await salvarConfig({
      nome_clinica: v['nome_clinica'],
      telefone: soNumeros(v['telefone']),
      email: opcional(v['email']),
      cep: soNumeros(v['cep']),
      logradouro: opcional(v['logradouro']),
      numero: opcional(v['numero']),
      bairro: opcional(v['bairro']),
      cidade: opcional(v['cidade']),
      uf: opcional(v['uf']),
    });
  }
  form.aoEnviar(() => void salvar());

  raiz.replaceChildren(
    criarCartao({
      titulo: 'Dados da clínica',
      subtitulo: 'Aparecem nos orçamentos em PDF.',
      filhos: [form.elemento, el('p', 'campo__dica', ['A logo da clínica será adicionada quando o Will enviar o arquivo (pendente).']), el('div', 'barra', [criarBotao({ texto: 'Salvar', icone: 'sucesso', onClick: () => void salvar() })])],
    }),
  );
  return raiz;
}

// ---------- aba Lembrete de vacina ----------
async function abaLembrete(): Promise<HTMLElement> {
  const raiz = el('div', 'stack', [criarSpinner()]);
  const config = await carregarConfig(raiz);
  if (!config) return raiz;

  const texto = criarTextarea({ linhas: 5, valor: config.template_lembrete });
  const campo = criarCampo({ rotulo: 'Texto da mensagem', controle: texto, obrigatorio: true });
  const previa = el('p', 'lembrete__previa');

  // mostra como a mensagem vai ficar, com dados de exemplo
  const atualizarPrevia = (): void => {
    previa.textContent = montarMensagem(texto.value || TEMPLATE_LEMBRETE_PADRAO, { tutor: 'Mariana Ferreira', animal: 'Thor', vacina: 'V10', data: formatarDia(new Date().toISOString().slice(0, 10)) });
  };
  texto.addEventListener('input', atualizarPrevia);
  atualizarPrevia();

  // insere o marcador onde está o cursor
  const inserir = (marcador: string): void => {
    const ini = texto.selectionStart ?? texto.value.length;
    const fim = texto.selectionEnd ?? texto.value.length;
    texto.value = texto.value.slice(0, ini) + marcador + texto.value.slice(fim);
    texto.focus();
    texto.selectionStart = texto.selectionEnd = ini + marcador.length;
    atualizarPrevia();
  };

  async function salvar(): Promise<void> {
    campo.definirErro();
    if (!texto.value.trim()) return campo.definirErro('O texto não pode ficar vazio.');
    await salvarConfig({ template_lembrete: texto.value.trim() });
  }

  raiz.replaceChildren(
    criarCartao({
      titulo: 'Lembrete de vacina (WhatsApp)',
      subtitulo: 'Esse texto abre pronto no WhatsApp quando a recepção avisa o tutor.',
      filhos: [
        campo.elemento,
        el('div', 'barra', [el('span', 'filtro__rotulo', ['Inserir:']), ...MARCADORES_LEMBRETE.map((m) => criarBotao({ texto: m, variante: 'fantasma', onClick: () => inserir(m) }))]),
        el('div', 'lembrete', [el('strong', '', ['Como vai ficar:']), previa]),
        el('div', 'barra', [
          criarBotao({ texto: 'Salvar texto', icone: 'sucesso', onClick: () => void salvar() }),
          criarBotao({
            texto: 'Voltar ao texto padrão',
            variante: 'secundario',
            onClick: () => {
              texto.value = TEMPLATE_LEMBRETE_PADRAO;
              atualizarPrevia();
            },
          }),
        ]),
      ],
    }),
  );
  return raiz;
}

// tela de configurações (só o administrador)
export function paginaConfiguracoes(): HTMLElement {
  const abas: Aba[] = [
    { id: 'backup', titulo: 'Backup', renderizar: abaBackup },
    { id: 'clinica', titulo: 'Dados da clínica', renderizar: abaClinica },
    { id: 'lembrete', titulo: 'Lembrete de vacina', renderizar: abaLembrete },
  ];
  return el('section', 'pagina', [criarCabecalhoPagina({ titulo: 'Configurações e backup', subtitulo: 'Dados da clínica, texto do lembrete e cópia de segurança.' }), criarAbas(abas)]);
}
