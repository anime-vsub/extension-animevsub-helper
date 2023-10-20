import Browser from "webextension-polyfill"

// eslint-disable-next-line functional/no-let
let referers: Record<string, string>,
  promiseGetReferers: ReturnType<typeof getReferers>
export async function getReferers(): Promise<Record<string, string>> {
  if (referers) return referers
  if (promiseGetReferers) return promiseGetReferers

  return (promiseGetReferers = Browser.storage.sync
    .get("referers")
    .then((res) => (referers = res)))
}
