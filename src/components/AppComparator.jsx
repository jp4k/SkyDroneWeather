window.VentoReact = window.VentoReact || {};

(function registerAppComparator() {
  const { useMemo, useState } = React;

  function AppComparator() {
    const apps = window.VentoData.apps || [];
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('Todos');
    const categories = ['Todos', ...new Set(apps.map((app) => app.category))];
    const filtered = useMemo(() => apps.filter((app) => {
      const matchesCategory = category === 'Todos' || app.category === category;
      const matchesQuery = [app.name, app.category, ...(app.strengths || [])].join(' ').toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    }), [apps, category, query]);

    return (
      <section className="vp-fade-in space-y-4">
        <div className="vp-glass rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Ecossistema</p>
          <h2 className="mt-1 text-lg font-black text-white">Comparador de apps</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por app, uso ou exportacao"
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-sky-300/50"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-sky-300/50"
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.map((app) => (
            <article key={app.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-sky-300/30 hover:bg-white/[0.07]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{app.name}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{app.category}</p>
                </div>
                <span className="rounded-full bg-sky-400/[0.12] px-3 py-1.5 text-xs font-black text-sky-100">{app.score}%</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {app.strengths.map((item) => (
                  <span key={item} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300">{item}</span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {app.exports.map((item) => (
                  <span key={item} className="rounded-lg border border-emerald-300/[0.15] bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-100">{item}</span>
                ))}
              </div>
              {app.url ? (
                <a href={app.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg px-0 py-1 text-sm font-bold text-sky-200 transition hover:text-white">
                  Abrir fonte
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    );
  }

  window.VentoReact.AppComparator = AppComparator;
})();
