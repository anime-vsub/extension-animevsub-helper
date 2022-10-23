import type { Tabs } from 'webextension-polyfill'
import browser from 'webextension-polyfill'
import { sendMessage, onMessage } from 'webext-bridge'

onMessage("http:get", async ({ data: { id , url ,headers, responseType} }) => {
  const res = await fetch(url, {
    headers: new Headers(headers)
  })
  
  return {
    headers: Object.fromEntries(res.headers.entries()),
    data: responseType === "arraybuffer" ? await res.arrayBuffer() : await res.text(),
    url: res.url
  }
})
onMessage("http:post", async ({ data: { id , url ,headers, responseType, data }}) => {
  const form = new FormData()
  
  Object.entries(data ?? {}).forEach(([key, val]) => form.append(key, val))
  
  const res = await fetch(url, {
    method: "POST",
    headers: new Headers(headers),
    data: form
  })
  
  return {
    headers: Object.fromEntries(res.headers.entries()),
    data: responseType === "arraybuffer" ? await res.arrayBuffer() : await res.text(),
    url: res.url
  }
})