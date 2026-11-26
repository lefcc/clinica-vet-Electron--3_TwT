import { el } from '../../lib/dom.js';
import { api } from '../../lib/api.js';
import { soDigitos, type NomeMascara } from '../../lib/mascaras.js';
import { validarCep, validarCpf, validarEmail, validarTelefone } from '../../lib/validadores.js';
import type { Endereco } from '../../lib/tipos.js';
import { criarCampo, criarInput, criarSelect, criarTextarea, type Campo, type OpcaoSelect } from './campos.js';

// tipos de campo (cada um já traz máscara e validação)
export type TipoCampo = 'texto' | 'email' | 'tel' | 'cpf' | 'cep' | 'data' | 'hora' | 'numero' | 'dinheiro' | 'select' | 'area' | 'senha';

// descrição de um campo do form
export interface DefCampo {
  /** nome do campo (chave do valor em obterValores) */
  nome: string;
  rotulo: string;
  tipo?: TipoCampo;
  obrigatorio?: boolean;
  opcoes?: OpcaoSelect[];
  dica?: string;
  placeholder?: string;
  /** largura na linha: inteira, meia (padrão), terço ou dois terços */
  largura?: 'inteira' | 'meia' | 'terco' | 'doisTercos';
  min?: number;
  max?: number;
  passo?: string;
  valorInicial?: string;
  /** só aparece ao criar (ex.: senha do colaborador) */
  somenteCriacao?: boolean;
  /** regra extra do campo */
  validar?: (valor: string, todos: Record<string, string>) => string | undefined;
}

export interface Formulario {
  elemento: HTMLFormElement;
  obterValores: () => Record<string, string>;
  definirValores: (valores: Record<string, string | undefined>) => void;
  /** confere tudo e mostra os erros embaixo dos campos */
  validar: () => boolean;
  definirErro: (nome: string, mensagem?: string) => void;
  definirOpcoes: (nome: string, opcoes: OpcaoSelect[], manterValor?: boolean) => void;
  controle: (nome: string) => HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  aoEnviar: (funcao: () => void) => void;
}

// tipos que usam máscara
const MASCARA_POR_TIPO:Partial<Record<TipoCampo, NomeMascara>> = { cpf: 'cpf', tel: 'telefone', cep: 'cep', dinheiro: 'dinheiro' };

// avisos quando a busca de cep falha (nunca trava)
const MENSAGENS_CEP: Record<string, string> = {
  CEP_INVALIDO: 'CEP inválido.',
  CEP_NAO_ENCONTRADO: 'CEP não encontrado. Preencha o endereço manualmente.',
  SEM_CONEXAO: 'Sem internet — preencha o endereço manualmente.',
};

// cria input, select ou textarea conforme o tipo
function criarControle(def: DefCampo):HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const tipo = def.tipo ?? 'texto';
  if (tipo === 'select') return criarSelect(def.opcoes ?? [], { placeholder: 'Selecione...' });
  if (tipo === 'area') return criarTextarea({ placeholder: def.placeholder, linhas: 3 });
  const mapaTipoHtml: Record<string, 'text' | 'email' | 'password' | 'date' | 'number' | 'tel'> = {
    email: 'email',
    senha: 'password',
    data: 'date',
    numero: 'number',
  };
  const input = criarInput({
    tipo: mapaTipoHtml[tipo] ?? 'text',
    mascara: MASCARA_POR_TIPO[tipo],
    placeholder: def.placeholder,
    nome: def.nome,
  });
  if (tipo === 'hora') input.type = 'time';
  if (tipo === 'numero') {
    if (def.min !== undefined) input.min = String(def.min);
    if (def.max !== undefined) input.max = String(def.max);
    input.step = def.passo ?? '1';
  }
  return input;
}

/** devolve o erro de um campo, ou nada se estiver ok */
function validarCampo(def: DefCampo, valor: string, todos: Record<string, string>): string | undefined {
  const texto = def.tipo === 'senha' ? valor : valor.trim();
  // vazio: erro se obrigatório; senão roda só a regra do campo
  if (!texto) return def.obrigatorio ? 'Campo obrigatório.' : def.validar?.('', todos);
  switch (def.tipo) {
    case 'email':
      if (!validarEmail(texto)) return 'E-mail inválido.';
      break;
    case 'cpf':
      if (!validarCpf(texto)) return 'CPF inválido.';
      break;
    case 'tel':
      if (!validarTelefone(texto)) return 'Telefone deve ter 10 ou 11 dígitos.';
      break;
    case 'cep':
      if (!validarCep(texto)) return 'CEP deve ter 8 dígitos.';
      break;
    case 'numero': {
      const n = Number(texto);
      if (Number.isNaN(n)) return 'Informe um número.';
      if (def.min !== undefined && n < def.min) return `O valor mínimo é ${def.min}.`;
      if (def.max !== undefined && n > def.max) return `O valor máximo é ${def.max}.`;
      break;
    }
    default:
      break;
  }
  return def.validar?.(texto, todos);
}

