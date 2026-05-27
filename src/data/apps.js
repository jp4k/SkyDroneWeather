window.VentoData = window.VentoData || {};

window.VentoData.apps = [
  {
    id: 'windy',
    name: 'Windy',
    category: 'Clima',
    score: 94,
    strengths: ['Vento em altitude', 'Rajadas', 'Camadas meteorologicas'],
    exports: ['Link operacional', 'Comparativo'],
    url: 'https://www.windy.com'
  },
  {
    id: 'ventusky',
    name: 'Ventusky',
    category: 'Clima',
    score: 91,
    strengths: ['Nuvens', 'Precipitacao', 'Temperatura'],
    exports: ['Link operacional', 'Comparativo'],
    url: 'https://www.ventusky.com'
  },
  {
    id: 'pix4d',
    name: 'Pix4D',
    category: 'Fotogrametria',
    score: 90,
    strengths: ['Processamento profissional', 'GCP', 'Relatorios'],
    exports: ['KML', 'CSV', 'GeoJSON']
  },
  {
    id: 'metashape',
    name: 'Agisoft Metashape',
    category: 'Fotogrametria',
    score: 88,
    strengths: ['Controle fino', 'Projetos grandes', 'GCP avancado'],
    exports: ['CSV', 'TXT', 'GPX']
  },
  {
    id: 'qgis',
    name: 'QGIS',
    category: 'GIS',
    score: 93,
    strengths: ['Analise espacial', 'Camadas vetoriais', 'GeoJSON'],
    exports: ['KML', 'GPX', 'GeoJSON', 'CSV']
  },
  {
    id: 'dronedeploy',
    name: 'DroneDeploy',
    category: 'Operacao',
    score: 86,
    strengths: ['Planejamento rapido', 'Inspecoes', 'Compartilhamento'],
    exports: ['KML', 'CSV']
  }
];
