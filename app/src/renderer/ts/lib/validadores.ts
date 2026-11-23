import { soDigitos } from './mascaras.js';

// confere os dois dígitos verificadores do cpf
export function validarCpf(texto: string): boolean {
  const cpf = soDigitos(texto);
  // 11 números e não pode ser tudo igual (111.111.111-11)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  // um dígito: soma ponderada, resto da divisão por 11
  const digito = (base: number): number => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += parseInt(cpf[i] ?? '0', 10) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === parseInt(cpf[9] ?? '', 10) && digito(10) === parseInt(cpf[10] ?? '', 10);
}

// 10 dígitos (fixo) ou 11 (celular)
export function validarTelefone(texto: string): boolean {
  const d = soDigitos(texto);
  return d.length === 10 || d.length === 11;
}

// checagem simples: algo@algo.algo
export function validarEmail(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

// cep tem 8 números
export function validarCep(texto: string): boolean {
  return soDigitos(texto).length === 8;
}
