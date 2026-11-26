import { BrowserWindow, dialog, net, shell } from 'electron';
import {
  CepEntradaSchema, CobrancaSchema, CsvExportarEntradaSchema, CsvExportarSaidaSchema,
  CsvImportarEntradaSchema, CsvImportarSaidaSchema, EnderecoSchema, EntradaListagemSchema, EstoqueValidadeSchema,
  ListaCompraSchema, OrcamentoCriarSchema, OrcamentoPdfSchema, OrcamentoSchema, PorIdSchema, ResumoInicioSchema,
  SemEntradaSchema, ServicoAtualizarSchema, ServicoCriarSchema, ServicoSchema, VacinaAplicarSchema,
  VacinaAtualizarSchema, VacinaCatalogoSchema, VacinaCriarSchema, VacinaFilaSchema, VazioSchema, WhatsAppEntradaSchema,
  paginaSchema, type Configuracoes, type Perfil
} from '@clinica-vet/shared';
import { z } from 'zod';
import type { BancoSql } from '../db/banco-sql';
import { ErroNegocio } from '../erros/erro-negocio';
import { OutboxRepository } from '../modules/admin/outbox.repository';
import { OrcamentoPdf, type SaidaPdf } from '../modules/atendimentos/orcamentos.pdf';
import { OrcamentosRepository } from '../modules/atendimentos/orcamentos.repository';
import { OrcamentosService } from '../modules/atendimentos/orcamentos.service';
import { ServicosRepository } from '../modules/atendimentos/servicos.repository';
import { ServicosService } from '../modules/atendimentos/servicos.service';
import { CepService } from '../modules/integracoes/cep.service';
import { WhatsAppService } from '../modules/integracoes/whatsapp.service';
import { CsvService } from '../modules/relatorios/csv.service';
import { DashboardService } from '../modules/relatorios/dashboard.service';
import { RelatoriosRepository } from '../modules/relatorios/relatorios.repository';
import { RelatoriosService } from '../modules/relatorios/relatorios.service';
import { VacinasRepository } from '../modules/vacinas/vacinas.repository';
import { VacinasService } from '../modules/vacinas/vacinas.service';
import { registrarHandler, type Sessao } from './registry';
import { criarServicosTrilha3 } from './trilha3.ipc';

const TODOS: Perfil[] = ['MASTER', 'VETERINARIO', 'ATENDENTE'];
const MASTER: Perfil[] = ['MASTER'];
const BALCAO: Perfil[] = ['MASTER', 'ATENDENTE'];
const APLICAM_VACINA: Perfil[] = ['MASTER', 'VETERINARIO'];

// este objeto imprime o pdf e pergunta onde salvar
const saidaPdfElectron: SaidaPdf = {
  async imprimir(html) {
    const janela = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } });
    try {
      await janela.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      return await janela.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
    } finally {
      janela.destroy();
    }
  },
  async escolherArquivo(nomeSugerido) {
    const opcoes = { title: 'Salvar orçamento', defaultPath: nomeSugerido, filters: [{ name: 'PDF', extensions: ['pdf'] }] };
    const janela = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = janela ? await dialog.showSaveDialog(janela, opcoes) : await dialog.showSaveDialog(opcoes);
    return canceled ? undefined : filePath;
  }
};

export interface FontesTrilha4 {
  configuracoes: () => Configuracoes;
}

// esta função cria os serviços da trilha 4
export function criarServicosTrilha4(banco: BancoSql, fontes: FontesTrilha4) {
  const outbox = new OutboxRepository(banco);
  const trilha3 = criarServicosTrilha3(banco);
  const relatoriosRepo = new RelatoriosRepository(banco);

  const vacinas = new VacinasService(banco, new VacinasRepository(banco), outbox, () => fontes.configuracoes().template_lembrete);
  return {
    vacinas,
    servicos: new ServicosService(banco, new ServicosRepository(banco), outbox),
    orcamentos: new OrcamentosService(banco, new OrcamentosRepository(banco), outbox),
    pdf: new OrcamentoPdf(saidaPdfElectron),
    cep: new CepService(),
    whatsapp: new WhatsAppService((url) => shell.openExternal(url), () => net.isOnline()),
    dashboard: new DashboardService(relatoriosRepo, {
      alertas: () => trilha3.alertas.listar(),
      vacinas: () => vacinas.fila(),
      pendencias: () => outbox.contarPendencias()
    }),
    relatorios: new RelatoriosService(relatoriosRepo, trilha3.estoque),
    csv: new CsvService(banco, relatoriosRepo, outbox),
    configuracoes: fontes.configuracoes
  };
}

// esta função registra um canal e valida os dados
function registrar<E extends z.ZodTypeAny, S extends z.ZodTypeAny>(
  canal: string,
  perfis: Perfil[],
  entrada: E,
  saida: S,
  executar: (dados: z.output<E>, sessao: Sessao) => unknown
): void {
  registrarHandler(canal, perfis, async (_evento, dados: unknown, sessao) => {
    const validado = entrada.safeParse(dados);
    if (!validado.success) throw new ErroNegocio('DADOS_INVALIDOS', 'Confira os dados enviados e tente novamente.');
    return saida.parse(await executar(validado.data, sessao));
  });
}

