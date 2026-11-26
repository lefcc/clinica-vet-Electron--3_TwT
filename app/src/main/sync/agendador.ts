import cron from 'node-cron';

export function iniciarAgendadorSync(opcoes: {
  online: () => boolean;
  executar: () => Promise<unknown>;
  intervaloMs: number;
  aoErro: () => void;
}): () => void {
  let onlineAntes = false;
  let proxima = 0;
  let emAndamento = false;

  function verificar(): void {
    const online = opcoes.online();
    const reconectou = online && !onlineAntes;
    onlineAntes = online;
    if (reconectou) proxima = 0;
    if (!online || emAndamento || Date.now() < proxima) return;
    proxima = Date.now() + opcoes.intervaloMs;
    emAndamento = true;
    void Promise.resolve()
      .then(opcoes.executar)
      .catch(opcoes.aoErro)
      .finally(() => {
        emAndamento = false;
      });
  }

  const relogio = cron.schedule('*/2 * * * * *', verificar);
  verificar();
  return () => relogio.stop();
}
