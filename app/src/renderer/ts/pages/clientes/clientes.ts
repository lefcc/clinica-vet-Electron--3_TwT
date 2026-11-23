import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { formatarTelefone, mascaraCpf } from '../../lib/mascaras.js';
import type { Animal, Cliente } from '../../lib/tipos.js';
import { perfilAtual } from '../../lib/sessao.js';
import {
  abrirModal,
  confirmar,
  criarBadge,
  criarBotao,
  criarBotaoIcone,
  criarCabecalhoPagina,
  criarCartao,
  criarEstadoVazio,
  criarFormulario,
  criarSpinner,
  criarTabela,
  mostrarToast,
  type DefCampo,
} from '../../components/ui/index.js';
import { abrirFormularioCrud, criarPaginaCrud, type ConfigCrud } from '../comum/crud.js';
import { numeroOpcional, opcional, soNumeros, UFS, ESPECIES } from '../comum/util.js';

// campos do form (o cep preenche o endereço sozinho)
const CAMPOS_CLIENTE: DefCampo[] = [
  { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, largura: 'inteira' },
  { nome: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true, placeholder: '000.000.000-00' },
  { nome: 'telefone', rotulo: 'Telefone (WhatsApp)', tipo: 'tel', obrigatorio: true, placeholder: '(19) 99999-9999' },
  { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 'inteira' },
  { nome: 'cep', rotulo: 'CEP', tipo: 'cep', largura: 'terco', placeholder: '00000-000' },
  { nome: 'logradouro', rotulo: 'Rua / Avenida', largura: 'doisTercos' },
  { nome: 'numero', rotulo: 'Número', largura: 'terco' },
  { nome: 'complemento', rotulo: 'Complemento', largura: 'terco' },
  { nome: 'bairro', rotulo: 'Bairro', largura: 'terco' },
  { nome: 'cidade', rotulo: 'Cidade', largura: 'doisTercos' },
  { nome: 'uf', rotulo: 'UF', tipo: 'select', opcoes: UFS, largura: 'terco' },
];

// cadastro de clientes (veterinário só consulta)
export const CONFIG_CLIENTES: ConfigCrud<Cliente> = {
  canal: 'clientes',
  titulo: 'Clientes',
  subtitulo: 'Tutores dos animais atendidos na clínica.',
  singular: 'cliente',
  textoNovo: 'Novo cliente',
  textoBusca: 'Buscar por nome, CPF ou telefone...',
  podeEscrever: (p) => p === 'MASTER' || p === 'ATENDENTE',
  nomeDoItem: (c) => c.nome,
  colunas: [
    { chave: 'nome', titulo: 'Nome', render: (c) => el('a', 'link-forte', [c.nome], { href: `#/clientes/${c.id}` }) },
    // cpf chega só com números; aqui ganha pontos e traço
    { chave: 'cpf', titulo: 'CPF', render: (c) => mascaraCpf(c.cpf) },
    { chave: 'telefone', titulo: 'Telefone', render: (c) => formatarTelefone(c.telefone) },
    { chave: 'cidade', titulo: 'Cidade', render: (c) => (c.cidade ? `${c.cidade}/${c.uf ?? ''}` : '—') },
  ],
  campos: CAMPOS_CLIENTE,
  // cpf duplicado aparece embaixo do campo cpf
  errosCampo: { CPF_DUPLICADO: 'cpf' },
  paraFormulario: (c) => ({
    nome: c.nome,
    cpf: c.cpf,
    telefone: c.telefone,
    email: c.email ?? '',
    cep: c.cep ?? '',
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
  }),
  // cpf, telefone e cep vão só com números; campo vazio vira nada
  paraEnvio: (v) => ({
    nome: v['nome'],
    cpf: soNumeros(v['cpf']),
    telefone: soNumeros(v['telefone']),
    email: opcional(v['email']),
    cep: soNumeros(v['cep']),
    logradouro: opcional(v['logradouro']),
    numero: opcional(v['numero']),
    complemento: opcional(v['complemento']),
    bairro: opcional(v['bairro']),
    cidade: opcional(v['cidade']),
    uf: opcional(v['uf']),
  }),
};

