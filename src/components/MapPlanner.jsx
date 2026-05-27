window.VentoReact = window.VentoReact || {};

(function registerMapPlanner() {
  const { useEffect, useMemo, useRef, useState } = React;
  const Icon = window.VentoReact.Icon;

  const tools = [
    { id: 'polygon', label: 'Poligono', icon: 'map' },
    { id: 'rectangle', label: 'Retangulo', icon: 'plan' },
    { id: 'square', label: 'Quadrado', icon: 'plan' },
    { id: 'circle', label: 'Circulo', icon: 'locate' },
    { id: 'waypoint', label: 'Waypoint', icon: 'plus' },
    { id: 'gcp', label: 'GCP', icon: 'gcp' }
  ];

  function ToolButton({ tool, active, onClick }) {
    return (
      <button
        type="button"
        title={tool.label}
        onClick={onClick}
        className={[
          'grid h-11 w-11 place-items-center rounded-xl border text-sm transition-all duration-200',
          active ? 'border-sky-300/50 bg-sky-400/20 text-white' : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-sky-300/40 hover:text-white'
        ].join(' ')}
      >
        <Icon name={tool.icon} className="h-4 w-4" />
      </button>
    );
  }

  function ExportButton({ format, onExport }) {
    return (
      <button
        type="button"
        onClick={() => onExport(format)}
        className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/[0.15] hover:text-white"
      >
        {format}
      </button>
    );
  }

  function createDivIcon(className, label) {
    return L.divIcon({
      className: '',
      html: `<div class="vp-map-marker ${className || ''}">${label}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  function MapPlanner({
    activeTool,
    setActiveTool,
    geometry,
    gcp,
    waypoints,
    metrics,
    userLocation,
    mode,
    setMode,
    onMapClick,
    onUseLocation,
    onContextAction,
    onUpdateGcp,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onExport,
    onClear,
    children
  }) {
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const latestRef = useRef({});
    const [contextMenu, setContextMenu] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    latestRef.current = { onMapClick, onContextAction };

    useEffect(() => {
      if (!window.L || mapRef.current) return;
      const map = L.map('react-planner-map', {
        zoomControl: false,
        preferCanvas: true,
        scrollWheelZoom: true,
        tap: true
      }).setView([userLocation?.lat || -30.3619, userLocation?.lng || -54.1169], 14);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('click', (event) => {
        setContextMenu(null);
        latestRef.current.onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      map.on('contextmenu', (event) => {
        const point = map.mouseEventToContainerPoint(event.originalEvent);
        setContextMenu({
          x: point.x,
          y: point.y,
          latlng: { lat: event.latlng.lat, lng: event.latlng.lng }
        });
      });

      setMapReady(true);
      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      const group = layerRef.current;
      if (!map || !group || !window.L) return;
      group.clearLayers();

      const calculator = window.VentoUtils.flightCalculator;
      const geometryPoints = calculator.getGeometryPoints(geometry);
      if (geometry?.type === 'circle' && geometry.center) {
        L.circle([geometry.center.lat, geometry.center.lng], {
          radius: geometry.radiusM,
          color: '#38bdf8',
          weight: 2,
          fillColor: '#38bdf8',
          fillOpacity: 0.12
        }).bindTooltip('Area circular da missao').addTo(group);
      } else if (geometryPoints.length >= 2) {
        L.polygon(geometryPoints.map((point) => [point.lat, point.lng]), {
          color: '#38bdf8',
          weight: 2,
          fillColor: '#38bdf8',
          fillOpacity: 0.12
        }).bindTooltip('Area planejada').addTo(group);
      } else if (geometryPoints.length === 1) {
        L.marker([geometryPoints[0].lat, geometryPoints[0].lng], { icon: createDivIcon('', 'A') }).bindTooltip('Primeiro ponto do poligono').addTo(group);
      }

      (metrics.flightLines || []).forEach((line, index) => {
        L.polyline(line.map((point) => [point.lat, point.lng]), {
          color: index % 2 === 0 ? '#22c55e' : '#14b8a6',
          weight: 1.6,
          opacity: 0.72,
          dashArray: index % 2 === 0 ? '' : '5 7'
        }).bindTooltip(`Linha de voo ${index + 1}`).addTo(group);
      });

      (metrics.photoPoints || []).filter((_, index) => index % Math.max(1, Math.ceil((metrics.photoPoints || []).length / 240)) === 0).forEach((point, index) => {
        L.circleMarker([point.lat, point.lng], {
          radius: 3,
          color: '#fbbf24',
          fillColor: '#f59e0b',
          fillOpacity: 0.82,
          weight: 1
        }).bindTooltip(`Foto ${index + 1}`).addTo(group);
      });

      (waypoints || []).forEach((point, index) => {
        L.marker([point.lat, point.lng], { icon: createDivIcon('', index + 1) })
          .bindTooltip(point.name || `Waypoint ${index + 1}`)
          .addTo(group);
      });

      (gcp || []).forEach((point, index) => {
        const marker = L.marker([point.lat, point.lng], {
          icon: createDivIcon('gcp', 'G'),
          draggable: true
        }).bindTooltip(point.name || `GCP ${index + 1}`);
        marker.on('dragend', (event) => {
          const next = event.target.getLatLng();
          onUpdateGcp?.(point.id, { lat: next.lat, lng: next.lng });
        });
        marker.addTo(group);
      });

      if (userLocation) {
        L.marker([userLocation.lat, userLocation.lng], { icon: createDivIcon('home', 'EU') })
          .bindTooltip('Localizacao atual')
          .addTo(group);
      }
    }, [geometry, gcp, waypoints, metrics, userLocation, onUpdateGcp]);

    const centerAll = () => {
      const map = mapRef.current;
      if (!map) return;
      const calculator = window.VentoUtils.flightCalculator;
      const points = [
        ...calculator.getGeometryPoints(geometry),
        ...(gcp || []),
        ...(waypoints || []),
        ...(userLocation ? [userLocation] : [])
      ];
      if (!points.length) {
        map.setView([-30.3619, -54.1169], 14);
        return;
      }
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
      map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: 17 });
    };

    const useCurrentLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        onUseLocation(next);
        mapRef.current?.setView([next.lat, next.lng], 16, { animate: true });
      });
    };

    const contextActions = useMemo(() => ([
      { id: 'waypoint', label: 'Adicionar waypoint' },
      { id: 'gcp', label: 'Adicionar GCP' },
      { id: 'rectangle', label: 'Criar retangulo aqui' },
      { id: 'circle', label: 'Criar circulo aqui' }
    ]), []);

    if (!window.L) {
      return (
        <div className="grid min-h-[560px] place-items-center rounded-3xl border border-white/10 bg-slate-950/70">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl vp-skeleton"></div>
            <p className="font-bold text-white">Carregando motor do mapa...</p>
            <p className="mt-2 text-sm text-slate-400">Leaflet sera iniciado assim que a biblioteca estiver disponivel.</p>
          </div>
        </div>
      );
    }

    return (
      <section className="vp-map-shell relative min-h-0 min-w-0 overflow-hidden rounded-none bg-slate-950 lg:h-full lg:rounded-3xl lg:border lg:border-white/10">
        <div id="react-planner-map" className="react-planner-map"></div>

        {!mapReady ? (
          <div className="absolute inset-0 z-[450] grid place-items-center bg-slate-950/40 backdrop-blur-sm">
            <div className="h-20 w-56 rounded-2xl vp-skeleton"></div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-[500] p-3 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto vp-glass rounded-2xl p-2">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {tools.map((tool) => (
                  <ToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
                ))}
              </div>
            </div>

            <div className="pointer-events-auto hidden gap-2 rounded-2xl vp-glass p-2 md:flex">
              {['kml', 'kmz', 'gpx', 'csv', 'json'].map((format) => (
                <ExportButton key={format} format={format} onExport={onExport} />
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="pointer-events-auto flex flex-wrap gap-2 rounded-2xl vp-glass p-2">
              <button type="button" onClick={centerAll} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-sm font-bold text-white transition hover:bg-white/[0.14]" title="Centralizar tudo">
                <Icon name="locate" className="h-4 w-4" /> Centralizar
              </button>
              <button type="button" onClick={useCurrentLocation} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-sm font-bold text-white transition hover:bg-white/[0.14]" title="Usar minha localizacao">
                <Icon name="locate" className="h-4 w-4" /> Minha posicao
              </button>
              <button type="button" onClick={onUndo} disabled={!canUndo} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40" title="Desfazer">
                <Icon name="undo" className="h-4 w-4" />
              </button>
              <button type="button" onClick={onRedo} disabled={!canRedo} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40" title="Refazer">
                <Icon name="redo" className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClear} className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/[0.12] text-rose-100 transition hover:bg-rose-400/20" title="Limpar missao">
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>

            <div className="pointer-events-auto flex rounded-2xl vp-glass p-1">
              {['iniciante', 'profissional'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={[
                    'rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition',
                    mode === item ? 'bg-sky-400/20 text-white' : 'text-slate-400 hover:text-white'
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            {children}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-[510] flex flex-wrap gap-2 md:hidden">
          {['kml', 'gpx', 'csv', 'json'].map((format) => (
            <ExportButton key={format} format={format} onExport={onExport} />
          ))}
        </div>

        {contextMenu ? (
          <div
            className="absolute z-[900] w-56 rounded-2xl border border-white/[0.12] bg-slate-950/[0.92] p-2 shadow-2xl shadow-slate-950/50 backdrop-blur-xl"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 250), top: Math.max(12, contextMenu.y) }}
          >
            <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">Clique direito</p>
            {contextActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  onContextAction(action.id, contextMenu.latlng);
                  setContextMenu(null);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-sky-400/[0.14] hover:text-white"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  window.VentoReact.MapPlanner = MapPlanner;
})();
