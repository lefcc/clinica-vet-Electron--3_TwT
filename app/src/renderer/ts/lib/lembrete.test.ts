import { describe, expect, it } from 'vitest';
import { MARCADORES_LEMBRETE, TEMPLATE_LEMBRETE_PADRAO, montarMensagem } from './lembrete';

const dados = { tutor: 'Mariana', animal: 'Thor', vacina: 'V10', data: '21/11/2026' };

describe('texto do lembrete de vacina', () => {
  it('troca os marcadores pelos dados', () => {
    expect(montarMensagem('Oi {tutor}, a {vacina} do {animal} vence em {data}.', dados)).toBe('Oi Mariana, a V10 do Thor vence em 21/11/2026.');
  });

  it('troca o mesmo marcador mais de uma vez e deixa o resto do texto', () => {
    expect(montarMensagem('{animal} e {animal}: sem marcador {outro}', dados)).toBe('Thor e Thor: sem marcador {outro}');
  });

  it('o texto padrão usa todos os marcadores', () => {
    for (const m of MARCADORES_LEMBRETE) expect(TEMPLATE_LEMBRETE_PADRAO).toContain(m);
    expect(montarMensagem(TEMPLATE_LEMBRETE_PADRAO, dados)).not.toMatch(/\{(tutor|animal|vacina|data)\}/);
  });
});
