// erro "esperado" do negócio (senha errada, cpf repetido...).
// o registry transforma ele em { ok: false, erro: { codigo, mensagem } } pro front
export class ErroNegocio extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}
