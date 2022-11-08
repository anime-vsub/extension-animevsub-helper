# Extension AnimeVsub Helper

[![GitHub license](https://img.shields.io/github/license/anime-vsub/extension-animevsub-helper)](https://github.com/anime-vsub/extension-animevsub-helper/blob/main/LICENSE) 
![Release](https://img.shields.io/github/package-json/v/anime-vsub/extension-animevsub-helper?color=b)

> Extension is helper for animevsub [dekstop website](https://github.com/anime-vsub/desktop-web).
> *The web version of the app won't work without this extension*

Although this extension is called `AnimeVsub Helper` it can provide complete API cors for any website.


## Install

<a href="https://microsoftedge.microsoft.com/addons/detail/endghpbficnpbadbdalhbpecpgdcojig" align="center" style="display: inline-block">
  <img src="./logos/edge.svg" width="42px">
  <br>
  <span style="font-weight: 500">Edge</span>
</a>

## Inject window.Http
Here is the API that this extension embeds in websites
[Check here](./lib/contentScripts/inject.ts)

Use them by calling `window.Http.get` or `window.Http.post` in your website


## Development

1. Run this script:
```bash
pnpm i
```
2. Next, For manifest v2 run `cd manifest-v2`. For manifest v3 run `cd manifest-v3`
3. Run:
```bash
pnpm dev
```
4. New Terminal run:
```bash
pnpm start:chrome # open chrome
pnpm start:firefox # open firefox
```
