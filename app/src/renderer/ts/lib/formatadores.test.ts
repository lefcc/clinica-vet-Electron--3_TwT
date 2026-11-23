import { describe, expect, it } from 'vitest';
import { diaEmSaoPaulo, formatarCentavos, formatarDia, formatarMoeda, formatarTamanho, horaEmSaoPaulo, saoPauloParaUtc } from './formatadores';
import { limitesDoDia } from '../pages/comum/util';

// esses testes garantem que o horário de são paulo vale sempre, não importa o fuso do computador

describe('horário de são paulo', () => {
  it('converte o que foi digitado (são paulo) para utc', () => {
    expect(saoPauloParaUtc('2026-11-20', '09:30')).toBe('2026-11-20T12:30:00.000Z');
    expect(saoPauloParaUtc('2026-11-20')).toBe('2026-11-20T03:00:00.000Z');
  });

  it('converte o utc do banco de volta para hora e dia de são paulo', () => {
    expect(horaEmSaoPaulo('2026-11-20T12:30:00.000Z')).toBe('09:30');
    // 02:00 utc do dia 21 ainda é 23:00 do dia 20 em são paulo
    expect(diaEmSaoPaulo('2026-11-21T02:00:00.000Z')).toBe('2026-11-20');
  });

  it('limites de um dia: da meia-noite de são paulo até a meia-noite seguinte', () => {
    expect(limitesDoDia('2026-11-20')).toEqual({ inicio: '2026-11-20T03:00:00.000Z', fim: '2026-11-21T03:00:00.000Z' });
    // virada de mês
    expect(limitesDoDia('2026-11-30').fim).toBe('2026-12-01T03:00:00.000Z');
  });
});

describe('formatação', () => {
  it('dinheiro vem em centavos e sai em reais', () => {
    expect(formatarCentavos(1250).replace(/\s/g, ' ')).toBe('R$ 12,50');
  });

  it('mostra dinheiro em reais ou dólar', () => {
    expect(formatarMoeda(1250, 'BRL').replace(/\s/g, ' ')).toBe('R$ 12,50');
    expect(formatarMoeda(1250, 'USD').replace(/\s/g, ' ')).toBe('US$ 12,50');
  });

  it('mostra o tamanho de arquivo de forma legível', () => {
    expect(formatarTamanho(500)).toBe('500 B');
    expect(formatarTamanho(2048)).toBe('2 KB');
    expect(formatarTamanho(2457600)).toBe('2,3 MB');
  });

  it('dia puro não "volta" um dia por causa do fuso', () => {
    expect(formatarDia('2026-11-20')).toBe('20/11/2026');
  });
});
