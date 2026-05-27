window.VentoUtils = window.VentoUtils || {};

(function registerMissionExport() {
  function downloadText(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function getCrcTable() {
    if (getCrcTable.cache) return getCrcTable.cache;
    getCrcTable.cache = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
    return getCrcTable.cache;
  }

  function crc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;
    bytes.forEach((byte) => {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function stringBytes(value) {
    return new TextEncoder().encode(value);
  }

  function writeUInt16(target, value) {
    target.push(value & 0xff, (value >>> 8) & 0xff);
  }

  function writeUInt32(target, value) {
    target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  function dosDateTime(date = new Date()) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, date: dosDate };
  }

  function createKmzBlob(kml) {
    const filename = 'doc.kml';
    const nameBytes = stringBytes(filename);
    const dataBytes = stringBytes(kml);
    const checksum = crc32(dataBytes);
    const stamp = dosDateTime();
    const local = [];
    writeUInt32(local, 0x04034b50);
    writeUInt16(local, 20);
    writeUInt16(local, 0);
    writeUInt16(local, 0);
    writeUInt16(local, stamp.time);
    writeUInt16(local, stamp.date);
    writeUInt32(local, checksum);
    writeUInt32(local, dataBytes.length);
    writeUInt32(local, dataBytes.length);
    writeUInt16(local, nameBytes.length);
    writeUInt16(local, 0);
    local.push(...nameBytes, ...dataBytes);

    const centralOffset = local.length;
    const central = [];
    writeUInt32(central, 0x02014b50);
    writeUInt16(central, 20);
    writeUInt16(central, 20);
    writeUInt16(central, 0);
    writeUInt16(central, 0);
    writeUInt16(central, stamp.time);
    writeUInt16(central, stamp.date);
    writeUInt32(central, checksum);
    writeUInt32(central, dataBytes.length);
    writeUInt32(central, dataBytes.length);
    writeUInt16(central, nameBytes.length);
    writeUInt16(central, 0);
    writeUInt16(central, 0);
    writeUInt16(central, 0);
    writeUInt16(central, 0);
    writeUInt32(central, 0);
    writeUInt32(central, 0);
    central.push(...nameBytes);

    const end = [];
    writeUInt32(end, 0x06054b50);
    writeUInt16(end, 0);
    writeUInt16(end, 0);
    writeUInt16(end, 1);
    writeUInt16(end, 1);
    writeUInt32(end, central.length);
    writeUInt32(end, centralOffset);
    writeUInt16(end, 0);

    return new Blob([new Uint8Array([...local, ...central, ...end])], { type: 'application/vnd.google-earth.kmz' });
  }

  function coordinateText(point) {
    return `${Number(point.lng).toFixed(7)},${Number(point.lat).toFixed(7)},0`;
  }

  function geometryToKml(geometry) {
    const calculator = window.VentoUtils.flightCalculator;
    const points = calculator.getGeometryPoints(geometry);
    if (!points.length) return '';
    const closed = [...points, points[0]].map(coordinateText).join(' ');
    return `
      <Placemark>
        <name>Area da missao</name>
        <Style><LineStyle><color>ff38bdf8</color><width>3</width></LineStyle><PolyStyle><color>3338bdf8</color></PolyStyle></Style>
        <Polygon><outerBoundaryIs><LinearRing><coordinates>${closed}</coordinates></LinearRing></outerBoundaryIs></Polygon>
      </Placemark>`;
  }

  function pointsToKml(points, name, color) {
    return (points || []).map((point, index) => `
      <Placemark>
        <name>${name} ${point.name || index + 1}</name>
        <Style><IconStyle><color>${color}</color><scale>0.8</scale></IconStyle></Style>
        <Point><coordinates>${coordinateText(point)}</coordinates></Point>
      </Placemark>`).join('');
  }

  function buildKml(mission) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Vento Ultra Pro Mission</name>
    ${geometryToKml(mission.geometry)}
    ${pointsToKml(mission.gcp, 'GCP', 'ff22c55e')}
    ${pointsToKml(mission.waypoints, 'Waypoint', 'ff2563eb')}
    ${pointsToKml(mission.metrics?.photoPoints || [], 'Foto', 'fff59e0b')}
  </Document>
</kml>`;
  }

  function buildGpx(mission) {
    const waypointXml = [...(mission.waypoints || []), ...(mission.gcp || [])].map((point, index) => `
  <wpt lat="${Number(point.lat).toFixed(7)}" lon="${Number(point.lng).toFixed(7)}">
    <name>${point.name || point.type || `P${index + 1}`}</name>
  </wpt>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Vento Ultra Pro" xmlns="http://www.topografix.com/GPX/1/1">
${waypointXml}
</gpx>`;
  }

  function buildCsv(points) {
    const rows = ['name,type,lat,lng,notes'];
    (points || []).forEach((point, index) => {
      rows.push([
        point.name || `P${index + 1}`,
        point.type || 'point',
        Number(point.lat).toFixed(7),
        Number(point.lng).toFixed(7),
        point.notes || ''
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    });
    return rows.join('\n');
  }

  function buildJson(mission) {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: 'Vento Ultra Pro React',
      mission
    }, null, 2);
  }

  function exportMission(format, mission) {
    const safeMission = mission || {};
    const points = [
      ...(safeMission.waypoints || []),
      ...(safeMission.gcp || []),
      ...((safeMission.metrics && safeMission.metrics.photoPoints) || []).map((point, index) => ({
        ...point,
        name: `Foto ${index + 1}`,
        type: 'photo'
      }))
    ];

    if (format === 'kml') return downloadText('missao-vento.kml', buildKml(safeMission), 'application/vnd.google-earth.kml+xml');
    if (format === 'kmz') return downloadBlob('missao-vento.kmz', createKmzBlob(buildKml(safeMission)));
    if (format === 'gpx') return downloadText('missao-vento.gpx', buildGpx(safeMission), 'application/gpx+xml');
    if (format === 'csv') return downloadText('missao-vento.csv', buildCsv(points), 'text/csv');
    return downloadText('missao-vento.json', buildJson(safeMission), 'application/json');
  }

  function parseNumericLine(line, index) {
    const parts = String(line || '').trim().split(/[;,\t ]+/).filter(Boolean);
    const nums = parts.map(Number).filter(Number.isFinite);
    if (nums.length < 2) return null;
    const lat = Math.abs(nums[0]) <= 90 ? nums[0] : nums[1];
    const lng = Math.abs(nums[0]) <= 90 ? nums[1] : nums[0];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { id: `gcp-import-${Date.now()}-${index}`, name: parts[0]?.match(/[a-z]/i) ? parts[0] : `GCP ${index + 1}`, lat, lng, type: 'gcp' };
  }

  function parseKml(text) {
    const matches = [...String(text).matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)];
    return matches.flatMap((match, groupIndex) => match[1].trim().split(/\s+/).map((token, index) => {
      const [lng, lat] = token.split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { id: `gcp-kml-${groupIndex}-${index}`, name: `GCP ${groupIndex + 1}-${index + 1}`, lat, lng, type: 'gcp' };
    }).filter(Boolean));
  }

  function parseGpx(text) {
    return [...String(text).matchAll(/<wpt[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi)]
      .map((match, index) => ({
        id: `gcp-gpx-${index}`,
        name: (match[3].match(/<name>(.*?)<\/name>/i)?.[1] || `GCP ${index + 1}`).trim(),
        lat: Number(match[1]),
        lng: Number(match[2]),
        type: 'gcp'
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  }

  function parseGeoJson(text) {
    const data = JSON.parse(text);
    const features = data.type === 'FeatureCollection' ? data.features : [data];
    return features.map((feature, index) => {
      const geometry = feature.geometry || feature;
      if (geometry.type !== 'Point') return null;
      const [lng, lat] = geometry.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: `gcp-geojson-${index}`,
        name: feature.properties?.name || `GCP ${index + 1}`,
        lat,
        lng,
        type: 'gcp'
      };
    }).filter(Boolean);
  }

  function parseGcpFile(filename, text) {
    const lower = String(filename || '').toLowerCase();
    if (lower.endsWith('.kml')) return parseKml(text);
    if (lower.endsWith('.gpx')) return parseGpx(text);
    if (lower.endsWith('.geojson') || lower.endsWith('.json')) return parseGeoJson(text);
    return String(text || '').split(/\r?\n/).map(parseNumericLine).filter(Boolean);
  }

  function validateGcpDistribution(gcp, geometry) {
    const calculator = window.VentoUtils.flightCalculator;
    const bounds = calculator.getBounds(calculator.getGeometryPoints(geometry));
    const count = (gcp || []).length;
    if (!bounds) return { score: 0, status: 'Sem area', message: 'Desenhe uma area para validar os GCPs.' };
    if (count < 3) return { score: 32, status: 'Insuficiente', message: 'Use pelo menos 3 pontos, com preferencia por 5 ou mais.' };
    const center = {
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lng: (bounds.minLng + bounds.maxLng) / 2
    };
    const hasCenter = gcp.some((point) => Math.abs(point.lat - center.lat) < (bounds.maxLat - bounds.minLat) * 0.25
      && Math.abs(point.lng - center.lng) < (bounds.maxLng - bounds.minLng) * 0.25);
    const quadrants = new Set(gcp.map((point) => `${point.lat >= center.lat ? 'n' : 's'}${point.lng >= center.lng ? 'e' : 'w'}`));
    const score = Math.min(100, count * 12 + quadrants.size * 12 + (hasCenter ? 18 : 0));
    const status = score >= 82 ? 'Excelente' : score >= 58 ? 'Boa' : 'Fraca';
    const message = `${quadrants.size}/4 quadrantes cobertos${hasCenter ? ', com ponto central.' : ', sem ponto central claro.'}`;
    return { score, status, message };
  }

  function suggestGcpPoints(geometry) {
    const calculator = window.VentoUtils.flightCalculator;
    const bounds = calculator.getBounds(calculator.getGeometryPoints(geometry));
    if (!bounds) return [];
    const marginLat = (bounds.maxLat - bounds.minLat) * 0.08;
    const marginLng = (bounds.maxLng - bounds.minLng) * 0.08;
    return [
      { name: 'GCP canto sudoeste', lat: bounds.minLat + marginLat, lng: bounds.minLng + marginLng },
      { name: 'GCP canto sudeste', lat: bounds.minLat + marginLat, lng: bounds.maxLng - marginLng },
      { name: 'GCP canto nordeste', lat: bounds.maxLat - marginLat, lng: bounds.maxLng - marginLng },
      { name: 'GCP canto noroeste', lat: bounds.maxLat - marginLat, lng: bounds.minLng + marginLng },
      { name: 'GCP centro', lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 }
    ].map((point, index) => ({ ...point, id: `gcp-suggested-${Date.now()}-${index}`, type: 'gcp' }));
  }

  function generateGcpReport(gcp, validation) {
    const rows = (gcp || []).map((point) => `
      <tr><td>${point.name || ''}</td><td>${Number(point.lat).toFixed(7)}</td><td>${Number(point.lng).toFixed(7)}</td></tr>
    `).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatorio GCP</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111827}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d1d5db;padding:8px;text-align:left}</style>
      </head><body><h1>Relatorio GCP</h1><p>Status: ${validation.status} (${validation.score}%)</p><p>${validation.message}</p><table><thead><tr><th>Nome</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      downloadText('relatorio-gcp.html', html, 'text/html');
    }
  }

  window.VentoUtils.missionExport = {
    downloadText,
    downloadBlob,
    exportMission,
    buildKml,
    buildGpx,
    buildCsv,
    buildJson,
    parseGcpFile,
    validateGcpDistribution,
    suggestGcpPoints,
    generateGcpReport
  };
})();
