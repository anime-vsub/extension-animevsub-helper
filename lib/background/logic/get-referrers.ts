import Browser from "webextension-polyfill"

// eslint-disable-next-line functional/no-let
let referrers: Record<string, string>,
  promiseGetReferrers: ReturnType<typeof getReferrers>
export async function getReferrers(): Promise<Record<string, string>> {
  if (referrers) return referrers
  if (promiseGetReferrers) return promiseGetReferrers

  return (promiseGetReferrers = Browser.storage.sync
    .get("referrers")
    .then((res) => (referrers = res)))
}
