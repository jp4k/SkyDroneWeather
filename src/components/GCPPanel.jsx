window.VentoReact = window.VentoReact || {};

(function registerGCPPanel() {
  const Icon = window.VentoReact.Icon;
  const { useMemo, useRef } = React;

  function GCPPanel({ gcp, geometry, onAddSuggested, onUpdateGcp, onRemoveGcp, onImportGcp, onExportGcp }) {
    const inputRef = useRef(null);
    const exporter = window.VentoUtils.missionExport;
    const validation = useMemo(() => exporter.validateGcpDistribution(gcp, geometry), [gcp, geometry]);

    const handleImport = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const points = exporter.parseGcpFile(file.name, String(reader.result || ''));
        onImportGcp(points);
        event.target.value = '';
      };
      reader.readAsText(file);
    };

    const statusClass = validation.score >= 82
      ? 'text-emerald-100 bg-emerald-400/[0.12] border-emerald-300/25'
      : validation.score >= 58
        ? 'text-amber-100 bg-amber-400/[0.12] border-amber-300/25'
        : 'text-rose-100 bg-rose-400/[0.12] border-rose-300/25';

    return (
      <section className="vp-fade-in space-y-4">
        <div className="vp-glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Controle em solo</p>
              <h2 className="mt-1 text-lg font-black text-white">GCP profissional</h2>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusClass}`}>{validation.status}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{validation.message}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-300 transition-all duration-500" style={{ width: `${validation.score}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]">
            Importar GCP
          </button>
          <button type="button" onClick={onAddSuggested} className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.12] px-3 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/20">
            Sugerir pontos
          </button>
          <button type="button" onClick={() => onExportGcp('csv')} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]">
            Exportar CSV
          </button>
          <button type="button" onClick={() => onExportGcp('json')} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]">
            Exportar JSON
          </button>
          <button type="button" onClick={() => exporter.generateGcpReport(gcp, validation)} className="rounded-xl border border-sky-300/20 bg-sky-400/[0.12] px-3 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20">
            Relatorio PDF
          </button>
          <input ref={inputRef} type="file" accept=".csv,.txt,.kml,.gpx,.geojson,.json" className="hidden" onChange={handleImport} />
        </div>

        <div className="vp-glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white">Pontos GCP</h3>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-bold text-slate-400">{gcp.length} pontos</span>
          </div>
          <div className="max-h-[420px] space-y-3 overflow-auto pr-1 vp-scrollbar">
            {gcp.length ? gcp.map((point, index) => (
              <div key={point.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <input
                    value={point.name || ''}
                    onChange={(event) => onUpdateGcp(point.id, { name: event.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/50"
                    aria-label={`Nome do GCP ${index + 1}`}
                  />
                  <button type="button" onClick={() => onRemoveGcp(point.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-rose-400/[0.12] text-rose-100 transition hover:bg-rose-400/20" title="Remover GCP">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Lat
                    <input
                      type="number"
                      step="0.000001"
                      value={point.lat}
                      onChange={(event) => onUpdateGcp(point.id, { lat: Number(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/50"
                    />
                  </label>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Lng
                    <input
                      type="number"
                      step="0.000001"
                      value={point.lng}
                      onChange={(event) => onUpdateGcp(point.id, { lng: Number(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300/50"
                    />
                  </label>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-white/[0.12] p-5 text-center text-sm text-slate-400">
                Clique no mapa com a ferramenta GCP ou importe CSV, TXT, KML, GPX ou GeoJSON.
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  window.VentoReact.GCPPanel = GCPPanel;
})();
