import { createRule } from "./create-rule"
import { installRules } from "./install-rules"

const referrersInstalled = new Set<string>()
// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {}

export function installReferrer(name: string, value: string) {
  if (referrersInstalled.has(name)) return NOOP
  referrersInstalled.add(name)

  return installRules(createRule(name, value))
}
export function installReferrers(referers: Record<string, string>) {
  const rules = Object.entries(referers).reduce((rules, [name, value]) => {
    rules.push(...createRule(name, value))
    return rules
    // eslint-disable-next-line no-undef
  }, [] as chrome.declarativeNetRequest.Rule[])
  // eslint-disable-next-line no-undef
  if (__DEV__) console.log(rules)
  return installRules(rules)
}
