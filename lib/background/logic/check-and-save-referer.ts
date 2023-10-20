import Browser from "webextension-polyfill"
import { getReferers } from "./get-referers"
import { createRule } from "./create-rule"
import { installRules } from "./install-rules"

const store = new Map<string, boolean>()

export async function checkReferer(name: string): Promise<boolean> {
  const id = `referer-${name}`

  const inStore = store.get(id)

  if (inStore !== undefined) return inStore

  const { [id]: value } = await Browser.storage.sync.get([id])

  const installed = value!!
  store.set(id, installed)

  return installed
}
export async function saveReferer(name: string, value: string) {
  const id = `referer-${name}`

  if (await checkReferer(id)) return

  const rules = createRule(name, value)

  await Promise.all([installRules(rules), saveRefererToStore(name, value)])
}
async function saveRefererToStore(name: string, value: string) {
  const referers = await getReferers()

  referers[name] = value

  await Browser.storage.sync.set({
    referers
  })
  store.set(name, true)
}
