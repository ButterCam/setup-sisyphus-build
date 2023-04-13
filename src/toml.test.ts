import * as toml from '@iarna/toml'
import {describe, test} from '@jest/globals'
import {mergeCatalogsToml} from './toml'

describe('toml', () => {
  test('merge', () => {
    const catalog = `
[versions]
kotlin = "1.5.10"
sisyphus = "0.1.0"

[libraries]
kotlin-stdlib = { module = "org.jetbrains.kotlin:kotlin-stdlib", version.ref = "kotlin" }
kotlin-reflect = { module = "org.jetbrains.kotlin:kotlin-reflect", version.ref = "kotlin" }
sisyphus-core = { module = "com.bybutter.sisyphus:sisyphus-core", version.ref = "sisyphus" }
`

    const merging = `
[versions]
kotlin = "1.7.0"
`
    const result = `[versions]
kotlin = "1.7.0"
sisyphus = "0.1.0"

[libraries]
kotlin-stdlib = {module = "org.jetbrains.kotlin:kotlin-stdlib", version.ref = "kotlin"}
kotlin-reflect = {module = "org.jetbrains.kotlin:kotlin-reflect", version.ref = "kotlin"}
sisyphus-core = {module = "com.bybutter.sisyphus:sisyphus-core", version.ref = "sisyphus"}`

    expect(mergeCatalogsToml(catalog, merging).trim()).toBe(result.trim())
  })
})
