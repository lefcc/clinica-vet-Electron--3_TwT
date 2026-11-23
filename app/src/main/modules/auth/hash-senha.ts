import bcrypt from 'bcryptjs';

// senha nunca fica em texto puro: só o hash (bcrypt) vai pro banco
export class HashSenha {
  constructor(private readonly custo: number) {}

  gerar(senha: string): Promise<string> {
    return bcrypt.hash(senha, this.custo);
  }

  comparar(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }
}
