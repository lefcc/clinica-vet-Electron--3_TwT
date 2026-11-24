// Jobs agendados com node-cron - alertas, sync, dólar, vacinas
import cron from 'node-cron';
import { randomUUID } from 'node:crypto';
import { config } from '../config/env';
import { executarPush, getSyncStatus } from '../sync';
import { getLocalDb } from '../db/local/client';
import { agoraEmSegundos, diaSaoPaulo } from '../modules/admin/transacao';

let jobsIniciados = false;
const jobsAtivos: Map<string, cron.ScheduledTask> = new Map();

export function iniciarJobs(): void {
  if (jobsIniciados) return;
  jobsIniciados = true;

  // Sync periódica
  const syncIntervalMin = Math.max(1, Math.floor(config.sync.intervalMs / 60000));
  agendarJob('sync', `*/${syncIntervalMin} * * * *`, async () => {
    if (!getSyncStatus().emAndamento) {
      try {
        await executarPush();
      } catch (error) {
        console.error('[Job Sync] Erro:', error);
      }
    }
  });

  // Cotação do dólar (diário às 9h)
  agendarJob('dolar', '0 9 * * *', async () => {
    try {
      await buscarECotacaoDolar();
    } catch (error) {
      console.error('[Job Dólar] Erro:', error);
    }
  });

  // Alertas de estoque (a cada 6 horas)
  agendarJob('alertas-estoque', '0 */6 * * *', async () => {
    try {
      await verificarAlertasEstoque();
    } catch (error) {
      console.error('[Job Alertas Estoque] Erro:', error);
    }
  });

  // Lembretes de vacina (diário às 8h)
  agendarJob('vacinas', '0 8 * * *', async () => {
    try {
      await processarLembretesVacina();
    } catch (error) {
      console.error('[Job Vacinas] Erro:', error);
    }
  });

  console.log('[Jobs] Todos os jobs agendados iniciados');
}
export function pararJobs(): void {
  for (const [nome, job] of jobsAtivos) {
    job.stop();
    console.log(`[Jobs] Job "${nome}" parado`);
  }
  jobsAtivos.clear();
  jobsIniciados = false;
}

function agendarJob(nome: string, expressao: string, fn: () => Promise<void>): void {
  const job = cron.schedule(expressao, fn, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });
  jobsAtivos.set(nome, job);
  console.log(`[Jobs] Job "${nome}" agendado: ${expressao}`);
}

interface AwesomeAPIResponse {
  USDBRL?: { bid: string };
}

