window.VentoReact = window.VentoReact || {};

(function registerWeatherPanel() {
  const { useEffect, useState } = React;
  const Icon = window.VentoReact.Icon;

  function WeatherMetric({ label, windy, ventusky, unit }) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="block text-xs text-slate-500">Windy</span>
            <strong className="text-white">{windy}{unit}</strong>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Ventusky</span>
            <strong className="text-white">{ventusky}{unit}</strong>
          </div>
        </div>
      </div>
    );
  }

  function Skeleton() {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-2xl vp-skeleton"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl vp-skeleton"></div>
          <div className="h-24 rounded-2xl vp-skeleton"></div>
          <div className="h-24 rounded-2xl vp-skeleton"></div>
          <div className="h-24 rounded-2xl vp-skeleton"></div>
        </div>
      </div>
    );
  }

  function WeatherPanel({ location, weather, onWeatherChange }) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      setLoading(true);
      const timer = window.setTimeout(() => {
        const next = window.VentoUtils.weatherConfidence.buildWeatherComparison(location);
        onWeatherChange(next);
        setLoading(false);
      }, 420);
      return () => window.clearTimeout(timer);
    }, [location?.lat, location?.lng]);

    const refresh = () => {
      setLoading(true);
      window.setTimeout(() => {
        const next = window.VentoUtils.weatherConfidence.buildWeatherComparison(location, true);
        onWeatherChange(next);
        setLoading(false);
      }, 360);
    };

    if (loading || !weather) {
      return <Skeleton />;
    }

    const { windy, ventusky, comparison } = weather;
    const confidenceClass = comparison.confidence === 'alta'
      ? 'border-emerald-300/25 bg-emerald-400/[0.12] text-emerald-100'
      : comparison.confidence === 'media'
        ? 'border-amber-300/25 bg-amber-400/[0.12] text-amber-100'
        : 'border-rose-300/25 bg-rose-400/[0.12] text-rose-100';
    const windyUrl = `https://www.windy.com/${Number(location.lat).toFixed(4)}/${Number(location.lng).toFixed(4)}`;
    const ventuskyUrl = `https://www.ventusky.com/?p=${Number(location.lat).toFixed(4)};${Number(location.lng).toFixed(4)};9`;

    return (
      <section className="vp-fade-in space-y-4">
        <div className="vp-glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Windy + Ventusky</p>
              <h2 className="mt-1 text-lg font-black text-white">Clima operacional</h2>
            </div>
            <button type="button" onClick={refresh} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white transition hover:bg-white/[0.1]">
              Atualizar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[96px_1fr] gap-4">
            <div className="grid h-24 w-24 place-items-center rounded-3xl border border-sky-300/20 bg-sky-400/[0.12]">
              <span className="text-3xl font-black text-white">{comparison.flightIndex}</span>
            </div>
            <div>
              <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide ${confidenceClass}`}>
                Confianca {comparison.confidence}
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">{comparison.condition}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{comparison.recommendation}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Icon name="alert" className="h-4 w-4 text-amber-200" />
            Divergencia entre fontes
          </div>
          <p className="text-sm leading-6 text-slate-400">{comparison.divergence}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WeatherMetric label="Vento" windy={windy.wind} ventusky={ventusky.wind} unit=" km/h" />
          <WeatherMetric label="Rajadas" windy={windy.gusts} ventusky={ventusky.gusts} unit=" km/h" />
          <WeatherMetric label="Direcao" windy={windy.direction} ventusky={ventusky.direction} unit=" deg" />
          <WeatherMetric label="Temperatura" windy={windy.temperature} ventusky={ventusky.temperature} unit=" C" />
          <WeatherMetric label="Chuva" windy={windy.rain} ventusky={ventusky.rain} unit="%" />
          <WeatherMetric label="Nuvens" windy={windy.clouds} ventusky={ventusky.clouds} unit="%" />
          <WeatherMetric label="Visibilidade" windy={windy.visibility} ventusky={ventusky.visibility} unit=" km" />
          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Links visuais</span>
            <div className="mt-2 grid gap-2">
              <a href={windyUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-sky-400/[0.12] px-3 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20">Abrir Windy</a>
              <a href={ventuskyUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/20">Abrir Ventusky</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  window.VentoReact.WeatherPanel = WeatherPanel;
})();
