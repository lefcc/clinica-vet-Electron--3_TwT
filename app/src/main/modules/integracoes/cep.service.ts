import type { Endereco } from '@clinica-vet/shared';
import { ErroNegocio } from '../../erros/erro-negocio';

interface RespostaViaCep {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export class CepService {
  constructor(private readonly buscar: typeof fetch = fetch) {}

  // esta função busca o endereço pelo cep
  async consultar(cep: string): Promise<Endereco> {
    if (!/^\d{8}$/.test(cep)) throw new ErroNegocio('CEP_INVALIDO', 'O CEP precisa ter 8 números.');

    let dados: RespostaViaCep;
    try {
      const resposta = await this.buscar(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(8000) });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      dados = (await resposta.json()) as RespostaViaCep;
    } catch (erro) {
      console.error('Não consegui buscar o CEP:', erro instanceof Error ? erro.message : erro);
      throw new ErroNegocio('SEM_CONEXAO', 'Sem conexão para buscar o CEP. Preencha o endereço à mão.');
    }

    if (dados.erro || !dados.uf || !dados.localidade) throw new ErroNegocio('CEP_NAO_ENCONTRADO', 'CEP não encontrado.');
    return { cep, logradouro: dados.logradouro ?? '', bairro: dados.bairro ?? '', cidade: dados.localidade, uf: dados.uf };
  }
}
