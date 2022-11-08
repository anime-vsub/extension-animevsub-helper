// git add package.json && git add manifest-v2/package.json && git add manifest-v3/package.json &&

import { execSync } from "child_process"
import { resolve } from "path"
import { version } from "../package.json"

function r(path: string) {
  return resolve(__dirname, "..", path)
}

;`
git add ${r("package.json")}
git add ${r("manifest-v2/package.json")}
git add ${r("manifest-v3/package.json")}
git commit -m "chore: release v${version}"
git tag v${version}
`
  .split("\n")
  .forEach(
    (cmd) =>
      cmd && console.log(execSync(cmd, { stdio: ["inherit"] }).toString())
  )
