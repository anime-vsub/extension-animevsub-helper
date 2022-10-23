/* eslint-disable no-console */
import { onMessage, sendMessage } from 'webext-bridge'

function get(options) {
  return sendMessage("http:get", {
      url: options.url,
      headers: options.headers,
      responseType: options.responseType
    })
}
function post(options) {
  return sendMessage("http:post", {
      url: options.url,
      headers: options.headers
      ,
      responseType: options.responseType,
      data: options.data
    })
}


document.addEventListener("request:http-get", async ({ detail }) => {
    document.dispatchEvent(new CustomEvent('response:http-get', {
      detail: await get(detail).then((res) => {
        return {
          id: detail.id,
          ok: true,
          res
        }
      }).catch(err => {
        return {
          id: detail.id,
          ok: false,
          res: err
        }
      })
    })
    )
})

document.addEventListener("request:http-post", async ({ detail }) => {
    document.dispatchEvent(new CustomEvent('response:http-post', {
      detail: await post(detail).then((res) => {
        return {
          id: detail.id,
          ok: true,
          res
        }
      }).catch(err => {
        return {
          id: detail.id,
          ok: false,
          res: err
        }
      })
    })
    )
})

;(() => {
  console.log("start inject")
var s = document.createElement('script');
  s.src = chrome.runtime.getURL('dist/contentScripts/inject.global.js');
  s.onload = function() {
      this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
})()