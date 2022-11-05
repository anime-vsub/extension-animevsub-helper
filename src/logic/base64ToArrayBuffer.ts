import { atob } from "js-base64"

export function base64ToArrayBuffer(base64) {
  // eslint-disable-next-line camelcase
  const binary_string = atob(base64)
  // eslint-disable-next-line camelcase
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  // eslint-disable-next-line functional/no-let
  for (let i = 0; i < len; i++)
    // eslint-disable-next-line functional/immutable-data, camelcase
    bytes[i] = binary_string.charCodeAt(i)

  return bytes.buffer
}
