import { describe, expect, it } from 'vitest';
import { montarMensagem, somarDias } from './vacinas.service';

describe('vacinas', () => {
  it('soma os dias do reforço passando por mês, ano e bissexto', () => {
    expect(somarDias('2026-11-28', 3)).toBe('2026-12-01');
    expect(somarDias('2026-12-31', 365)).toBe('2027-12-31');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('monta o texto do lembrete com a data em formato brasileiro', () => {
    const item = {
      id: '1', animal_nome: 'Rex', cliente_nome: 'Carlos', telefone: '19999998888', vacina_nome: 'V10',
      proxima_dose: '2026-12-01', lembrete_enviado: false
    };
    expect(montarMensagem('{tutor}, {vacina} de {animal} em {data}. {outro}', item)).toBe('Carlos, V10 de Rex em 01/12/2026. {outro}');
  });
});
