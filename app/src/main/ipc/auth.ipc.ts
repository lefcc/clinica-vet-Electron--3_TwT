import { registrarHandlerPublico } from './registry';
import type { AuthService } from '../modules/auth/auth.service';

// liga os canais auth:login, auth:sessao e auth:sair ao AuthService.
// são "públicos" porque ainda não tem ninguém logado quando o login acontece
export class AuthIpc {
  constructor(private readonly auth: AuthService) {}

  registrar(): void {
    registrarHandlerPublico('auth:login', async (_evento, entrada: unknown) => this.auth.login(entrada));
    registrarHandlerPublico('auth:sessao', async () => this.auth.sessaoAtual());
    registrarHandlerPublico('auth:sair', async () => {
      this.auth.sair();
      return {};
    });
  }
}
