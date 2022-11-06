import packageV2 from "../manifest-v2/package.json"
import packageV3 from "../manifest-v2/package.json"
import { version } from "../package.json"

import { resolve } from "path"
import fs from "fs"

packageV2.version = packageV3.version = version

fs.writeFileSync(
  resolve(__dirname, "../manifest-v2/package.json"),
  JSON.stringify(packageV2, null, 2)
)

fs.writeFileSync(
  resolve(__dirname, "../manifest-v3/package.json"),
  JSON.stringify(packageV3, null, 2)
)