async function buscarECotacaoDolar(): Promise<void> {
  try {
    const response = await fetch(config.dolar.apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json() as AwesomeAPIResponse;
    const cotacao = data.USDBRL?.bid;

    if (cotacao) {
      const valorCentavos = Math.round(parseFloat(cotacao) * 100);
      const db = getLocalDb();
      db.prepare(`
        INSERT INTO cotacoes_dolar (id, valor_centavos, data_cotacao, fonte)
        VALUES (?, ?, ?, ?)
      `).run(randomUUID(), valorCentavos, agoraEmSegundos(), 'awesomeapi');
      console.log(`[Dólar] Cotação atualizada: R$ ${(valorCentavos / 100).toFixed(2)}`);
    }
  } catch (error) {
    console.error('[Dólar] Falha ao buscar cotação, mantendo última salva:', error);
  }
}

async function verificarAlertasEstoque(): Promise<void> {
  const db = getLocalDb();

  // Buscar medicamentos ativos com configuração de alerta
  const medicamentos = db.prepare(`
    SELECT id, nome, dias_alerta, consumo_inicial_diario
    FROM medicamentos
    WHERE ativo = 1
  `).all() as Array<{ id: string; nome: string; dias_alerta: number; consumo_inicial_diario: number | null }>;

  for (const med of medicamentos) {
    // Calcular saldo atual (soma de movimentações)
    const saldoResult = db.prepare(`
      SELECT COALESCE(SUM(quantidade), 0) as saldo
      FROM movimentacoes_estoque
      WHERE medicamento_id = ?
    `).get(med.id) as { saldo: number };

    const saldo = saldoResult.saldo;

    // Calcular consumo médio dos últimos 30 dias
    const trintaDiasAtras = agoraEmSegundos() - 30 * 24 * 60 * 60;
    const saidas = db.prepare(`
      SELECT COALESCE(SUM(-quantidade), 0) as total_saidas
      FROM movimentacoes_estoque
      WHERE medicamento_id = ? AND quantidade < 0 AND criado_em >= ?
    `).get(med.id, trintaDiasAtras) as { total_saidas: number };

    let consumoMedioDiario = saidas.total_saidas / 30;
    const temHistoricoSuficiente = saidas.total_saidas > 0;

    if (!temHistoricoSuficiente && med.consumo_inicial_diario) {
      consumoMedioDiario = med.consumo_inicial_diario;
    }

    if (consumoMedioDiario > 0) {
      const diasRestantes = Math.floor(saldo / consumoMedioDiario);
      if (diasRestantes <= med.dias_alerta) {
        // Verificar se já existe alerta aberto
        const alertaExistente = db.prepare(`
          SELECT 1 FROM alertas_estoque
          WHERE medicamento_id = ? AND status = 'aberto'
        `).get(med.id);

        if (!alertaExistente) {
          db.prepare(`
            INSERT INTO alertas_estoque (id, medicamento_id, dias_restantes, saldo_atual, consumo_medio_diario, status)
            VALUES (?, ?, ?, ?, ?, 'aberto')
          `).run(randomUUID(), med.id, diasRestantes, saldo, consumoMedioDiario);
          console.log(`[Alerta Estoque] Medicamento "${med.nome}" com ${diasRestantes} dias restantes`);
        }
      }
    }
  }
}

async function processarLembretesVacina(): Promise<void> {
  const db = getLocalDb();
  const tresDias = 3 * 24 * 60 * 60 * 1000;
  const dataLimite = Date.now() + tresDias;

  const vacinasProximas = db.prepare(`
    SELECT v.*, a.nome as animal_nome, a.cliente_id, c.nome as cliente_nome, c.telefone, vc.nome AS descricao
    FROM vacinas_aplicacoes v
    JOIN vacinas_catalogo vc ON vc.id = v.vacina_id
    JOIN animais a ON a.id = v.animal_id
    JOIN clientes c ON c.id = a.cliente_id
    WHERE v.proxima_dose <= ? AND v.ativo = 1 AND a.ativo = 1 AND c.ativo = 1
  `).all(diaSaoPaulo(new Date(dataLimite))) as Array<{
    id: string;
    animal_id: string;
    animal_nome: string;
    cliente_id: string;
    cliente_nome: string;
    telefone: string | null;
    proxima_dose: string;
    descricao: string;
  }>;

  for (const vacina of vacinasProximas) {
    // Verificar se já existe lembrete pendente para esta vacina
    const lembreteExistente = db.prepare(`
      SELECT 1 FROM lembretes_vacina
      WHERE vacina_id = ? AND status = 'pendente'
    `).get(vacina.id);

    if (!lembreteExistente && vacina.telefone) {
      const diasRestantes = Math.round((Date.parse(vacina.proxima_dose) - Date.parse(diaSaoPaulo(new Date()))) / (24 * 60 * 60 * 1000));
      const mensagem = `Olá ${vacina.cliente_nome}! Lembrete: a vacina "${vacina.descricao}" do ${vacina.animal_nome} vence em ${diasRestantes} dia(s).`;

      db.prepare(`
        INSERT INTO lembretes_vacina (id, vacina_id, mensagem, telefone, status)
        VALUES (?, ?, ?, ?, 'pendente') ON CONFLICT(vacina_id) DO NOTHING
      `).run(randomUUID(), vacina.id, mensagem, vacina.telefone);

      console.log(`[Vacina] Lembrete criado para ${vacina.cliente_nome} - ${vacina.animal_nome}`);
    }
  }
}
