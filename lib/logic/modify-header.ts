import type browser from "webextension-polyfill"

export function removeHeader(
  details:
    | browser.WebRequest.OnBeforeSendHeadersDetailsType
    | browser.WebRequest.OnHeadersReceivedDetailsType,
  name: string,
  isResponse = false
) {
  const key = isResponse ? "responseHeaders" : "requestHeaders"
    ;
  (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"] = (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]?.filter(
    (item) => item.name.toLowerCase() != name
  )

  return details
}

export function setHeader(
  details:
    | browser.WebRequest.OnBeforeSendHeadersDetailsType
    | browser.WebRequest.OnHeadersReceivedDetailsType,
  name: string,
  value: string,
  isResponse = false
) {
  const key = isResponse ? "responseHeaders" : "requestHeaders"
  const refererCurrent = (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]?.find(
    (item) => item.name.toLowerCase() === name
  )

  if (refererCurrent) {
    refererCurrent.value = value
  } else {
    if (!(details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]) (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"] = []
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ; (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]!.push({
        name,
        value
      })
  }

  return details
}

export function addHeader(
  details:
    | browser.WebRequest.OnBeforeSendHeadersDetailsType
    | browser.WebRequest.OnHeadersReceivedDetailsType,
  name: string,
  value: string,
  isResponse = false
) {
  const key = isResponse ? "responseHeaders" : "requestHeaders"

  if (!(details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]) (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"] = []
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ; (details as browser.WebRequest.OnBeforeSendHeadersDetailsType)[key as "requestHeaders"]!.push({
      name,
      value
    })

  return details
}
