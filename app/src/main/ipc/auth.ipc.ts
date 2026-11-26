import { SemEntradaSchema, VazioSchema } from '@clinica-vet/shared';
import { ErroNegocio } from '../erros/erro-negocio';
import { registrarHandlerPublico } from './registry';
import type { AuthService } from '../modules/auth/auth.service';

// liga os canais auth:login, auth:sessao e auth:sair ao AuthService.
// são "públicos" porque ainda não tem ninguém logado quando o login acontece
export class AuthIpc {
  constructor(private readonly auth: AuthService) {}

  registrar(): void {
    registrarHandlerPublico('auth:login', async (_evento, entrada: unknown) => this.auth.login(entrada));
    registrarHandlerPublico('auth:sessao', async (_evento, entrada: unknown) => {
      this.validarSemEntrada(entrada);
      return this.auth.sessaoAtual();
    });
    registrarHandlerPublico('auth:sair', async (_evento, entrada: unknown) => {
      this.validarSemEntrada(entrada);
      this.auth.sair();
      return VazioSchema.parse({});
    });
  }

  private validarSemEntrada(entrada: unknown): void {
    if (!SemEntradaSchema.safeParse(entrada).success) {
      throw new ErroNegocio('DADOS_INVALIDOS', 'Este canal não recebe parâmetros.');
    }
  }
}
