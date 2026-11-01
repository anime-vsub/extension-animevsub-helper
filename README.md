# Extension AnimeVsub Helper

[![GitHub license](https://img.shields.io/github/license/anime-vsub/extension-animevsub-helper)](https://github.com/anime-vsub/extension-animevsub-helper/blob/main/LICENSE) 
![Release](https://img.shields.io/github/package-json/v/anime-vsub/extension-animevsub-helper?color=b)

> [!IMPORTANT]
> 
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
> [!CAUTION]
> 
> Since stable version `1.0.1` utility will not inject code anymore use npm package [client-ext-animevsub-helper](https://npmjs.org/package/client-ext-animevsub-helper) replaceable

~~Here is the API that this extension embeds in websites [Check here](./lib/contentScripts/inject.ts)~~

~~Use them by calling `window.Http.get` or `window.Http.post` in your website~~

## Embed bridge

Any website can embed an `animevietsub.*` page (for example
`https://animevietsub.id/404`) and use it as a same-origin HTTP bridge. The
embedded page executes the request with its own cookies and `Referer`, then
sends the result back to the parent page with `postMessage`.

> [!NOTE]
> The extension removes `X-Frame-Options` / `Content-Security-Policy` response
> headers for `animevietsub.*` sub-frames so the page can be embedded.

### Plain JavaScript

The extension exposes `window.AnimeVsubEmbed` on every page:

```js
const bridge = window.AnimeVsubEmbed.create({
  src: "https://animevietsub.id/404",
  hidden: true
})

await bridge.ready

const res = await bridge.get("/ajax/...", { responseType: "json" })
console.log(res.status, res.data)

// POST with form data
await bridge.post("/ajax/...", { key: "value" }, { responseType: "json" })

// Absolute URLs are supported too
await bridge.get("https://animevietsub.id/ajax/...", {
  responseType: "arraybuffer"
})
```

A complete demo is available at
[`examples/embed-bridge.html`](./examples/embed-bridge.html).

### With the npm client

```ts
import { createEmbedBridge } from "client-ext-animevsub-helper"

const bridge = createEmbedBridge({
  src: "https://animevietsub.id/404",
  hidden: true
})

const res = await bridge.get<{ data: unknown }>("/ajax/...", {
  responseType: "json"
})
```

### Restricting parent origins

By default the embedded page answers its direct parent frame. To restrict which
origins are accepted, add the `animevsub-embed-origins` query parameter to the
iframe URL:

```js
window.AnimeVsubEmbed.create({
  src:
    "https://animevietsub.id/404?animevsub-embed-origins=" +
    encodeURIComponent("https://animevsub.eu.org,https://*.animevsub.eu.org")
})
```

### API

| Member | Description |
| ---- | ---- |
| `bridge.ready` | Resolves when the embedded page is ready. |
| `bridge.get(url, options)` | GET request. |
| `bridge.post(url, data, options)` | POST request. |
| `bridge.request(options)` | Any method (`options.method`). |
| `bridge.iframe` | The iframe element. |
| `bridge.destroy()` | Removes listeners and the iframe. |

`options` supports `headers`, `responseType` (`text` default, `json`,
`arraybuffer`), `timeout`, and every `RequestInit` field supported by the
embedded page (`method`, `cache`, `redirect`, ...).

## Development

This project uses [Bun](https://bun.sh) as the package manager. Install Bun
**1.4.4 or newer** first.

1. Install dependencies:
```bash
bun install
```
2. Next, for manifest v2 run `cd manifest-v2`. For manifest v3 run `cd manifest-v3`
3. Run:
```bash
bun run dev
```
4. New Terminal run:
```bash
bun run start:chromium # open chromium/chrome
bun run start:firefox # open firefox
```
