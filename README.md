# SkyDrone Weather

Dashboard estatico para planejamento com clima, drone, satelite e mapa.

## Rodar localmente

Abra o projeto com uma extensao como Live Server ou use um servidor estatico:

```bash
npx serve .
```

Depois acesse a URL local indicada pelo comando e abra `index.html`.

## Publicar no GitHub Pages

1. Acesse `Settings > Pages` no repositorio.
2. Em `Source`, selecione `Deploy from branch`.
3. Em `Branch`, selecione `main`.
4. Em `Folder`, selecione `/root`.
5. Salve.

O projeto nao precisa de Vite, Next.js, `npm run build` ou backend obrigatorio. O GitHub Pages publica os arquivos estaticos diretamente da raiz.

## Clima e chaves

Open-Meteo funciona direto no navegador e nao precisa de API key.

`server.js` e `server-supervisor.js` podem ser usados localmente para fontes privadas ou proxy, mas sao opcionais. No GitHub Pages, o painel continua funcionando com Open-Meteo direto.

Nao envie `.env` real para o GitHub. Use `.env.example` como referencia e mantenha `.env` ignorado pelo Git.