// esta função registra todos os canais
export function registrarTrilha4Ipc(banco: BancoSql, fontes: FontesTrilha4): void {
  const s = criarServicosTrilha4(banco, fontes);
  const nada = SemEntradaSchema;

  registrar('dashboard:resumo', TODOS, nada, ResumoInicioSchema,
    (_d, sessao) => s.dashboard.resumo(sessao.perfil, sessao.usuarioId));

  registrar('cep:buscar', BALCAO, z.object({ cep: z.string() }).strict(), EnderecoSchema, ({ cep }) => {
    if (!CepEntradaSchema.safeParse({ cep }).success) throw new ErroNegocio('CEP_INVALIDO', 'O CEP precisa ter 8 números.');
    return s.cep.consultar(cep);
  });
  registrar('whatsapp:abrir', BALCAO, WhatsAppEntradaSchema, VazioSchema, async ({ telefone, mensagem }) => {
    await s.whatsapp.abrir(telefone, mensagem);
    return {};
  });

  registrar('vacinas:catalogo_listar', TODOS, EntradaListagemSchema, paginaSchema(VacinaCatalogoSchema), (d) => s.vacinas.catalogoListar(d));
  registrar('vacinas:catalogo_obter', TODOS, PorIdSchema, VacinaCatalogoSchema, ({ id }) => s.vacinas.catalogoObter(id));
  registrar('vacinas:catalogo_criar', MASTER, VacinaCriarSchema, VacinaCatalogoSchema, (d) => s.vacinas.catalogoCriar(d));
  registrar('vacinas:catalogo_atualizar', MASTER, VacinaAtualizarSchema, VacinaCatalogoSchema, (d) => s.vacinas.catalogoAtualizar(d));
  registrar('vacinas:catalogo_inativar', MASTER, PorIdSchema, VazioSchema, ({ id }) => {
    s.vacinas.catalogoInativar(id);
    return {};
  });
  registrar('vacinas:fila', TODOS, nada, z.array(VacinaFilaSchema), () => s.vacinas.fila());
  registrar('vacinas:aplicar', APLICAM_VACINA, VacinaAplicarSchema, z.object({ id: z.string(), proxima_dose: z.string() }),
    (d, sessao) => s.vacinas.aplicar(d, sessao.usuarioId));
  registrar('vacinas:lembrete_registrar', BALCAO, PorIdSchema, VazioSchema, ({ id }) => {
    s.vacinas.registrarLembrete(id);
    return {};
  });

  registrar('servicos:listar', BALCAO, EntradaListagemSchema, paginaSchema(ServicoSchema), (d) => s.servicos.listar(d));
  registrar('servicos:obter', BALCAO, PorIdSchema, ServicoSchema, ({ id }) => s.servicos.obter(id));
  registrar('servicos:criar', MASTER, ServicoCriarSchema, ServicoSchema, (d) => s.servicos.criar(d));
  registrar('servicos:atualizar', MASTER, ServicoAtualizarSchema, ServicoSchema, (d) => s.servicos.atualizar(d));
  registrar('servicos:inativar', MASTER, PorIdSchema, VazioSchema, ({ id }) => {
    s.servicos.inativar(id);
    return {};
  });

  registrar('orcamentos:listar', BALCAO, EntradaListagemSchema, paginaSchema(OrcamentoSchema), (d) => s.orcamentos.listar(d));
  registrar('orcamentos:obter', BALCAO, PorIdSchema, OrcamentoSchema, ({ id }) => s.orcamentos.obter(id));
  registrar('orcamentos:criar', BALCAO, OrcamentoCriarSchema, OrcamentoSchema, (d) => s.orcamentos.criar(d));
  registrar('orcamentos:pdf', BALCAO, PorIdSchema, OrcamentoPdfSchema, ({ id }) => s.pdf.gerar(s.orcamentos.obter(id), s.configuracoes()));

  registrar('relatorios:cobrancas', MASTER, nada, z.array(CobrancaSchema), () => s.relatorios.cobrancas());
  registrar('relatorios:estoque_validade', MASTER, nada, z.array(EstoqueValidadeSchema), () => s.relatorios.estoqueValidade());
  registrar('relatorios:lista_compras', MASTER, nada, z.array(ListaCompraSchema), () => s.relatorios.listaCompras());
  registrar('csv:exportar', MASTER, CsvExportarEntradaSchema, CsvExportarSaidaSchema, ({ entidade }) => s.csv.exportar(entidade));
  registrar('csv:importar', MASTER, CsvImportarEntradaSchema, CsvImportarSaidaSchema, ({ entidade, conteudo }) => s.csv.importar(entidade, conteudo));
}
