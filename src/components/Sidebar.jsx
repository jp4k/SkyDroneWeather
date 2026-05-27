window.VentoReact = window.VentoReact || {};

(function registerSidebar() {
  const Icon = window.VentoReact.Icon;

  function NavButton({ item, active, onClick }) {
    return (
      <button
        type="button"
        onClick={() => onClick(item.id)}
        title={item.hint}
        className={[
          'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all duration-200',
          active
            ? 'bg-sky-500/[0.18] text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]'
            : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
        ].join(' ')}
      >
        <span className={['grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors', active ? 'bg-sky-400/20 text-sky-200' : 'bg-white/5 text-slate-400 group-hover:text-slate-100'].join(' ')}>
          <Icon name={item.icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate">{item.label}</span>
          <span className="block truncate text-[11px] font-medium text-slate-500">{item.description}</span>
        </span>
      </button>
    );
  }

  function Sidebar({ activeView, onViewChange, mainItems, legacyItems, missionStatus }) {
    return (
      <aside className="vp-sidebar hidden h-full min-h-0 w-[292px] shrink-0 overflow-y-auto border-r border-white/10 bg-slate-950/[0.76] p-4 backdrop-blur-2xl lg:flex lg:flex-col vp-scrollbar">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-950/40">
            <Icon name="drone" className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-white">Vento Ultra Pro</h1>
            <p className="text-xs text-slate-400">Plataforma de mapeamento</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Status geral</span>
            <span className="rounded-full bg-emerald-300/[0.15] px-2 py-1 text-xs font-bold text-emerald-100">{missionStatus}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Planejamento, clima, GCP e exportacao em uma area de trabalho.</p>
        </div>

        <nav className="space-y-2">
          {mainItems.map((item) => (
            <NavButton key={item.id} item={item} active={activeView === item.id} onClick={onViewChange} />
          ))}
        </nav>

        <div className="mt-auto pt-5">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">Modulos existentes</p>
          <div className="space-y-2">
            {legacyItems.map((item) => (
              <NavButton key={item.id} item={item} active={activeView === item.id} onClick={onViewChange} />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  window.VentoReact.Sidebar = Sidebar;
})();