/** monta o form a partir da lista de campos (e busca o cep sozinho) */
export function criarFormulario(definicoes: DefCampo[], criando = true): Formulario {
  const campos = new Map<string, { def: DefCampo; campo: Campo; controle: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement }>();
  const grade = el('div', 'form__grade');
  // botão invisível: faz o Enter enviar o form
  const envioInvisivel = el('button', 'sr-only', ['Enviar'], { type: 'submit', tabindex: -1 });
  const form = el('form', 'form', [grade, envioInvisivel], { novalidate: true });

  // um campo (rótulo + controle + erro) por item
  for (const def of definicoes) {
    if (def.somenteCriacao && !criando) continue;
    const controle = criarControle(def);
    if (def.valorInicial) controle.value = def.valorInicial;
    const campo = criarCampo({ rotulo: def.rotulo, controle, dica: def.dica, obrigatorio: def.obrigatorio });
    campo.elemento.classList.add(`campo--${def.largura ?? 'meia'}`);
    campos.set(def.nome, { def, campo, controle });
    grade.append(campo.elemento);
  }

  const obterValores = (): Record<string, string> => {
    const valores: Record<string, string> = {};
    for (const [nome, { def, controle }] of campos) {
      valores[nome] = def.tipo === 'senha' ? controle.value : controle.value.trim();
    }
    return valores;
  };

  const formulario: Formulario = {
    elemento: form,
    obterValores,
    definirValores(valores) {
      for (const [nome, valor] of Object.entries(valores)) {
        const c = campos.get(nome);
        if (!c) continue;
        c.controle.value = valor ?? '';
        // dispara "input" pra máscara formatar
        c.controle.dispatchEvent(new Event('input'));
      }
    },
    validar() {
      const todos = obterValores();
      let ok = true;
      for (const [nome, { def, campo }] of campos) {
        const erro = validarCampo(def, todos[nome] ?? '', todos);
        campo.definirErro(erro);
        if (erro) ok = false;
      }
      // leva o cursor pro primeiro campo com erro
      if (!ok) {
        for (const { campo, controle } of campos.values()) {
          if (controle.getAttribute('aria-invalid') === 'true') {
            controle.focus();
            void campo;
            break;
          }
        }
      }
      return ok;
    },
    definirErro(nome, mensagem) {
      campos.get(nome)?.campo.definirErro(mensagem);
    },
    definirOpcoes(nome, opcoes, manterValor = false) {
      const c = campos.get(nome);
      if (!c || !(c.controle instanceof HTMLSelectElement)) return;
      const anterior = c.controle.value;
      c.controle.replaceChildren(el('option', '', ['Selecione...'], { value: '' }), ...opcoes.map((o) => el('option', '', [o.texto], { value: o.valor })));
      if (manterValor) c.controle.value = anterior;
    },
    controle(nome) {
      const c = campos.get(nome);
      if (!c) throw new Error(`Campo "${nome}" não existe no formulário.`);
      return c.controle;
    },
    aoEnviar(funcao) {
      form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        funcao();
      });
    },
  };

  // busca o endereço quando o cep tem 8 números
  const cep = campos.get('cep');
  if (cep && cep.def.tipo === 'cep') {
    cep.controle.addEventListener('input', () => {
      if (soDigitos(cep.controle.value).length !== 8) {
        cep.campo.definirDica();
        return;
      }
      cep.campo.definirDica('Buscando endereço...');
      void api.invoke<Endereco>('cep:buscar', { cep: soDigitos(cep.controle.value) }).then((resposta) => {
        if (!resposta.ok) {
          cep.campo.definirDica(MENSAGENS_CEP[resposta.erro.codigo] ?? 'Não foi possível buscar o CEP. Preencha manualmente.');
          return;
        }
        cep.campo.definirDica('Endereço preenchido. Confira os dados.');
        formulario.definirValores({
          logradouro: resposta.dados.logradouro,
          bairro: resposta.dados.bairro,
          cidade: resposta.dados.cidade,
          uf: resposta.dados.uf,
        });
      });
    });
  }

  return formulario;
}
