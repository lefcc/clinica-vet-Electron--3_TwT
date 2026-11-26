// cep e pdf testados sem internet e sem janela
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { montarHtmlOrcamento, OrcamentoPdf } from '../atendimentos/orcamentos.pdf';
import { CepService } from './cep.service';

const responder = (corpo: object, ok = true) => (async () => ({ ok, status: ok ? 200 : 500, json: async () => corpo })) as unknown as typeof fetch;

describe('CepService', () => {
  it('devolve o endereço', async () => {
    const service = new CepService(responder({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Limeira', uf: 'SP' }));
    expect(await service.consultar('13480000')).toEqual({ cep: '13480000', logradouro: 'Rua A', bairro: 'Centro', cidade: 'Limeira', uf: 'SP' });
  });

  it('separa os três erros', async () => {
    await expect(new CepService(responder({})).consultar('123')).rejects.toMatchObject({ codigo: 'CEP_INVALIDO' });
    await expect(new CepService(responder({ erro: 'true' })).consultar('00000000')).rejects.toMatchObject({ codigo: 'CEP_NAO_ENCONTRADO' });
    const semRede = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    await expect(new CepService(semRede).consultar('13480000')).rejects.toMatchObject({ codigo: 'SEM_CONEXAO' });
  });
});

const orcamento = {
  id: 'o1', numero: 7, cliente_nome: '<script>x</script>', criado_em: '2026-11-25T15:00:00.000Z', forma_pagamento: 'PIX',
  desconto_centavos: 0, total_centavos: 100,
  itens: [{ tipo: 'SERVICO' as const, item_id: 's1', descricao: 'Banho', quantidade: 1, valor_unitario_centavos: 100 }]
};
const clinica = { nome_clinica: 'Clínica', template_lembrete: 'x', backup_horario: '20:00', backup_manter: 7 };

describe('PDF do orçamento', () => {
  it('tem o aviso obrigatório e não deixa nome virar html', () => {
    const html = montarHtmlOrcamento(orcamento, clinica);
    expect(html).toContain('Documento sem valor fiscal');
    expect(html).not.toContain('<script>');
  });

  it('salva no caminho escolhido, ou avisa se a pessoa cancelar', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'pdf-'));
    const destino = join(pasta, 'o.pdf');
    const pdf = new OrcamentoPdf({ imprimir: async () => Buffer.from('%PDF'), escolherArquivo: async () => destino });
    expect(await pdf.gerar(orcamento, clinica)).toEqual({ caminho: destino });
    expect(readFileSync(destino, 'utf-8')).toBe('%PDF');
    rmSync(pasta, { recursive: true, force: true });

    const cancelado = new OrcamentoPdf({ imprimir: async () => Buffer.from(''), escolherArquivo: async () => undefined });
    await expect(cancelado.gerar(orcamento, clinica)).rejects.toMatchObject({ codigo: 'PDF_CANCELADO' });
  });
});
