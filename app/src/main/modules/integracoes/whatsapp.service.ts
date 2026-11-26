// abre o whatsapp com a mensagem pronta. o único link externo permitido é o wa.me
import { ErroNegocio } from '../../erros/erro-negocio';

const PREFIXO = 'https://wa.me/55';

export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  // ddd + número: 10 ou 11 dígitos, sem o 55
  if (!/^\d{10,11}$/.test(telefone)) throw new ErroNegocio('TELEFONE_INVALIDO', 'Telefone inválido para o WhatsApp.');
  const link = `${PREFIXO}${telefone}?text=${encodeURIComponent(mensagem)}`;
  if (!link.startsWith(PREFIXO)) throw new ErroNegocio('LINK_BLOQUEADO', 'Link não permitido.');
  return link;
}

export class WhatsAppService {
  constructor(
    private readonly abrirExterno: (url: string) => Promise<void>,
    private readonly estaOnline: () => boolean
  ) {}

  // sem internet não abre, e o lembrete continua pendente
  async abrir(telefone: string, mensagem: string): Promise<void> {
    const link = montarLinkWhatsApp(telefone, mensagem);
    if (!this.estaOnline()) throw new ErroNegocio('SEM_CONEXAO', 'Sem internet para abrir o WhatsApp.');
    await this.abrirExterno(link);
  }
}
