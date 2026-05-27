window.VentoReact = window.VentoReact || {};

(function registerIcon() {
  const paths = {
    map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15',
    plan: 'M4 19h16M5 16l4-10 4 6 3-4 3 8',
    gcp: 'M12 2v20M2 12h20M7 7l10 10M17 7L7 17',
    apps: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
    weather: 'M7 18a5 5 0 1 1 1.1-9.88A6.5 6.5 0 0 1 20 11.5 4.5 4.5 0 0 1 19.5 20H7',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.5 4a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8.5 8.5 0 0 0-1.7-1L16 3.5h-4l-.4 2.6a8.5 8.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8.5 8.5 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8.5 8.5 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z',
    drone: 'M7 8h10l2 4-7 6-7-6 2-4zm-5 0h4m12 0h4M4 4l3 4m13-4-3 4',
    satellite: 'M5 12l7-7 7 7-7 7-7-7zm7-10v3m0 14v3M2 12h3m14 0h3',
    locate: 'M12 2v3m0 14v3M2 12h3m14 0h3M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0z',
    undo: 'M9 7H4v5m0 0a8 8 0 1 0 2.3-5.7L4 12',
    redo: 'M15 7h5v5m0 0a8 8 0 1 1-2.3-5.7L20 12',
    export: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3',
    check: 'M5 13l4 4L19 7',
    alert: 'M12 3l10 18H2L12 3zm0 6v5m0 3h.01',
    close: 'M6 6l12 12M18 6L6 18'
  };

  function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={paths[name] || paths.map} />
      </svg>
    );
  }

  window.VentoReact.Icon = Icon;
})();
