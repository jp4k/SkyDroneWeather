window.VentoReact = window.VentoReact || {};

(function registerSettingsPanel() {
  const { useEffect, useState } = React;

  function DebouncedNumber({ label, value, onChange, min, max, suffix }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    useEffect(() => {
      const timer = window.setTimeout(() => onChange(Number(draft)), 280);
      return () => window.clearTimeout(timer);
    }, [draft]);

    return (
      <label className="block rounded-xl border border-white/10 bg-white/[0.045] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full accent-sky-300"
          />
          <strong className="w-16 text-right text-sm text-white">{draft}{suffix}</strong>
        </div>
      </label>
    );
  }

  function SettingsPanel({ settings, setSettings, selectedDroneId, setSelectedDroneId }) {
    const drones = window.VentoData.drones || [];
    const selectedDrone = drones.find((drone) => drone.id === selectedDroneId) || drones[0];

    return (
      <section className="vp-fade-in space-y-4">
        <div className="vp-glass rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Configuracoes</p>
          <h2 className="mt-1 text-lg font-black text-white">Perfil da missao</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Ajustes sao aplicados com debounce para manter o mapa fluido mesmo em alteracoes rapidas.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Drone
            <select
              value={selectedDroneId}
              onChange={(event) => setSelectedDroneId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm font-bold text-white outline-none transition focus:border-sky-300/50"
            >
              {drones.map((drone) => <option key={drone.id} value={drone.id}>{drone.name}</option>)}
            </select>
          </label>
          {selectedDrone ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-white/[0.05] p-3">
                <span className="text-xs text-slate-500">Autonomia</span>
                <strong className="block text-white">{selectedDrone.enduranceMin} min</strong>
              </div>
              <div className="rounded-xl bg-white/[0.05] p-3">
                <span className="text-xs text-slate-500">Cruzeiro</span>
                <strong className="block text-white">{selectedDrone.cruiseSpeedKmh} km/h</strong>
              </div>
            </div>
          ) : null}
        </div>

        <DebouncedNumber
          label="Sobreposicao"
          value={settings.overlap}
          min="55"
          max="90"
          suffix="%"
          onChange={(value) => setSettings((current) => ({ ...current, overlap: Math.max(55, Math.min(90, value)) }))}
        />
        <DebouncedNumber
          label="Altitude planejada"
          value={settings.altitude}
          min="40"
          max="160"
          suffix=" m"
          onChange={(value) => setSettings((current) => ({ ...current, altitude: Math.max(40, Math.min(160, value)) }))}
        />

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <h3 className="font-black text-white">Performance</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <label className="flex items-center justify-between gap-4">
              Lazy loading de paineis
              <input type="checkbox" checked readOnly className="accent-sky-300" />
            </label>
            <label className="flex items-center justify-between gap-4">
              Cache climatico local
              <input type="checkbox" checked readOnly className="accent-sky-300" />
            </label>
            <label className="flex items-center justify-between gap-4">
              Renderizacao otimizada do mapa
              <input type="checkbox" checked readOnly className="accent-sky-300" />
            </label>
          </div>
        </div>
      </section>
    );
  }

  window.VentoReact.SettingsPanel = SettingsPanel;
})();
