window.VentoReact = window.VentoReact || {};

(function registerApp() {
  const { useEffect, useMemo, useRef, useState } = React;
  const {
    Sidebar,
    MobileNav,
    MapPlanner,
    MissionDashboard,
    GCPPanel,
    WeatherPanel,
    AppComparator,
    SettingsPanel,
    Icon
  } = window.VentoReact;

  const mainItems = [
    { id: 'map', label: 'Mapa', shortLabel: 'Mapa', icon: 'map', description: 'Area principal', hint: 'Mapa profissional' },
    { id: 'planning', label: 'Planejamento', shortLabel: 'Plano', icon: 'plan', description: 'Linhas e fotos', hint: 'Planejamento de voo' },
    { id: 'gcp', label: 'GCP', shortLabel: 'GCP', icon: 'gcp', description: 'Controle em solo', hint: 'Pontos GCP' },
    { id: 'apps', label: 'Apps', shortLabel: 'Apps', icon: 'apps', description: 'Comparador', hint: 'Apps e exportacao' },
    { id: 'weather', label: 'Clima', shortLabel: 'Clima', icon: 'weather', description: 'Windy + Ventusky', hint: 'Clima operacional' },
    { id: 'settings', label: 'Configuracoes', shortLabel: 'Ajustes', icon: 'settings', description: 'Drone e parametros', hint: 'Configuracoes' }
  ];

  const legacyItems = [
    { id: 'drone', label: 'Drone', icon: 'drone', description: 'Painel antigo', hint: 'Abrir aba Drone existente' },
    { id: 'satellite', label: 'Satelite', icon: 'satellite', description: 'Modulo antigo', hint: 'Abrir aba Satelite existente' }
  ];

  const initialCenter = { lat: -30.3619, lng: -54.1169 };

  function makeDefaultGeometry() {
    return {
      type: 'rectangle',
      points: window.VentoUtils.flightCalculator.createRectangle(initialCenter, 520, 360)
    };
  }

  function PlanningPanel({ metrics, activeTool, geometry, mode }) {
    const steps = [
      geometry ? 'Area definida' : 'Defina uma area no mapa',
      metrics.flightLines.length ? 'Linhas automaticas geradas' : 'Aguardando linhas',
      metrics.photos ? `${metrics.photos} pontos de foto` : 'Fotos serao calculadas',
      mode === 'profissional' ? 'Modo profissional ativo' : 'Modo iniciante ativo'
    ];

    return (
      <section className="vp-fade-in space-y-4">
        <div className="vp-glass rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-200">Planejamento</p>
          <h2 className="mt-1 text-lg font-black text-white">Fluxo inteligente</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ferramenta ativa: <span className="font-bold text-slate-100">{activeTool}</span>. Clique no mapa para desenhar, adicionar waypoints ou posicionar GCPs.
          </p>
        </div>
        <div className="grid gap-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-400/[0.14] text-sm font-black text-sky-100">{index + 1}</span>
              <span className="text-sm font-semibold text-slate-200">{step}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <h3 className="font-black text-white">Parametros calculados</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.05] p-3"><span className="text-slate-500">Espacamento</span><strong className="block text-white">{metrics.spacingM.toFixed(1)} m</strong></div>
            <div className="rounded-xl bg-white/[0.05] p-3"><span className="text-slate-500">Rota</span><strong className="block text-white">{(metrics.routeMeters / 1000).toFixed(2)} km</strong></div>
            <div className="rounded-xl bg-white/[0.05] p-3"><span className="text-slate-500">Baterias</span><strong className="block text-white">{metrics.batteries}</strong></div>
            <div className="rounded-xl bg-white/[0.05] p-3"><span className="text-slate-500">Qualidade</span><strong className="block text-white">{metrics.quality}%</strong></div>
          </div>
        </div>
      </section>
    );
  }

  function LegacyPanel({ activeId }) {
    const slotRef = useRef(null);

    useEffect(() => {
      const node = document.getElementById(activeId);
      const slot = slotRef.current;
      if (!node || !slot) return undefined;
      slot.appendChild(node);
      node.classList.add('active');
      window.switchTab?.(activeId);
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 160);
      return () => {
        node.classList.remove('active');
        document.body.appendChild(node);
      };
    }, [activeId]);

    return (
      <section className="h-full min-h-screen bg-slate-950 p-3 lg:min-h-0 lg:overflow-auto lg:p-4 vp-scrollbar">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Modulo existente preservado</p>
            <h2 className="text-lg font-black text-white">{activeId === 'drone' ? 'Drone' : 'Satelite'}</h2>
          </div>
          <span className="rounded-full bg-emerald-400/[0.12] px-3 py-1.5 text-xs font-black text-emerald-100">Funcionando com scripts originais</span>
        </div>
        <div ref={slotRef} className="react-legacy-slot vp-glass min-h-[70vh] rounded-3xl p-2 lg:p-4"></div>
      </section>
    );
  }

  function App() {
    const [activeView, setActiveView] = useState('map');
    const [activeTool, setActiveTool] = useState('polygon');
    const [mode, setMode] = useState('iniciante');
    const [selectedDroneId, setSelectedDroneId] = useState(window.VentoData.drones?.[0]?.id || '');
    const [settings, setSettings] = useState({ overlap: 75, altitude: 90 });
    const [userLocation, setUserLocation] = useState(initialCenter);
    const [weather, setWeather] = useState(() => window.VentoUtils.weatherConfidence.buildWeatherComparison(initialCenter));
    const [mission, setMission] = useState(() => ({
      geometry: makeDefaultGeometry(),
      gcp: [],
      waypoints: []
    }));
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    useEffect(() => {
      const timer = window.setTimeout(() => {
        setWeather(window.VentoUtils.weatherConfidence.buildWeatherComparison(userLocation));
      }, 240);
      return () => window.clearTimeout(timer);
    }, [userLocation.lat, userLocation.lng]);

    const selectedDrone = useMemo(
      () => (window.VentoData.drones || []).find((drone) => drone.id === selectedDroneId) || window.VentoData.drones?.[0],
      [selectedDroneId]
    );

    const metrics = useMemo(() => window.VentoUtils.flightCalculator.calculateMission({
      geometry: mission.geometry,
      gcp: mission.gcp,
      waypoints: mission.waypoints,
      drone: selectedDrone,
      weather: weather?.comparison,
      overlap: settings.overlap
    }), [mission, selectedDrone, weather, settings.overlap]);

    const fullMission = useMemo(() => ({
      ...mission,
      metrics,
      settings,
      drone: selectedDrone,
      weather
    }), [mission, metrics, settings, selectedDrone, weather]);

    const commitMission = (updater) => {
      setMission((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        setHistory((items) => [...items.slice(-24), current]);
        setFuture([]);
        return next;
      });
    };

    const addGcp = (point, name) => {
      commitMission((current) => ({
        ...current,
        gcp: [...current.gcp, { id: `gcp-${Date.now()}-${current.gcp.length}`, name: name || `GCP ${current.gcp.length + 1}`, type: 'gcp', ...point }]
      }));
    };

    const addWaypoint = (point) => {
      commitMission((current) => ({
        ...current,
        waypoints: [...current.waypoints, { id: `wp-${Date.now()}-${current.waypoints.length}`, name: `WP ${current.waypoints.length + 1}`, type: 'waypoint', ...point }]
      }));
    };

    const setGeometryFromTool = (tool, point) => {
      const calculator = window.VentoUtils.flightCalculator;
      if (tool === 'rectangle') {
        commitMission((current) => ({ ...current, geometry: { type: 'rectangle', points: calculator.createRectangle(point, 520, 360) } }));
      } else if (tool === 'square') {
        commitMission((current) => ({ ...current, geometry: { type: 'square', points: calculator.createRectangle(point, 440, 440) } }));
      } else if (tool === 'circle') {
        commitMission((current) => ({ ...current, geometry: { type: 'circle', center: point, radiusM: 240 } }));
      }
    };

    const handleMapClick = (point) => {
      if (activeTool === 'gcp') return addGcp(point);
      if (activeTool === 'waypoint') return addWaypoint(point);
      if (activeTool === 'rectangle' || activeTool === 'square' || activeTool === 'circle') return setGeometryFromTool(activeTool, point);
      commitMission((current) => {
        const currentPoints = current.geometry?.type === 'polygon' ? current.geometry.points : [];
        return { ...current, geometry: { type: 'polygon', points: [...currentPoints, point] } };
      });
    };

    const handleContextAction = (action, point) => {
      if (action === 'gcp') return addGcp(point);
      if (action === 'waypoint') return addWaypoint(point);
      return setGeometryFromTool(action, point);
    };

    const undo = () => {
      setHistory((items) => {
        if (!items.length) return items;
        const previous = items[items.length - 1];
        setFuture((futureItems) => [mission, ...futureItems]);
        setMission(previous);
        return items.slice(0, -1);
      });
    };

    const redo = () => {
      setFuture((items) => {
        if (!items.length) return items;
        const [next, ...rest] = items;
        setHistory((historyItems) => [...historyItems, mission]);
        setMission(next);
        return rest;
      });
    };

    const updateGcp = (id, patch) => {
      commitMission((current) => ({
        ...current,
        gcp: current.gcp.map((point) => point.id === id ? { ...point, ...patch } : point)
      }));
    };

    const removeGcp = (id) => {
      commitMission((current) => ({ ...current, gcp: current.gcp.filter((point) => point.id !== id) }));
    };

    const importGcp = (points) => {
      if (!points.length) return;
      commitMission((current) => ({
        ...current,
        gcp: [...current.gcp, ...points.map((point, index) => ({ ...point, id: `${point.id || 'gcp-import'}-${Date.now()}-${index}` }))]
      }));
    };

    const addSuggestedGcp = () => {
      const points = window.VentoUtils.missionExport.suggestGcpPoints(mission.geometry);
      importGcp(points);
    };

    const exportGcp = (format) => {
      const exporter = window.VentoUtils.missionExport;
      if (format === 'csv') {
        exporter.downloadText('gcp-vento.csv', exporter.buildCsv(mission.gcp), 'text/csv');
      } else {
        exporter.downloadText('gcp-vento.json', JSON.stringify(mission.gcp, null, 2), 'application/json');
      }
    };

    const clearMission = () => {
      commitMission({ geometry: null, gcp: [], waypoints: [] });
    };

    const renderPanel = () => {
      if (activeView === 'gcp') {
        return (
          <GCPPanel
            gcp={mission.gcp}
            geometry={mission.geometry}
            onAddSuggested={addSuggestedGcp}
            onUpdateGcp={updateGcp}
            onRemoveGcp={removeGcp}
            onImportGcp={importGcp}
            onExportGcp={exportGcp}
          />
        );
      }
      if (activeView === 'weather') {
        return <WeatherPanel location={userLocation} weather={weather} onWeatherChange={setWeather} />;
      }
      if (activeView === 'apps') return <AppComparator />;
      if (activeView === 'settings') {
        return (
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            selectedDroneId={selectedDroneId}
            setSelectedDroneId={setSelectedDroneId}
          />
        );
      }
      return <PlanningPanel metrics={metrics} activeTool={activeTool} geometry={mission.geometry} mode={mode} />;
    };

    const isLegacy = activeView === 'drone' || activeView === 'satellite';

    return (
      <div className="vp-app-shell min-w-0">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          mainItems={mainItems}
          legacyItems={legacyItems}
          missionStatus={metrics.status}
        />

        <div className="vp-app-stage min-h-0 min-w-0 flex-1">
          {isLegacy ? (
            <LegacyPanel activeId={activeView} />
          ) : (
            <main className="vp-workspace grid min-h-screen min-w-0 gap-3 p-0 pb-24 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,390px)] lg:p-4 lg:pb-4">
              <div className="vp-map-column min-h-0 min-w-0">
                <MapPlanner
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  geometry={mission.geometry}
                  gcp={mission.gcp}
                  waypoints={mission.waypoints}
                  metrics={metrics}
                  userLocation={userLocation}
                  mode={mode}
                  setMode={setMode}
                  onMapClick={handleMapClick}
                  onUseLocation={setUserLocation}
                  onContextAction={handleContextAction}
                  onUpdateGcp={updateGcp}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={history.length > 0}
                  canRedo={future.length > 0}
                  onExport={(format) => window.VentoUtils.missionExport.exportMission(format, fullMission)}
                  onClear={clearMission}
                >
                  <MissionDashboard metrics={metrics} />
                </MapPlanner>
              </div>

              <aside className="vp-inspector-panel min-h-0 min-w-0 px-3 lg:h-full lg:overflow-x-hidden lg:overflow-y-auto lg:px-0 lg:pr-1 vp-scrollbar">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 lg:hidden">
                  <div>
                    <h1 className="font-black text-white">Vento Ultra Pro</h1>
                    <p className="text-xs text-slate-400">React + Tailwind</p>
                  </div>
                  <div className="flex gap-2">
                    {legacyItems.map((item) => (
                      <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200">
                        <Icon name={item.icon} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                {renderPanel()}
              </aside>
            </main>
          )}
        </div>

        <MobileNav activeView={activeView} onViewChange={setActiveView} items={mainItems} />
      </div>
    );
  }

  window.VentoReact.App = App;
})();
