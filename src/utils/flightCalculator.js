window.VentoUtils = window.VentoUtils || {};

(function registerFlightCalculator() {
  const EARTH_RADIUS_M = 6371000;

  function toRad(value) {
    return Number(value || 0) * Math.PI / 180;
  }

  function metersPerDegreeLat() {
    return 111320;
  }

  function metersPerDegreeLng(lat) {
    return 111320 * Math.cos(toRad(lat || 0));
  }

  function haversineMeters(a, b) {
    if (!a || !b) return 0;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const value = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(value));
  }

  function getBounds(points) {
    const list = (points || []).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (!list.length) return null;
    return list.reduce((bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.lat),
      maxLat: Math.max(bounds.maxLat, point.lat),
      minLng: Math.min(bounds.minLng, point.lng),
      maxLng: Math.max(bounds.maxLng, point.lng)
    }), {
      minLat: list[0].lat,
      maxLat: list[0].lat,
      minLng: list[0].lng,
      maxLng: list[0].lng
    });
  }

  function getGeometryPoints(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'circle') {
      const center = geometry.center;
      const radius = Number(geometry.radiusM || 0);
      if (!center || radius <= 0) return [];
      const latStep = radius / metersPerDegreeLat();
      const lngStep = radius / metersPerDegreeLng(center.lat);
      return [
        { lat: center.lat - latStep, lng: center.lng - lngStep },
        { lat: center.lat - latStep, lng: center.lng + lngStep },
        { lat: center.lat + latStep, lng: center.lng + lngStep },
        { lat: center.lat + latStep, lng: center.lng - lngStep }
      ];
    }
    return geometry.points || [];
  }

  function polygonAreaM2(points) {
    const list = (points || []).filter(Boolean);
    if (list.length < 3) return 0;
    const origin = list[0];
    const projected = list.map((point) => ({
      x: (point.lng - origin.lng) * metersPerDegreeLng(origin.lat),
      y: (point.lat - origin.lat) * metersPerDegreeLat()
    }));
    const sum = projected.reduce((total, point, index) => {
      const next = projected[(index + 1) % projected.length];
      return total + point.x * next.y - next.x * point.y;
    }, 0);
    return Math.abs(sum / 2);
  }

  function geometryAreaM2(geometry) {
    if (!geometry) return 0;
    if (geometry.type === 'circle') {
      return Math.PI * Number(geometry.radiusM || 0) ** 2;
    }
    return polygonAreaM2(getGeometryPoints(geometry));
  }

  function centerOfPoints(points) {
    const list = (points || []).filter(Boolean);
    if (!list.length) return { lat: -30.3619, lng: -54.1169 };
    return {
      lat: list.reduce((sum, point) => sum + point.lat, 0) / list.length,
      lng: list.reduce((sum, point) => sum + point.lng, 0) / list.length
    };
  }

  function createRectangle(center, widthM, heightM) {
    const latStep = (heightM / 2) / metersPerDegreeLat();
    const lngStep = (widthM / 2) / metersPerDegreeLng(center.lat);
    return [
      { lat: center.lat - latStep, lng: center.lng - lngStep },
      { lat: center.lat - latStep, lng: center.lng + lngStep },
      { lat: center.lat + latStep, lng: center.lng + lngStep },
      { lat: center.lat + latStep, lng: center.lng - lngStep }
    ];
  }

  function createFlightLines(geometry, spacingM) {
    const points = getGeometryPoints(geometry);
    const bounds = getBounds(points);
    if (!bounds) return [];
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const lngStep = spacingM / metersPerDegreeLng(centerLat);
    const lines = [];
    let lng = bounds.minLng;
    let index = 0;
    while (lng <= bounds.maxLng + lngStep / 2 && lines.length < 80) {
      const from = { lat: bounds.minLat, lng };
      const to = { lat: bounds.maxLat, lng };
      lines.push(index % 2 === 0 ? [from, to] : [to, from]);
      lng += lngStep;
      index += 1;
    }
    return lines;
  }

  function createPhotoPoints(lines, spacingM) {
    const photos = [];
    lines.forEach((line) => {
      const [start, end] = line;
      const distance = haversineMeters(start, end);
      const steps = Math.max(1, Math.floor(distance / spacingM));
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps;
        photos.push({
          lat: start.lat + (end.lat - start.lat) * ratio,
          lng: start.lng + (end.lng - start.lng) * ratio
        });
      }
    });
    return photos.slice(0, 900);
  }

  function calculateMission({ geometry, gcp = [], waypoints = [], drone, weather, overlap = 75 }) {
    const selectedDrone = drone || window.VentoData?.drones?.[0] || {};
    const areaM2 = geometryAreaM2(geometry);
    const areaHa = areaM2 / 10000;
    const spacingM = Math.max(18, Number(selectedDrone.footprintM || 34) * (1 - Number(overlap || 75) / 100));
    const flightLines = geometry ? createFlightLines(geometry, spacingM) : [];
    const photoPoints = createPhotoPoints(flightLines, Math.max(16, spacingM * 1.2));
    const routeMeters = flightLines.reduce((sum, line) => sum + haversineMeters(line[0], line[1]), 0)
      + Math.max(0, waypoints.length - 1) * 80;
    const speedMps = Math.max(4, Number(selectedDrone.cruiseSpeedKmh || 34) / 3.6);
    const flightMinutes = routeMeters > 0 ? Math.ceil(routeMeters / speedMps / 60 + 4) : 0;
    const reserve = Number(selectedDrone.batteryReserve || 0.22);
    const usableBattery = Math.max(12, Number(selectedDrone.enduranceMin || 28) * (1 - reserve));
    const batteries = flightMinutes > 0 ? Math.max(1, Math.ceil(flightMinutes / usableBattery)) : 0;
    const weatherPenalty = weather?.flightIndex ? Math.max(0, 100 - weather.flightIndex) * 0.35 : 8;
    const gcpBonus = Math.min(10, gcp.length * 1.7);
    const areaPenalty = areaHa > 120 ? 10 : areaHa > 60 ? 5 : 0;
    const quality = Math.max(0, Math.min(100, Math.round(78 + gcpBonus - weatherPenalty - areaPenalty)));
    const status = quality >= 78 ? 'Seguro' : quality >= 55 ? 'Moderado' : 'Perigoso';

    return {
      areaHa,
      routeMeters,
      flightMinutes,
      photos: photoPoints.length,
      batteries,
      quality,
      status,
      spacingM,
      flightLines,
      photoPoints
    };
  }

  window.VentoUtils.flightCalculator = {
    haversineMeters,
    getBounds,
    getGeometryPoints,
    geometryAreaM2,
    centerOfPoints,
    createRectangle,
    createFlightLines,
    createPhotoPoints,
    calculateMission
  };
})();
