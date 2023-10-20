import { createRule } from "./create-rule"
import { installRules } from "./install-rules"

export function installReferer(name: string, value: string) {
  return installRules(createRule(name, value))
}
export function installReferers(referers: Record<string, string>) {
  const rules = Object.entries(referers).reduce((rules, [name, value]) => {
    rules.push(...createRule(name, value))
    return rules
  }, [] as chrome.declarativeNetRequest.Rule[])
  console.log(rules)
  return installRules(rules)
}
