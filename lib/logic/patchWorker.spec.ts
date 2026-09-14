import { describe, expect, it } from "vitest"
import { patchWorkerCode } from "./patchWorker"

describe("patchWorker", () => {
  it("exports valid javascript code in patchWorkerCode", () => {
    expect(patchWorkerCode).toBeDefined()
    expect(patchWorkerCode).toContain("CORSWorker")
    expect(patchWorkerCode).toContain("EXT-X-VERSION")
    expect(patchWorkerCode).toContain("googleapiscdn.com")
  })

  it("replaces EXT-X-VERSION check in worker scripts correctly", () => {
    const fakeScript =
      't.compatibleVersion>1&&(!u.version||u.version<t.compatibleVersion)&&o.INVALIDPLAYLIST("EXT-X-VERSION needs to be ".concat(t.compatibleVersion," or higher.")),u'

    let patched = fakeScript.replace(
      /\(!u\.version\|\|u\.version\s*<\s*t\.compatibleVersion\)\s*&&\s*o\.INVALIDPLAYLIST\("EXT-X-VERSION needs to be/g,
      'false&&o.INVALIDPLAYLIST("EXT-X-VERSION needs to be'
    )
    patched = patched.replace(
      /o\.INVALIDPLAYLIST\(\s*["']EXT-X-VERSION needs to be/g,
      '(()=>{})("EXT-X-VERSION needs to be'
    )

    expect(patched).not.toContain('(!u.version||u.version<t.compatibleVersion)&&o.INVALIDPLAYLIST("EXT-X-VERSION needs to be')
    expect(patched).toContain('false&&(()=>{})("EXT-X-VERSION needs to be')
  })

  it("replaces playlist fetch to append #animevsub-vsub_extra", () => {
    const fakeFetch = 'const h=await fetch(N).then(f=>f.ok?f.text():Promise.reject(f));'
    const patched = fakeFetch.replace(
      /fetch\(([a-zA-Z0-9_]+)\)\.then\(([a-zA-Z0-9_]+)=>\2\.ok\?\2\.text\(\)/g,
      'fetch($1.includes("googleapiscdn.com")&&!$1.includes("#")?$1+"#animevsub-vsub_extra":$1).then($2=>$2.ok?$2.text()'
    )

    expect(patched).toContain('fetch(N.includes("googleapiscdn.com")&&!N.includes("#")?N+"#animevsub-vsub_extra":N).then(f=>f.ok?f.text()')
  })
})
