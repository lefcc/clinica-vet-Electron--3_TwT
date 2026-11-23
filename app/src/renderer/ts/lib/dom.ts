export type Filho = Node | string | null | undefined | false;
export type Atributos = Record<string, string | number | boolean>;

// uso: el('div', 'classe', [filhos], { atributo: 'valor' })
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe = '',
  filhos: Filho[] = [],
  atributos: Atributos = {},
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  for (const [nome, valor] of Object.entries(atributos)) {
    // false pula o atributo; true vira só o nome (ex.: required)
    if (valor === false) continue;
    elemento.setAttribute(nome, valor === true ? '' : String(valor));
  }
  for (const filho of filhos) {
    if (filho === null || filho === undefined || filho === false) continue;
    elemento.append(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }
  return elemento;
}

// ids únicos (campo-1, campo-2...) pra ligar rótulo e campo
let contadorId = 0;
export function novoId(prefixo = 'id'): string {
  contadorId += 1;
  return `${prefixo}-${contadorId}`;
}
