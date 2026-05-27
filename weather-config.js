(() => {
  'use strict';

  window.VENTO_WEATHER_MODE = 'open-meteo';
  window.VENTO_WEATHER_CONFIG = Object.freeze({
    proxyOrigin: window.VENTO_PROXY_ORIGIN || '',
    optionalServerKeys: Object.freeze({
      weatherApi: 'VENTO_WEATHERAPI_KEY',
      meteostat: 'VENTO_METEOSTAT_KEY'
    })
  });
})();
