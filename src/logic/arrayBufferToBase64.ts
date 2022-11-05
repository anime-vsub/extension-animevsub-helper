import { btoa } from "js-base64"

export function arrayBufferToBase64(buffer) {
  // eslint-disable-next-line functional/no-let
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  // eslint-disable-next-line functional/no-let
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])

  return btoa(binary)
}
