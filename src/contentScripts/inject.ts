
console.log("injecter load")

window.Http = {
      get(options) {
        return new Promise((resolve, reject) => {
          const id = crypto.randomUUID()
          const handler = ({ detail }) => {
            if (event.detail.id === id) {
              if (event.detail.ok) 
              resolve(event.detail.res)
              else
              reject(event.detail.res)
                document.removeEventListener("response:http-get", handler)
            }
          }
          document.addEventListener("response:http-get", handler)
          document.dispatchEvent(new CustomEvent("request:http-get", {
            detail: {id, ...options}
          }))
        })
      },
      post(options) {
        return new Promise((resolve, reject) => {
          const id = crypto.randomUUID()
          const handler = ({ detail }) => {
            if (event.detail.id === id) {
              if (event.detail.ok) 
              resolve(event.detail.res)
              else
              reject(event.detail.res)
                document.removeEventListener("response:http-post", handler)
            }
          }
          document.addEventListener("response:http-post", handler)
          document.dispatchEvent(new CustomEvent("request:http-post", {
            detail: {id, ...options}
          }))
        })
      }
    }