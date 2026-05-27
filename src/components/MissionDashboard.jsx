window.VentoReact = window.VentoReact || {};

(function registerMissionDashboard() {
  const Icon = window.VentoReact.Icon;

  function Metric({ label, value, detail }) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <strong className="mt-1 block text-xl font-black text-white">{value}</strong>
        {detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}
      </div>
    );
  }

  function MissionDashboard({ metrics }) {
    const statusTone = metrics.status === 'Seguro'
      ? 'border-emerald-300/25 bg-emerald-400/[0.12] text-emerald-100'
      : metrics.status === 'Moderado'
        ? 'border-amber-300/25 bg-amber-400/[0.12] text-amber-100'
        : 'border-rose-300/25 bg-rose-400/[0.12] text-rose-100';

    return (
      <section className="vp-glass pointer-events-auto w-full rounded-2xl p-3 lg:w-[384px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Dashboard de voo</p>
            <h2 className="mt-1 text-base font-black text-white">Resumo da missao</h2>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusTone}`}>
            <span className="h-2 w-2 rounded-full bg-current"></span>
            {metrics.status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric label="Area total" value={`${metrics.areaHa.toFixed(2)} ha`} detail="poligono ativo" />
          <Metric label="Tempo" value={`${metrics.flightMinutes} min`} detail="estimativa" />
          <Metric label="Fotos" value={metrics.photos} detail="pontos gerados" />
          <Metric label="Baterias" value={metrics.batteries} detail="com reserva" />
          <Metric label="Qualidade" value={`${metrics.quality}%`} detail="missao + clima" />
          <Metric label="Rota" value={`${(metrics.routeMeters / 1000).toFixed(2)} km`} detail="linhas de voo" />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300/[0.15] bg-sky-400/10 p-3 text-xs leading-5 text-slate-300">
          <Icon name="check" className="h-4 w-4 shrink-0 text-sky-200" />
          <span>Linhas, fotos e autonomia sao recalculadas automaticamente ao editar area, GCPs, clima ou drone.</span>
        </div>
      </section>
    );
  }

  window.VentoReact.MissionDashboard = MissionDashboard;
})();
