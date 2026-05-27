window.VentoReact = window.VentoReact || {};

(function registerMobileNav() {
  const Icon = window.VentoReact.Icon;

  function MobileNav({ activeView, onViewChange, items }) {
    return (
      <nav className="fixed inset-x-3 bottom-3 z-[1200] grid grid-cols-6 gap-1 rounded-2xl border border-white/[0.12] bg-slate-950/[0.88] p-1.5 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl lg:hidden">
        {items.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              title={item.hint}
              className={[
                'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold transition-all duration-200',
                active ? 'bg-sky-400/[0.18] text-white' : 'text-slate-400 hover:bg-white/[0.08] hover:text-slate-100'
              ].join(' ')}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              <span className="w-full truncate">{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  window.VentoReact.MobileNav = MobileNav;
})();
