window.VentoUtils = window.VentoUtils || {};

(function registerWeatherConfidence() {
  const CACHE_KEY = 'vento.react.weather.cache.v1';
  const CACHE_TTL_MS = 8 * 60 * 1000;

  function round(value, precision = 1) {
    const factor = 10 ** precision;
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function seededNoise(lat, lng, offset) {
    const raw = Math.sin((lat * 12.9898 + lng * 78.233 + offset) * 43758.5453);
    return raw - Math.floor(raw);
  }

  function getProviderWeather(location, provider) {
    const lat = Number(location?.lat || -30.3619);
    const lng = Number(location?.lng || location?.lon || -54.1169);
    const bias = provider === 'windy' ? 0.7 : -0.4;
    const windSeed = seededNoise(lat, lng, provider === 'windy' ? 3 : 9);
    const rainSeed = seededNoise(lat, lng, provider === 'windy' ? 13 : 21);
    const tempSeed = seededNoise(lat, lng, provider === 'windy' ? 5 : 17);

    return {
      provider,
      wind: round(8 + windSeed * 24 + bias, 1),
      gusts: round(16 + windSeed * 32 + bias * 1.6, 1),
      direction: Math.round((seededNoise(lat, lng, provider === 'windy' ? 31 : 37) * 360) / 5) * 5,
      temperature: round(17 + tempSeed * 16 + bias * 0.6, 1),
      rain: Math.round(rainSeed * 80 + (windSeed > 0.72 ? 12 : 0)),
      clouds: Math.round(18 + rainSeed * 76),
      visibility: round(Math.max(1.5, 18 - rainSeed * 11 - windSeed * 2), 1)
    };
  }

  function compareMetric(a, b, limits) {
    const diff = Math.abs(Number(a || 0) - Number(b || 0));
    if (diff <= limits.high) return { diff, score: 100, level: 'alta' };
    if (diff <= limits.medium) return { diff, score: 68, level: 'media' };
    return { diff, score: 34, level: 'baixa' };
  }

  function buildComparison(windy, ventusky) {
    const metrics = {
      wind: compareMetric(windy.wind, ventusky.wind, { high: 4, medium: 10 }),
      gusts: compareMetric(windy.gusts, ventusky.gusts, { high: 6, medium: 14 }),
      temperature: compareMetric(windy.temperature, ventusky.temperature, { high: 2, medium: 5 }),
      rain: compareMetric(windy.rain, ventusky.rain, { high: 14, medium: 34 }),
      clouds: compareMetric(windy.clouds, ventusky.clouds, { high: 18, medium: 42 }),
      visibility: compareMetric(windy.visibility, ventusky.visibility, { high: 3, medium: 7 })
    };
    const score = Math.round(Object.values(metrics).reduce((sum, metric) => sum + metric.score, 0) / Object.keys(metrics).length);
    const confidence = score >= 82 ? 'alta' : score >= 58 ? 'media' : 'baixa';
    const averageWind = (windy.wind + ventusky.wind) / 2;
    const averageGusts = (windy.gusts + ventusky.gusts) / 2;
    const averageRain = (windy.rain + ventusky.rain) / 2;
    const averageVisibility = (windy.visibility + ventusky.visibility) / 2;
    const safetyScore = Math.max(0, Math.min(100, Math.round(
      100
      - Math.max(0, averageWind - 16) * 2.2
      - Math.max(0, averageGusts - 28) * 1.45
      - averageRain * 0.36
      - Math.max(0, 8 - averageVisibility) * 5
      - (confidence === 'baixa' ? 16 : confidence === 'media' ? 7 : 0)
    )));
    const condition = safetyScore >= 74 ? 'Seguro' : safetyScore >= 50 ? 'Moderado' : 'Perigoso';
    const divergence = confidence === 'alta'
      ? 'Windy e Ventusky estao convergentes para voo.'
      : confidence === 'media'
        ? 'Ha diferencas operacionais moderadas entre as fontes.'
        : 'As fontes divergem de forma relevante. Reavalie antes do voo.';
    const recommendation = condition === 'Seguro'
      ? 'Janela favoravel. Mantenha checagem de rajadas e bateria reserva.'
      : condition === 'Moderado'
        ? 'Voe com area reduzida, altitude conservadora e plano de retorno curto.'
        : 'Adie a missao ou aguarde nova janela meteorologica.';

    return {
      metrics,
      score,
      confidence,
      flightIndex: safetyScore,
      condition,
      divergence,
      recommendation
    };
  }

  function readCache(location) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || Date.now() - cached.createdAt > CACHE_TTL_MS) return null;
      const lat = Number(location?.lat || 0).toFixed(3);
      const lng = Number(location?.lng || location?.lon || 0).toFixed(3);
      if (cached.lat !== lat || cached.lng !== lng) return null;
      return cached.payload;
    } catch (error) {
      return null;
    }
  }

  function writeCache(location, payload) {
    try {
      const lat = Number(location?.lat || 0).toFixed(3);
      const lng = Number(location?.lng || location?.lon || 0).toFixed(3);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, payload, createdAt: Date.now() }));
    } catch (error) {
      // Cache is optional in private or restricted browser modes.
    }
  }

  function buildWeatherComparison(location, force = false) {
    if (!force) {
      const cached = readCache(location);
      if (cached) return { ...cached, cached: true };
    }
    const windy = getProviderWeather(location, 'windy');
    const ventusky = getProviderWeather(location, 'ventusky');
    const comparison = buildComparison(windy, ventusky);
    const payload = { windy, ventusky, comparison, cached: false, updatedAt: new Date().toISOString() };
    writeCache(location, payload);
    return payload;
  }

  window.VentoUtils.weatherConfidence = {
    buildWeatherComparison,
    buildComparison,
    getProviderWeather
  };
})();