export function paginaClientes(): HTMLElement {
  return criarPaginaCrud(CONFIG_CLIENTES);
}

// ---------- detalhe do cliente (com os animais dele) ----------

// form do animal (sem o campo tutor)
const CAMPOS_ANIMAL_NO_CLIENTE: DefCampo[] = [
  { nome: 'nome', rotulo: 'Nome do animal', obrigatorio: true },
  { nome: 'especie', rotulo: 'Espécie', tipo: 'select', opcoes: ESPECIES, obrigatorio: true },
  { nome: 'raca', rotulo: 'Raça' },
  {
    nome: 'sexo',
    rotulo: 'Sexo',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      { valor: 'M', texto: 'Macho' },
      { valor: 'F', texto: 'Fêmea' },
    ],
  },
  { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'data' },
  { nome: 'peso_kg', rotulo: 'Peso (kg)', tipo: 'numero', passo: '0.01', min: 0.01 },
  { nome: 'observacoes', rotulo: 'Observações', tipo: 'area', largura: 'inteira' },
];

// janela de novo animal ou edição
function abrirFormularioAnimal(clienteId: string, animal: Animal | undefined, aoSalvar: () => void): void {
  const form = criarFormulario(CAMPOS_ANIMAL_NO_CLIENTE, !animal);
  if (animal) form.definirValores({ nome: animal.nome, especie: animal.especie, raca: animal.raca ?? '', sexo: animal.sexo, data_nascimento: animal.data_nascimento ?? '', peso_kg: animal.peso_kg !== undefined ? String(animal.peso_kg) : '', observacoes: animal.observacoes ?? '' });

  let salvando = false;
  const botao = criarBotao({ texto: 'Salvar', icone: 'sucesso', onClick: () => void salvar() });
  const modal = abrirModal({
    titulo: animal ? 'Editar animal' : 'Novo animal',
    conteudo: form.elemento,
    acoes: [criarBotao({ texto: 'Cancelar', variante: 'secundario', onClick: () => modal.fechar() }), botao],
  });
  async function salvar(): Promise<void> {
    if (salvando || !form.validar()) return;
    salvando = true;
    botao.disabled = true;
    const v = form.obterValores();
    const dados = { cliente_id: clienteId, nome: v['nome'], especie: v['especie'], raca: opcional(v['raca']), sexo: v['sexo'], data_nascimento: opcional(v['data_nascimento']), peso_kg: numeroOpcional(v['peso_kg']), observacoes: opcional(v['observacoes']) };
    const r = await api.invoke(animal ? 'animais:atualizar' : 'animais:criar', animal ? { id: animal.id, ...dados } : dados);
    salvando = false;
    botao.disabled = false;
    if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
    mostrarToast('sucesso', 'Animal salvo com sucesso.');
    modal.fechar();
    aoSalvar();
  }
  form.aoEnviar(() => void salvar());
}

// linha "rótulo: valor" (traço se vazio)
function linhaInfo(rotulo: string, valor: string | undefined): HTMLElement {
  return el('div', 'info__linha', [el('dt', '', [rotulo]), el('dd', '', [valor || '—'])]);
}

