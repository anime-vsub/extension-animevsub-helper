export interface RequestResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>
  data: string | ArrayBuffer
  url: string
  status: number
}

export type RequestOption = Pick<
  RequestInit,
  | "method"
  | "cache"
  | "integrity"
  | "keepalive"
  | "redirect"
  | "referrerPolicy"
  | "window"
> & {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer" | "json" | "text"
  signalId?: string | true
  data?: Record<string, number | string | boolean> | string
}

export interface DetailCustomEvent_sendToInject {
  id: string
  isBuffer?: boolean
  ok: boolean
  res: RequestResponse
}
