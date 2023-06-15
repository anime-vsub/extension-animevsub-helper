import browser from "webextension-polyfill"

export function modifyHeader(
  details:
    | browser.WebRequest.OnBeforeSendHeadersDetailsType
    | browser.WebRequest.OnHeadersReceived,
  name: string,
  value: string,
  isResponse = false
) {
  const key = isResponse ? "responseHeaders" : "requestHeaders"
  const refererCurrent = details[key]?.find(
    (item) => item.name.toLowerCase() === name
  )

  if (refererCurrent) {
    refererCurrent.value = value
  } else {
    if (!details[key]) details[key] = []
    details[key].push({
      name,
      value
    })
  }

  return details
}