// detalhe: dados do cliente e os animais dele
export async function paginaClienteDetalhe(idRota?: string): Promise<HTMLElement> {
  const raiz = el('section', 'pagina');
  if (!idRota) {
    raiz.append(criarEstadoVazio({ icone: 'buscar', titulo: 'Cliente não informado' }));
    return raiz;
  }
  const id: string = idRota;
  raiz.append(criarSpinner());

  const podeEscrever = perfilAtual() === 'MASTER' || perfilAtual() === 'ATENDENTE';

  // busca cliente e animais juntos e desenha a tela
  async function montar(): Promise<void> {
    const [rc, ra] = await Promise.all([api.invoke<Cliente>('clientes:obter', { id }), api.invoke<Animal[]>('animais:listar_por_cliente', { cliente_id: id })]);
    raiz.replaceChildren();
    if (!rc.ok) {
      raiz.append(criarEstadoVazio({ icone: 'aviso', titulo: 'Cliente não encontrado', descricao: rc.erro.mensagem }));
      return;
    }
    const c = rc.dados;
    const animais = ra.ok ? ra.dados : [];

    const endereco = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');
    raiz.append(
      el('a', 'voltar', [criarBotao({ texto: 'Voltar para clientes', icone: 'voltar', variante: 'fantasma', onClick: () => (window.location.hash = '#/clientes') })]),
      criarCabecalhoPagina({
        titulo: c.nome,
        subtitulo: 'Dados do tutor e animais cadastrados.',
        acoes: podeEscrever ? [criarBotao({ texto: 'Editar cliente', icone: 'editar', variante: 'secundario', onClick: () => void abrirFormularioCrud(CONFIG_CLIENTES, c, () => void montar()) })] : [],
      }),
      criarCartao({
        titulo: 'Dados do cliente',
        filhos: [
          el('dl', 'info', [
            linhaInfo('CPF', mascaraCpf(c.cpf)),
            linhaInfo('Telefone', formatarTelefone(c.telefone)),
            linhaInfo('E-mail', c.email),
            linhaInfo('Endereço', endereco),
            linhaInfo('Cidade', c.cidade ? `${c.cidade}/${c.uf ?? ''}` : undefined),
            linhaInfo('CEP', c.cep),
          ]),
        ],
      }),
    );

    const tabela = criarTabela<Animal>({
      textoVazio: 'Este cliente ainda não tem animais.',
      onPagina: () => undefined,
      colunas: [
        { chave: 'nome', titulo: 'Nome' },
        { chave: 'especie', titulo: 'Espécie / raça', render: (a) => [a.especie, a.raca].filter(Boolean).join(' · ') },
        { chave: 'sexo', titulo: 'Sexo', render: (a) => criarBadge(a.sexo === 'M' ? 'Macho' : 'Fêmea', 'neutro') },
        { chave: 'idade_texto', titulo: 'Idade', render: (a) => a.idade_texto ?? '—' },
        { chave: 'peso_kg', titulo: 'Peso', render: (a) => (a.peso_kg ? `${String(a.peso_kg).replace('.', ',')} kg` : '—') },
        ...(podeEscrever
          ? [
              {
                chave: 'acoes',
                titulo: 'Ações',
                render: (a: Animal) =>
                  el('div', 'acoes', [
                    criarBotaoIcone('editar', 'Editar animal', () => abrirFormularioAnimal(id, a, () => void montar())),
                    criarBotaoIcone(
                      'inativar',
                      'Inativar animal',
                      () =>
                        void confirmar({ titulo: 'Inativar animal', mensagem: `Deseja inativar "${a.nome}"?`, textoConfirmar: 'Inativar', perigo: true }).then(async (sim) => {
                          if (!sim) return;
                          const r = await api.invoke('animais:inativar', { id: a.id });
                          if (!r.ok) return mostrarToast('erro', r.erro.mensagem);
                          mostrarToast('sucesso', 'Animal inativado.');
                          void montar();
                        }),
                      true,
                    ),
                  ]),
              },
            ]
          : []),
      ],
    });
    tabela.atualizar({ linhas: animais, total: animais.length, pagina: 1, tamanho: Math.max(animais.length, 1) });
    raiz.append(
      criarCartao({
        titulo: `Animais (${animais.length})`,
        filhos: [tabela.elemento],
        acao: podeEscrever ? { texto: 'Novo animal', icone: 'mais', onClick: () => abrirFormularioAnimal(id, undefined, () => void montar()) } : undefined,
      }),
    );
  }

  void montar();
  return raiz;
}
