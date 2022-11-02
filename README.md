# Extension AnimeVsub Helper

> Extension is helper for animevsub [dekstop website](https://github.com/anime-vsub/desktop-web).
> *The web version of the app won't work without this extension*

Although this extension is called `AnimeVsub Helper` it can provide complete API cors for any website.  Here is the API that this extension embeds in websites:

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
  get: (url: string, options: GetOptions) => HttpResponse
  post: (url: string, options: PostOptions) => HttpResponse
}
```

Use them by calling `window.Http.get` or `window.Http.post` in your website
