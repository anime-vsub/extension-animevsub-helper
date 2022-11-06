import { version as versionV2 } from "../manifest-v2/package.json"
import { version as versionV3 } from "../manifest-v2/package.json"
import packageJson from "../package.json"

import max from "semver/ranges/max-satisfying"
import { resolve } from "path"
import fs from "fs"

packageJson.version = max([versionV2, versionV3], "")!

fs.writeFileSync(
  resolve(__dirname, "../package.json"),
  JSON.stringify(packageJson, null, 2)
)
