# Extension AnimeVsub Helper

[![GitHub license](https://img.shields.io/github/license/anime-vsub/extension-animevsub-helper)](https://github.com/anime-vsub/extension-animevsub-helper/blob/main/LICENSE) 
![Release](https://img.shields.io/github/package-json/v/anime-vsub/extension-animevsub-helper?color=b)

> Extension is helper for animevsub [dekstop website](https://github.com/anime-vsub/desktop-web).
> *The web version of the app won't work without this extension*

Although this extension is called `AnimeVsub Helper` it can provide complete API cors for any website.


## Install

| <a href="./install-on-chrome.md"><img src="./logos/chrome.svg" width="42px" /><br /><span>Chrome</span></a> | <a href="https://microsoftedge.microsoft.com/addons/detail/endghpbficnpbadbdalhbpecpgdcojig"><img src="./logos/edge.svg" width="42px" /><br /><span>Edge</span></a> | <a href="https://addons.mozilla.org/vi/firefox/addon/animevsub-helper/"><img src="./logos/firefox.svg" width="42px" /><br /><span>Firefox</span></a> | <a href="https://addons.mozilla.org/vi/android/addon/animevsub-helper/"><img src="./logos/firefox.svg" width="42px" /><br /><span>Firefox Android</span></a> | <a href="./install-on-chrome.md"><img src="./logos/brave.svg" width="42px" /><br /><span>Brave</span></a> | <a href="./install-on-chrome.md"><img src="./logos/opera.svg" width="42px" /><br /><span>Opera</span></a> |
| ---- | ---- | ---- | ---- | ---- | ---- |

Install for
- [Desktop](./xtension-animevsub-helper/blob/main/install-on-chrome.md#desktop-install-extension-for-chromium-chrome-opera-brave-avas-) - Chrome, Edge, Vilvadi, Firefox...
- [Android](./install-on-chrome.md#mobile-install-extension-for-lemur-kiwi-flow-mises-yandex-optima-) - Lemur, Kiwi, Flow, Mies, Yandex, Optima...

### Why can't I see Chrome? Can i use this utility on Chrome (Chromium)?
- Yes, you can use this utility on Chrome. But I haven't uploaded it to Chrome Store so you need to [install this extension manually](./install-on-chrome.md)
- The main reason I don't upload this extension to `Chrome Store` is because Google charges `$5` when I want to sign up for an account to upload, and I don't want to
- If someone wants to upload this utility to the `Chrome Store` just do so you don't have to get permission from anyone. But then send a pull request that includes a link to the utility and your name to this repo to share it with everyone.

## Inject window.Http
> Since stable version `1.0.1` utility will not inject code anymore use npm package [client-ext-animevsub-helper](https://npmjs.org/package/client-ext-animevsub-helper) replaceable

~~Here is the API that this extension embeds in websites [Check here](./lib/contentScripts/inject.ts)~~

~~Use them by calling `window.Http.get` or `window.Http.post` in your website~~



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
