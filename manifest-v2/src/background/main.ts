// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  // eslint-disable-next-line import/no-absolute-path
  import("/@vite/client")
  // load latest content script
  import("./contentScriptHMR")
}

// eslint-disable-next-line import/first
import "lib/background"
