// texto do lembrete de vacina (whatsapp). o administrador pode editar em Configurações.

export const TEMPLATE_LEMBRETE_PADRAO = 'Olá, {tutor}! A vacina {vacina} de {animal} vence em {data}. Entre em contato com a clínica para agendar. Obrigado!';

/** os marcadores que o texto aceita (viram os dados do animal na hora de enviar) */
export const MARCADORES_LEMBRETE = ['{tutor}', '{animal}', '{vacina}', '{data}'] as const;

export interface DadosLembrete {
  tutor: string;
  animal: string;
  vacina: string;
  data: string;
}

/** troca os marcadores do texto pelos dados reais */
export function montarMensagem(template: string, dados: DadosLembrete): string {
  return template.replace(/\{(tutor|animal|vacina|data)\}/g, (_inteiro: string, chave: keyof DadosLembrete) => dados[chave]);
}
