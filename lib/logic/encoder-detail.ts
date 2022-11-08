import { isFirefox } from "../env"

export const encodeDetail = !isFirefox
  ? <T>(data: T) => data
  : <T>(data: T) => JSON.stringify(data) as T
export const decodeDetail = !isFirefox
  ? <T>(data: T) => data
  : <T>(data: T) => JSON.parse(data as string) as T
