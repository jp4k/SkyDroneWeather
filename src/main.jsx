window.VentoReact = window.VentoReact || {};

(function mountVentoReactApp() {
  function reportInitialLayoutGap(rootElement) {
    const rootRect = rootElement.getBoundingClientRect();
    const nextContent = document.querySelector('.tabs, #clima, #drone, #satellite');
    const nextRect = nextContent?.getBoundingClientRect();
    const rootIsEmpty = rootElement.childElementCount === 0 && !rootElement.textContent.trim();
    const wouldCreateGap = rootIsEmpty && rootRect.height > window.innerHeight * 0.5;

    if (wouldCreateGap) {
      console.warn('[Vento Layout] Espaco vazio inicial detectado em #react-root.', {
        componente: '#react-root',
        motivo: 'O root React estava vazio antes do mount e ocupava altura de viewport.',
        alturaDoRoot: Math.round(rootRect.height),
        proximoConteudo: nextContent?.id || nextContent?.className || null,
        topoDoProximoConteudo: nextRect ? Math.round(nextRect.top) : null,
        correcao: 'A altura de 100vh agora so e aplicada apos body.react-platform-enabled.'
      });
      return;
    }

    console.info('[Vento Layout] Diagnostico inicial: #react-root era o ponto de risco do espaco vazio; correcao preventiva ativa.', {
      componente: '#react-root',
      rootVazio: rootIsEmpty,
      alturaAtual: Math.round(rootRect.height),
      correcao: 'Sem min-height global enquanto vazio.'
    });
  }

  function mount() {
    const rootElement = document.getElementById('react-root');
    if (!rootElement || !window.React || !window.ReactDOM || !window.VentoReact.App) return;
    reportInitialLayoutGap(rootElement);
    document.documentElement.classList.add('react-platform-enabled');
    document.body.classList.add('react-platform-enabled');
    document.getElementById('loadingOverlay')?.classList.add('hidden');
    const App = window.VentoReact.App;
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
