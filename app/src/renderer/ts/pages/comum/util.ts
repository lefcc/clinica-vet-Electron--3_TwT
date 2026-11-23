import type { OpcaoSelect } from '../../components/ui/index.js';
import { hojeEmSaoPaulo, horaEmSaoPaulo, saoPauloParaUtc } from '../../lib/formatadores.js';

/** campo em branco vira undefined */
export const opcional = (v?: string): string | undefined => (v ? v : undefined);
/** deixa só os números (cpf, telefone e cep vão sem máscara) */
export const soNumeros = (v?: string): string | undefined => (v ? v.replace(/\D/g, '') : undefined);
/** converte o texto do campo em número (aceita vírgula, tipo "12,5") */
export const numeroOpcional = (v?: string): number | undefined => (v ? Number(v.replace(',', '.')) : undefined);

// opções fixas dos dropdowns
export const ESPECIES: OpcaoSelect[] = ['Cão', 'Gato', 'Ave', 'Roedor', 'Réptil', 'Outro'].map((e) => ({ valor: e, texto: e }));

export const UFS: OpcaoSelect[] = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((u) => ({
  valor: u,
  texto: u,
}));

export const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];

/** a data de hoje no formato "2026-11-20" */
export const hojeISO = hojeEmSaoPaulo;

/** começo e fim de um dia (meia-noite de são paulo), em utc */
export function limitesDoDia(dia: string): { inicio: string; fim: string } {
  // dia seguinte, calculado em utc
  const seguinte = new Date(Date.parse(`${dia}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return { inicio: saoPauloParaUtc(dia), fim: saoPauloParaUtc(seguinte) };
}

/** hora "09:30" em são paulo */
export const horaLocal = horaEmSaoPaulo;

/** baixa um texto como arquivo (ex.: csv) */
export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob(['\ufeff', conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
