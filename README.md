# Extension AnimeVsub Helper

[![GitHub license](https://img.shields.io/github/license/anime-vsub/app)](https://github.com/anime-vsub/desktop-web/blob/main/LICENSE) 
![Release](https://img.shields.io/github/package-json/v/anime-vsub/extension-animevsub-helper?color=b)

> Extension is helper for animevsub [dekstop website](https://github.com/anime-vsub/desktop-web).
> *The web version of the app won't work without this extension*

Although this extension is called `AnimeVsub Helper` it can provide complete API cors for any website.  Here is the API that this extension embeds in websites:


## Install

<a href="https://microsoftedge.microsoft.com/addons/detail/endghpbficnpbadbdalhbpecpgdcojig" align="center" style="display: inline-block">
  <img src="./logos/edge.svg" width="42px">
  <br>
  <span style="font-weight: 500">Edge</span>
</a>

## window.Http
```ts
interface GetOptions {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
}
interface PostOptions {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer"
  data?: Record<string, string>
}

interface HttpResponse {
  headers: Record<string, string>
  data: ArrayBuffer | string
  url: string
  status: number
}

interface Http {
  get: (options: GetOptions) => Promise<HttpResponse>
  post: (options: PostOptions) => Promise<HttpResponse>
}
```

Use them by calling `window.Http.get` or `window.Http.post` in your website
