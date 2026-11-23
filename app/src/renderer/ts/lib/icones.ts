const ICONES = {
  inicio: ['M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
  clientes: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  animais: [
    'M8.5 10a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
    'M15.5 10a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z',
    'M5 14a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 5 14z',
    'M19 14a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 19 14z',
    'M12 12c-3 0-5.5 3-5.5 5.2 0 1.6 1.3 2.3 2.8 2.3 1 0 1.7-.4 2.7-.4s1.7.4 2.7.4c1.5 0 2.8-.7 2.8-2.3C17.5 15 15 12 12 12z',
  ],
  agenda: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  consultas: ['M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z', 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 12h6', 'M9 16h6'],
  medicamentos: ['M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z', 'M8.5 8.5l7 7'],
  estoque: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v9'],
  fornecedores: ['M1 4h13v12H1z', 'M14 8h4l4 4v4h-8z', 'M5.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  vacinas: ['M18 2l4 4', 'M17 7l3-3', 'M19 9l-8.7 8.7a1 1 0 0 1-1.4 0L6.3 15.1a1 1 0 0 1 0-1.4L15 5', 'M9 11l4 4', 'M5 19l-3 3', 'M14 4l6 6'],
  orcamentos: ['M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
  relatorios: ['M3 3v18h18', 'M7 16v-5', 'M12 16V7', 'M17 16v-3'],
  colaboradores: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M16 11l2 2 4-4'],
  conflitos: ['M21 12a9 9 0 0 1-15.5 6.2', 'M3 12a9 9 0 0 1 15.5-6.2', 'M18 2v4h-4', 'M6 22v-4h4'],
  sair: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  mais: ['M12 5v14', 'M5 12h14'],
  editar: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  inativar: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
  buscar: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  fechar: ['M18 6L6 18', 'M6 6l12 12'],
  anterior: ['M15 18l-6-6 6-6'],
  proxima: ['M9 18l6-6-6-6'],
  sucesso: ['M20 6L9 17l-5-5'],
  erro: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M15 9l-6 6', 'M9 9l6 6'],
  aviso: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  pdf: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'],
  whatsapp: ['M21 12a8 8 0 0 1-11.8 7L3 21l2-5.2A8 8 0 1 1 21 12z'],
  sino: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  usuario: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  voltar: ['M19 12H5', 'M12 19l-7-7 7-7'],
  trava: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  baixar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  enviar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  relogio: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  dolar: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  olho: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  historico: ['M3 3v5h5', 'M3.05 13A9 9 0 1 0 6 5.3L3 8', 'M12 7v5l4 2'],
  auditoria: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  configuracoes: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  ],
} as const;

export type NomeIcone = keyof typeof ICONES;

const NS = 'http://www.w3.org/2000/svg';

// devolve o ícone pronto (tamanho em px, padrão 20)
export function criarIcone(nome: NomeIcone, tamanho = 20): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(tamanho));
  svg.setAttribute('height', String(tamanho));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icone');
  for (const d of ICONES[nome]) {
    const caminho = document.createElementNS(NS, 'path');
    caminho.setAttribute('d', d);
    svg.append(caminho);
  }
  return svg;
}
