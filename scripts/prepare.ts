// generate stub index.html files for dev entry
import { execSync } from 'child_process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { isDev, log, r } from './utils'

function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}

fs.ensureDirSync(r('extension'))
fs.copySync(r('assets'), r('extension/assets'))
writeManifest()

if (isDev) {
  stubIndexHtml()
  chokidar.watch([r('src/manifest.ts'), r('package.json')])
    .on('change', () => {
      writeManifest()
    })
}
