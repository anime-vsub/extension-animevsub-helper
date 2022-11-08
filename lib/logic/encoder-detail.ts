import { isFirefox } from "../env"

export const encodeDetail = !isFirefox ? ((data: unknown) => data) : ((data: any) => JSON.stringify(data))
export const decodeDetail = !isFirefox ? ((data: unknown) => data) : ((data: any) => JSON.parse(data))