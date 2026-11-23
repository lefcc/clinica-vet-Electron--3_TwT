export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

// 12345678901 vira 123.456.789-01
export function mascaraCpf(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

// (19) 3333-4444 ou (19) 99999-4444
export function mascaraTelefone(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** telefone só com números -> "(19) 99999-9999" */
export const formatarTelefone = mascaraTelefone;

// cep no formato 00000-000
export function mascaraCep(texto: string): string {
  const d = soDigitos(texto).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** digita só números, tratados como centavos: "1250" -> "12,50" */
export function mascaraDinheiro(texto: string): string {
  const d = soDigitos(texto).replace(/^0+(?=\d)/, '');
  if (!d) return '';
  const centavos = d.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${centavos.slice(-2)}`;
}

/** "1.234,56" -> 123456 (centavos) */
export function dinheiroParaCentavos(texto: string): number {
  const d = soDigitos(texto);
  return d ? parseInt(d, 10) : 0;
}

// máscaras disponíveis, pelo nome
export type NomeMascara = 'cpf' | 'telefone' | 'cep' | 'dinheiro';

export const MASCARAS: Record<NomeMascara, (texto: string) => string> = {
  cpf: mascaraCpf,
  telefone: mascaraTelefone,
  cep: mascaraCep,
  dinheiro: mascaraDinheiro,
};
