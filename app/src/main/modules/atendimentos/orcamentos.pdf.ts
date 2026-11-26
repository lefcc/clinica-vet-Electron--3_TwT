// pdf do orçamento: monta o html, imprime com printToPDF e salva onde a pessoa escolher
import { writeFile } from 'node:fs/promises';
import type { Configuracoes, Orcamento } from '@clinica-vet/shared';
import { ErroNegocio } from '../../erros/erro-negocio';

export interface SaidaPdf {
  imprimir(html: string): Promise<Buffer>;
  escolherArquivo(nomeSugerido: string): Promise<string | undefined>;
}

// nomes e descrições vêm do banco, então escapa antes de colocar no html
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function montarHtmlOrcamento(orcamento: Orcamento, clinica: Configuracoes): string {
  const endereco = [clinica.logradouro, clinica.numero, clinica.bairro, clinica.cidade, clinica.uf].filter(Boolean).join(', ');
  const contato = [clinica.telefone, clinica.email].filter(Boolean).join(' · ');
  const linhas = orcamento.itens.map((i) => `<tr><td>${escapar(i.descricao)}</td><td class="n">${i.quantidade}</td>
    <td class="n">${reais(i.valor_unitario_centavos)}</td><td class="n">${reais(i.quantidade * i.valor_unitario_centavos)}</td></tr>`).join('');
  const subtotal = orcamento.itens.reduce((t, i) => t + i.quantidade * i.valor_unitario_centavos, 0);
  const data = new Date(orcamento.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; color: #3B2F2A; margin: 32px; font-size: 13px; }
    h1 { color: #2E7D32; margin: 0; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ccc; padding: 6px; text-align: left; }
    .n { text-align: right; }
    .total { text-align: right; margin-top: 12px; }
    .aviso { margin-top: 32px; text-align: center; font-weight: bold; border: 1px solid #6D4C41; padding: 8px; }
  </style></head><body>
    <h1>${escapar(clinica.nome_clinica)}</h1>
    <div>${escapar(endereco)}</div>
    <div>${escapar(contato)}</div>
    <h2>Orçamento nº ${String(orcamento.numero).padStart(4, '0')}</h2>
    <div>Data: ${data}</div>
    <div>Cliente: ${escapar(orcamento.cliente_nome)}</div>
    ${orcamento.animal_nome ? `<div>Animal: ${escapar(orcamento.animal_nome)}</div>` : ''}
    <div>Forma de pagamento: ${escapar(orcamento.forma_pagamento)}</div>
    <table><thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Valor</th><th class="n">Subtotal</th></tr></thead>
    <tbody>${linhas}</tbody></table>
    <p class="total">Subtotal: ${reais(subtotal)}<br>Desconto: ${reais(orcamento.desconto_centavos)}<br>
    <strong>Total: ${reais(orcamento.total_centavos)}</strong></p>
    <p class="aviso">Documento sem valor fiscal</p>
  </body></html>`;
}

export class OrcamentoPdf {
  constructor(private readonly saida: SaidaPdf) {}

  // igual na aula de arquivos: showSaveDialog e depois writeFile
  async gerar(orcamento: Orcamento, clinica: Configuracoes): Promise<{ caminho: string }> {
    const caminho = await this.saida.escolherArquivo(`orcamento-${String(orcamento.numero).padStart(4, '0')}.pdf`);
    if (!caminho) throw new ErroNegocio('PDF_CANCELADO', 'Você cancelou a geração do PDF.');
    try {
      await writeFile(caminho, await this.saida.imprimir(montarHtmlOrcamento(orcamento, clinica)));
    } catch (erro) {
      console.error('Não consegui gerar o PDF:', erro instanceof Error ? erro.message : erro);
      throw new ErroNegocio('PDF_FALHOU', 'Não foi possível salvar o PDF. Confira se o arquivo não está aberto.');
    }
    return { caminho };
  }
}
