// Ponto de entrada do renderer (front-end)
// Inicialização da aplicação será implementada conforme desenvolvimento
console.log('Clínica Veterinária - Renderer iniciado');

// Tipagem para window.api (será expandida com tipos do @clinica-vet/shared)
declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}

// Exemplo de uso da API (será removido/substituído)
window.api.invoke('teste:ping').then(console.log).catch(console.error);