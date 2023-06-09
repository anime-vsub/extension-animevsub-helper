import browser from "webextension-polyfill"

export function modifyHeader(
  details: browser.WebRequest.OnBeforeSendHeadersDetailsType,
  name: string,
  value: string
) {
  const refererCurrent = details.requestHeaders?.find(
    (item) => item.name.toLowerCase() === name
  )

  if (refererCurrent) {
    refererCurrent.value = value
  } else {
    if (!details.requestHeaders) details.requestHeaders = []
    details.requestHeaders.push({
      name,
      value
    })
  }

  return details
}
