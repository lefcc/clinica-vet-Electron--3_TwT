const FUSO = 'America/Sao_Paulo';

/** 1250 (centavos) vira "R$ 12,50" */
export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 1250 (centavos) na moeda pedida: "R$ 12,50" ou "US$ 12,50" */
export function formatarMoeda(centavos: number, moeda: 'BRL' | 'USD'): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: moeda });
}

/** tamanho de arquivo legível: 2457600 vira "2,3 MB" */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/** data completa do banco (utc) vira "20/11/2026" no horário de são paulo */
export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO });
}

/** dia puro "2026-11-20" -> "20/11/2026" (sem converter fuso) */
export function formatarDia(dia: string): string {
  const [a, m, d] = dia.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// tudo é mostrado no horário de são paulo, não importa o fuso do pc
const DESLOCAMENTO_SP = '-03:00';

/** hoje em são paulo ("2026-11-20"); "en-CA" é truque pro formato */
export function hojeEmSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO });
}

/** dia de um instante utc, em são paulo */
export function diaEmSaoPaulo(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSO });
}

/** hora ("09:30") de um instante utc, em são paulo */
export function horaEmSaoPaulo(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

/** hora cheia de agora em são paulo (0 a 23) */
export function horaAtualSaoPaulo(): number {
  return Number(new Date().toLocaleString('pt-BR', { timeZone: FUSO, hour: '2-digit', hour12: false }));
}

/** dia e hora digitados (são paulo) viram utc */
export function saoPauloParaUtc(dia: string, hora = '00:00'): string {
  return new Date(`${dia}T${hora}:00${DESLOCAMENTO_SP}`).toISOString();
}

/** dias até uma data: 0 hoje, 1 amanhã, negativo já passou */
export function diasAte(dia: string): number {
  // as duas viram "meia-noite utc" só pra subtrair em dias
  const alvo = Date.parse(`${dia.slice(0, 10)}T00:00:00Z`);
  const hoje = Date.parse(`${hojeEmSaoPaulo()}T00:00:00Z`);
  return Math.round((alvo - hoje) / 86400000);
}

/** data e hora utc em são paulo ("20/11/2026 14:30") */
export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
