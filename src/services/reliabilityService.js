(() => {
  'use strict';

  const root = window.SkyDroneServices = window.SkyDroneServices || {};
  const FIVE_MINUTES = 5 * 60 * 1000;
  const TEN_MINUTES = 10 * 60 * 1000;
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  function parseTime(value) {
    const timestamp = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function getGeneratedAt(data, bundle) {
    return parseTime(bundle?.generatedAt)
      || parseTime(data?.generated_at)
      || parseTime(data?.generatedAt)
      || parseTime(data?.updatedAt)
      || parseTime(data?.last_updated)
      || parseTime(data?.time)
      || Date.now();
  }

  function hasProviderSignal(run) {
    if (!run?.current || typeof run.current !== 'object') return false;
    const signalFields = ['temperature', 'humidity', 'pressure', 'windSpeed', 'visibilityKm', 'rainProbability', 'cloudCover'];
    return signalFields.some((field) => Number.isFinite(run.current?.[field]))
      || (Array.isArray(run.hourly) && run.hourly.length > 0)
      || (Array.isArray(run.daily) && run.daily.length > 0);
  }

  function getSuccessfulProviders(providerRuns) {
    return (Array.isArray(providerRuns) ? providerRuns : [])
      .filter((run) => run && run.success === true && run.status !== 'loading' && !run.hidden && hasProviderSignal(run));
  }

  function isRealProvider(run) {
    return run
      && run.type !== 'demo'
      && run.type !== 'cache'
      && run.providerKey !== 'demoWeather'
      && run.providerKey !== 'savedCache';
  }

  function getRealProviders(providerRuns) {
    return getSuccessfulProviders(providerRuns).filter(isRealProvider);
  }

  function hasPartialApiFailure(providerRuns) {
    return (Array.isArray(providerRuns) ? providerRuns : [])
      .some((run) => run && run.status !== 'loading' && run.success === false);
  }

  function isDemoData(data, providerRuns) {
    if (data?.demo || data?.is_demo) return true;

    const visibleRuns = (Array.isArray(providerRuns) ? providerRuns : [])
      .filter((run) => run && !run.hidden && run.status !== 'loading');
    if (!visibleRuns.length) {
      const source = String(data?.sources_used || data?.source || '').toLowerCase();
      return source.includes('demo');
    }

    return visibleRuns.every((run) => run.type === 'demo' || run.providerKey === 'demoWeather');
  }

  function getBaseScore({ cacheInfo, ageMs, demo, realSourceCount, coherentComparison }) {
    if (demo) {
      return { score: 45, cap: 45, reason: 'demo' };
    }

    if (cacheInfo?.used) {
      if (ageMs <= FIVE_MINUTES) return { score: 75, cap: 75, reason: 'cache_fresh' };
      if (ageMs <= FIFTEEN_MINUTES) return { score: 72, cap: 75, reason: 'cache_recent' };
      if (ageMs <= THIRTY_MINUTES) return { score: 68, cap: 75, reason: 'cache_recent' };
      if (ageMs <= TWO_HOURS) return { score: 62, cap: 68, reason: 'cache_warm' };
      return { score: 55, cap: 65, reason: 'cache_old' };
    }

    if (realSourceCount >= 3) {
      return coherentComparison
        ? { score: 96, cap: 98, reason: 'three_models_agree' }
        : { score: 88, cap: 92, reason: 'three_models_vary' };
    }

    if (realSourceCount === 2) {
      return coherentComparison
        ? { score: 91, cap: 94, reason: 'two_models_agree' }
        : { score: 82, cap: 88, reason: 'two_models_vary' };
    }

    if (realSourceCount === 1) {
      return { score: ageMs <= THIRTY_MINUTES ? 82 : 76, cap: 85, reason: 'one_real_source' };
    }

    return { score: 45, cap: 45, reason: 'no_real_source' };
  }

  function getMissingPenalty(validation) {
    const missing = new Set(validation?.missing || []);
    const warnings = new Set(validation?.warnings || []);
    const windMissing = missing.has('windSpeed') || warnings.has('wind_missing');
    const rainMissing = (missing.has('precipitation') && missing.has('rainProbability')) || warnings.has('rain_missing');
    return windMissing || rainMissing ? 15 : 0;
  }

  function getProviderAgeMs(run) {
    const timestamp = parseTime(run?.current?.time)
      || parseTime(run?.fetchedAt)
      || Date.now();
    return Math.max(0, Date.now() - timestamp);
  }

  function getProviderDataQualityScore(run) {
    const current = run?.current || {};
    const fields = [
      'temperature',
      'feelsLike',
      'humidity',
      'pressure',
      'windSpeed',
      'windDirection',
      'windGusts',
      'precipitation',
      'rainProbability',
      'cloudCover',
      'visibilityKm'
    ];
    const currentCoverage = fields.filter((field) => Number.isFinite(Number(current[field]))).length / fields.length;
    const hourlyCoverage = Math.min(1, (run?.hourly?.length || 0) / 24);
    const dailyCoverage = Math.min(1, (run?.daily?.length || 0) / 3);
    return clamp(currentCoverage * 0.62 + hourlyCoverage * 0.22 + dailyCoverage * 0.16, 0, 1);
  }

  function getStationDistanceAdjustment(distanceKm) {
    if (!Number.isFinite(distanceKm)) return -2;
    if (distanceKm <= 20) return 4;
    if (distanceKm <= 50) return 2;
    if (distanceKm <= 100) return -1;
    if (distanceKm <= 150) return -4;
    return -8;
  }

  function getStationMethodAdjustment(method) {
    if (method === 'nearest') return 2;
    if (method === 'blend') return 1;
    if (method === 'fallback-point') return -3;
    if (method === 'global-model') return -5;
    return 0;
  }

  function getStationRecencyAdjustment(ageMs) {
    if (ageMs <= THIRTY_MINUTES) return 2;
    if (ageMs <= TWO_HOURS) return 0;
    if (ageMs <= SIX_HOURS) return -5;
    return -10;
  }

  function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Number.isFinite(value) ? Math.round(value * factor) / factor : null;
  }

  function getStationQuality(providerRuns) {
    const entries = (Array.isArray(providerRuns) ? providerRuns : [])
      .filter((run) => run?.stationSelection)
      .map((run) => {
        const selection = run.stationSelection || {};
        const station = Array.isArray(selection.stations) ? selection.stations[0] : null;
        const distanceKm = toNumber(
          station?.distanceKm,
          toNumber(selection.primaryDistanceKm, null)
        );
        const ageMs = getProviderAgeMs(run);
        const dataQuality = getProviderDataQualityScore(run);
        const latencyMs = toNumber(
          station?.latencyMs,
          toNumber(selection.latencyMs, toNumber(run.latencyMs, null))
        );
        const apiStatus = station?.apiStatus || selection.apiStatus || run.apiStatus || '';
        const latencyAdjustment = !Number.isFinite(latencyMs)
          ? -1
          : latencyMs <= 700
            ? 2
            : latencyMs <= 1600
              ? 0
              : -5;
        const availabilityAdjustment = apiStatus === 'online'
          ? 2
          : apiStatus === 'degraded-latency'
            ? -4
            : apiStatus === 'cache-fallback'
              ? -5
              : apiStatus === 'offline-controlled'
                ? -12
                : 0;
        const adjustment = getStationDistanceAdjustment(distanceKm)
          + getStationRecencyAdjustment(ageMs)
          + getStationMethodAdjustment(selection.method)
          + latencyAdjustment
          + availabilityAdjustment
          + (dataQuality - 0.72) * 6;

        return {
          providerKey: run.providerKey,
          label: run.label || selection.label || run.providerKey || 'Fonte',
          stationName: station?.name || station?.id || '',
          sourceKey: selection.sourceKey || '',
          method: selection.method || '',
          distanceKm,
          latencyMs,
          apiStatus,
          ageMs,
          dataQuality,
          adjustment
        };
      });

    if (!entries.length) {
      return {
        available: false,
        adjustment: 0
      };
    }

    const best = entries
      .slice()
      .sort((a, b) => b.adjustment - a.adjustment)[0];
    const averageAdjustment = entries.reduce((total, entry) => total + entry.adjustment, 0) / entries.length;
    const adjustment = clamp(Math.round((best.adjustment * 0.65) + (averageAdjustment * 0.35)), -12, 7);
    const distanceText = Number.isFinite(best.distanceKm) ? `${round(best.distanceKm, 1)} km` : 'distancia indefinida';
    const latencyText = Number.isFinite(best.latencyMs) ? `, ${Math.round(best.latencyMs)}ms` : '';
    const statusText = best.apiStatus ? `, ${best.apiStatus}` : '';
    const freshnessText = best.ageMs <= THIRTY_MINUTES
      ? 'leitura recente'
      : best.ageMs <= TWO_HOURS
        ? 'leitura aceitavel'
        : 'leitura antiga';

    return {
      available: true,
      adjustment,
      best,
      entries,
      summary: `Base ${best.stationName || best.label} a ${distanceText}${latencyText}${statusText}, ${freshnessText}.`
    };
  }

  function getLabel(score) {
    if (score > 90) return 'Alta precisao';
    if (score >= 75) return 'Boa';
    if (score >= 60) return 'Media';
    return 'Baixa';
  }

  function buildNote(reliability) {
    const ignoredCount = reliability.sourceComparison?.ignoredSourceCount || 0;
    const ignoredText = ignoredCount
      ? ` ${ignoredCount} modelo${ignoredCount === 1 ? '' : 's'} ignorado${ignoredCount === 1 ? '' : 's'} por inconsistência.`
      : '';
    const stationText = reliability.stationQuality?.summary
      ? ` ${reliability.stationQuality.summary}`
      : '';

    if (reliability.fromCache) {
      return `Confiabilidade: ${reliability.score}% usando ultimo dado valido salvo e cache inteligente.`;
    }
    if (reliability.isDemo) {
      return `Confiabilidade: ${reliability.score}% em modo demo, limitada por nao ser dado real.`;
    }
    if (reliability.sourceComparison?.available && reliability.sourceComparison.coherent) {
      return `Confiabilidade: ${reliability.score}% com ${reliability.realSourceCount || 2} modelos coerentes e dados recentes.${stationText}${ignoredText}`;
    }
    if (reliability.sourceComparison?.available && !reliability.sourceComparison.coherent) {
      return ignoredCount
        ? `Confiabilidade: ${reliability.score}% com fonte inconsistente isolada.${stationText}${ignoredText}`
        : `Confiabilidade: ${reliability.score}% com variacao relevante entre fontes.${stationText}`;
    }
    return `Confiabilidade: ${reliability.score}% com dados reais recentes e validacao automatica.${stationText}`;
  }

  function calculateReliability(input = {}) {
    const data = input.data || input.bundle?.current || {};
    const bundle = input.bundle || data.bundle || null;
    const providerRuns = input.providerRuns || bundle?.providers || [];
    const cacheInfo = input.cacheInfo || {};
    const validation = input.validation || root.dataValidator?.validateCurrent?.(data) || { missing: [], warnings: [] };
    const sourceComparison = input.sourceComparison || root.dataValidator?.compareSources?.(providerRuns) || { available: false };
    const generatedAt = getGeneratedAt(data, bundle);
    const cacheAge = Number(cacheInfo.ageMs);
    const ageMs = cacheInfo.used && Number.isFinite(cacheAge)
      ? Math.max(0, cacheAge)
      : Math.max(0, Date.now() - generatedAt);
    const successfulProviders = getSuccessfulProviders(providerRuns);
    const realProviders = getRealProviders(providerRuns);
    const stationQuality = getStationQuality(realProviders);
    const demo = isDemoData(data, providerRuns);
    const coherentComparison = Boolean(sourceComparison.available && sourceComparison.coherent);
    const base = getBaseScore({
      cacheInfo,
      ageMs,
      demo,
      realSourceCount: realProviders.length,
      coherentComparison
    });
    const reasons = [base.reason];

    let score = base.score;

    if (!cacheInfo.used && ageMs <= FIVE_MINUTES) {
      score += 4;
      reasons.push('fresh_under_5m');
    } else if (!cacheInfo.used && ageMs <= FIFTEEN_MINUTES) {
      score += 2;
      reasons.push('fresh_under_15m');
    }

    if (sourceComparison.available && sourceComparison.coherent && realProviders.length >= 2) {
      score += realProviders.length >= 3 ? 4 : 3;
      reasons.push('multi_source_match');
    }

    if (sourceComparison.available && !sourceComparison.coherent) {
      const ignoredCount = sourceComparison.ignoredSourceCount || 0;
      const penalty = ignoredCount
        ? 3
        : sourceComparison.severeDivergence
          ? 12
          : 5;
      score -= penalty;
      reasons.push('source_variation');
    }

    if (cacheInfo.apiFailed || hasPartialApiFailure(providerRuns)) {
      const partialFailurePenalty = realProviders.length >= 3 && coherentComparison
        ? 2
        : realProviders.length >= 2
          ? 4
          : 10;
      score -= partialFailurePenalty;
      reasons.push('partial_api_failure');
    }

    const missingPenalty = getMissingPenalty(validation);
    if (missingPenalty) {
      score -= missingPenalty;
      reasons.push('missing_wind_or_rain');
    }

    if (stationQuality.available) {
      score += stationQuality.adjustment;
      reasons.push(stationQuality.adjustment >= 0 ? 'station_quality_bonus' : 'station_quality_penalty');
    }

    if (ageMs > SIX_HOURS || cacheInfo.veryOld) {
      score -= 20;
      reasons.push('old_data');
    } else if (ageMs > TWO_HOURS) {
      score -= 12;
      reasons.push('warm_data');
    } else if (ageMs > THIRTY_MINUTES) {
      score -= 6;
      reasons.push('older_than_30m');
    }

    if (!successfulProviders.length && !cacheInfo.used) {
      score = Math.min(score, 45);
      reasons.push('no_live_source');
    }

    const capped = clamp(Math.round(score), 0, Math.min(base.cap, 98));

    return {
      score: capped,
      label: getLabel(capped),
      ageMs,
      generatedAt: new Date(generatedAt).toISOString(),
      isDemo: demo,
      fromCache: Boolean(cacheInfo.used),
      realSourceCount: realProviders.length,
      reasons,
      validation,
      stationQuality,
      sourceComparison
    };
  }

  function applyToBundle(bundle, providerRuns = [], cacheInfo = {}) {
    if (!bundle?.current) return bundle;

    const validation = root.dataValidator?.validateCurrent?.(bundle.current);
    const sourceComparison = root.dataValidator?.compareSources?.(providerRuns.length ? providerRuns : bundle.providers);
    const reliability = calculateReliability({
      bundle,
      data: bundle.current,
      providerRuns,
      cacheInfo,
      validation,
      sourceComparison
    });

    const analytics = {
      ...(bundle.analytics || {}),
      confidence: reliability.score,
      confidenceLabel: reliability.label,
      confidenceNote: buildNote(reliability),
      reliability,
      sourceComparison: reliability.sourceComparison
    };

    const current = {
      ...bundle.current,
      confidence: reliability.score
    };

    return {
      ...bundle,
      current,
      analytics,
      hourly: (Array.isArray(bundle.hourly) ? bundle.hourly : []).map((entry) => ({
        ...entry,
        confidence: Math.min(reliability.score, Number.isFinite(entry.confidence) ? entry.confidence : reliability.score)
      })),
      daily: (Array.isArray(bundle.daily) ? bundle.daily : []).map((entry) => ({
        ...entry,
        confidence: Math.min(reliability.score, Number.isFinite(entry.confidence) ? entry.confidence : reliability.score)
      }))
    };
  }

  function adjustLegacyData(data, bundle = null, providerRuns = [], cacheInfo = {}) {
    if (!data) return data;
    const reliability = calculateReliability({
      data,
      bundle,
      providerRuns,
      cacheInfo
    });

    return {
      ...data,
      reliability: reliability.score,
      reliability_label: reliability.label,
      reliability_detail: reliability,
      generated_at: data.generated_at || reliability.generatedAt,
      cached: Boolean(cacheInfo.used || data.cached),
      cache_stale: Boolean(cacheInfo.stale || data.cache_stale),
      cache_age_ms: Number.isFinite(Number(cacheInfo.ageMs)) ? Number(cacheInfo.ageMs) : (data.cache_age_ms || reliability.ageMs)
    };
  }

  root.reliabilityService = {
    calculateReliability,
    applyToBundle,
    adjustLegacyData,
    getLabel
  };
})();
