import type { BancoSql } from '../db/banco-sql';
import { AlertasEstoqueRepository, AlertasService } from '../modules/alertas/alertas.service';
import { CotacaoDolarRepository, criarBuscadorAwesomeApi, DolarService } from '../modules/dolar/dolar.service';
import { EstoqueRepository } from '../modules/estoque/estoque.repository';
import { EstoqueService } from '../modules/estoque/estoque.service';
import { FornecedoresRepository } from '../modules/fornecedores/fornecedores.repository';
import { FornecedoresService } from '../modules/fornecedores/fornecedores.service';
import { MedicamentosRepository } from '../modules/medicamentos/medicamentos.repository';
import { MedicamentosService } from '../modules/medicamentos/medicamentos.service';
import { obterSessao, registrarHandler, type PerfilPermitido } from './registry';

const TODOS_PERFIS: PerfilPermitido[] = ['MASTER', 'VETERINARIO', 'ATENDENTE'];
const APENAS_MASTER: PerfilPermitido[] = ['MASTER'];
const URL_DOLAR_PADRAO = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';

export interface ServicosTrilha3 {
  medicamentos: MedicamentosService;
  fornecedores: FornecedoresService;
  dolar: DolarService;
  estoque: EstoqueService;
  alertas: AlertasService;
}

export function criarServicosTrilha3(
  banco: BancoSql,
  apiUrlDolar: string = process.env.DOLAR_API_URL || URL_DOLAR_PADRAO,
): ServicosTrilha3 {
  const repoMedicamentos = new MedicamentosRepository(banco);
  const medicamentos = new MedicamentosService(repoMedicamentos);

  const repoDolar = new CotacaoDolarRepository(banco);
  const dolar = new DolarService(repoDolar, criarBuscadorAwesomeApi(apiUrlDolar));

  const repoFornecedores = new FornecedoresRepository(banco);
  const fornecedores = new FornecedoresService(repoFornecedores, dolar);

  const repoEstoque = new EstoqueRepository(banco, () => obterSessao()?.usuarioId ?? null);
  const estoque = new EstoqueService(repoEstoque);

  const repoAlertas = new AlertasEstoqueRepository(banco);
  const alertas = new AlertasService(estoque, repoAlertas);

  return { medicamentos, fornecedores, dolar, estoque, alertas };
}

export class Trilha3Ipc {
  constructor(private readonly servicos: ServicosTrilha3) {}

  registrar(): void {
    // --- Medicamentos: leitura para todos, escrita só MASTER ---
    registrarHandler('medicamentos:listar', TODOS_PERFIS, async (_event, dados) =>
      this.servicos.medicamentos.listar(dados),
    );
    registrarHandler('medicamentos:obter', TODOS_PERFIS, async (_event, dados) =>
      this.servicos.medicamentos.obter(dados),
    );
    registrarHandler('medicamentos:criar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.medicamentos.criar(dados),
    );
    registrarHandler('medicamentos:atualizar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.medicamentos.atualizar(dados),
    );
    registrarHandler('medicamentos:inativar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.medicamentos.inativar(dados),
    );

    // --- Fornecedores e Comparativo de Preços: só MASTER ---
    registrarHandler('fornecedores:listar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.listar(dados),
    );
    registrarHandler('fornecedores:obter', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.obter(dados),
    );
    registrarHandler('fornecedores:criar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.criar(dados),
    );
    registrarHandler('fornecedores:atualizar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.atualizar(dados),
    );
    registrarHandler('fornecedores:inativar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.inativar(dados),
    );
    registrarHandler('fornecedores:precos_listar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.precosListar(dados),
    );
    registrarHandler('fornecedores:precos_salvar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.precosSalvar(dados),
    );
    registrarHandler('fornecedores:precos_inativar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.fornecedores.precosInativar(dados),
    );

    // --- Dólar: todos os perfis autenticados ---
    registrarHandler('dolar:atual', TODOS_PERFIS, async () => this.servicos.dolar.atual());

    // --- Estoque e Alertas: leitura para todos, movimentação manual só MASTER ---
    registrarHandler('estoque:saldos', TODOS_PERFIS, async (_event, dados) =>
      this.servicos.estoque.saldos(dados),
    );
    registrarHandler('estoque:lotes', TODOS_PERFIS, async (_event, dados) =>
      this.servicos.estoque.lotes(dados),
    );
    registrarHandler('estoque:movimentar', APENAS_MASTER, async (_event, dados) =>
      this.servicos.estoque.movimentar(dados),
    );
    registrarHandler('alertas:listar', TODOS_PERFIS, async () => this.servicos.alertas.listar());
    registrarHandler('alertas:contar', TODOS_PERFIS, async () => this.servicos.alertas.contar());
  }
}

export function registrarTrilha3Ipc(
  banco: BancoSql,
  apiUrlDolar: string = process.env.DOLAR_API_URL || URL_DOLAR_PADRAO,
): Trilha3Ipc {
  const ipc = new Trilha3Ipc(criarServicosTrilha3(banco, apiUrlDolar));
  ipc.registrar();
  return ipc;
}
