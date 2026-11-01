# client-ext-animevsub-helper
This package is a client that includes connections to the AnimeVsub Helper utility"

## Install
```bash
bun add client-ext-animevsub-helper
```

## Usage
```ts
import { Http } from 'client-ext-animevsub-helper'
```

## Embed bridge
Embed an `animevietsub.*` page and run same-origin requests through it:

```ts
import { createEmbedBridge } from 'client-ext-animevsub-helper'

const bridge = createEmbedBridge({
  src: 'https://animevietsub.id/404',
  hidden: true
})

const res = await bridge.get('/ajax/...', { responseType: 'json' })
console.log(res.status, res.data)
```

See the main README for the full API.
