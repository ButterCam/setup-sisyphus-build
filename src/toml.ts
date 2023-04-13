import {parse} from '@iarna/toml'

export function mergeCatalogsToml(original: string, merging: string): string {
  const originalCatalog = parse(original)
  const mergingCatalog = parse(merging)
  return stringify(mergeCatalogs(originalCatalog, mergingCatalog))
}

function stringify(catalog: Catalog): string {
  let result = ''

  if (catalog.versions && Object.keys(catalog.versions).length > 0) {
    result += '[versions]\n'
    for (const key in catalog.versions) {
      result += `${key} = ${stringifyTomlValue(catalog.versions[key])}\n`
    }
    result += '\n'
  }

  if (catalog.libraries && Object.keys(catalog.libraries).length > 0) {
    result += '[libraries]\n'
    for (const key in catalog.libraries) {
      result += `${key} = ${stringifyTomlValue(catalog.libraries[key])}\n`
    }
    result += '\n'
  }

  if (catalog.plugins && Object.keys(catalog.plugins).length > 0) {
    result += '[plugins]\n'
    for (const key in catalog.plugins) {
      result += `${key} = ${stringifyTomlValue(catalog.plugins[key])}\n`
    }
    result += '\n'
  }

  if (catalog.bundles && Object.keys(catalog.bundles).length > 0) {
    result += '[bundles]\n'
    for (const key in catalog.bundles) {
      result += `${key} = ${stringifyTomlValue(catalog.bundles[key])}\n`
    }
    result += '\n'
  }

  return result
}

function stringifyTomlValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return `"${value}"`
    case 'number':
      return value.toString()
    case 'boolean':
      return value ? 'true' : 'false'
    case 'object': {
      if (value === null) {
        return 'null'
      } else if (Array.isArray(value)) {
        let result = '['
        for (const item of value) {
          result += `${stringifyTomlValue(item)}, `
        }
        if (result.endsWith(', ')) {
          result = result.substring(0, result.length - 2)
        }
        result += ']'
        return result
      } else {
        let result = '{'
        for (const key in value) {
          const v = (value as {[k: string]: unknown})[key]
          if (isSimpleObject(v)) {
            const nestKey = Object.keys(v)[0]
            result += `${key}.${nestKey} = ${stringifyTomlValue(
              (v as {[k: string]: unknown})[nestKey]
            )}, `
          } else {
            result += `${key} = ${stringifyTomlValue(v)}, `
          }
        }
        if (result.endsWith(', ')) {
          result = result.substring(0, result.length - 2)
        }
        result += '}'
        return result
      }
    }
    case 'bigint':
      return value.toString()
    case 'symbol':
      return value.toString()
    case 'undefined':
      return 'null'
    case 'function':
      return 'null'
  }
}

function isSimpleObject(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 1
  )
}

function mergeCatalogs(original: Catalog, merging: Catalog): Catalog {
  original.versions = mergeVersions(
    original.versions || {},
    merging.versions || {}
  )
  original.libraries = mergeLibraries(
    original.libraries || {},
    merging.libraries || {}
  )
  original.bundles = mergeBundles(original.bundles || {}, merging.bundles || {})
  original.plugins = mergePlugins(original.plugins || {}, merging.plugins || {})
  return original
}

function mergeVersions(original: Versions, merging: Versions): Versions {
  for (const key in merging) {
    original[key] = merging[key]
  }
  return original
}

function mergeLibraries(original: Libraries, merging: Libraries): Libraries {
  for (const key in merging) {
    original[key] = merging[key]
  }
  return original
}

function mergeBundles(original: Bundles, merging: Bundles): Bundles {
  for (const key in merging) {
    original[key] = merging[key]
  }
  return original
}

function mergePlugins(original: Plugins, merging: Plugins): Plugins {
  for (const key in merging) {
    original[key] = merging[key]
  }
  return original
}

interface Catalog {
  versions?: Versions
  libraries?: Libraries
  bundles?: Bundles
  plugins?: Plugins
}

interface Versions {
  [key: string]: string | Version
}

interface Libraries {
  [key: string]: string | Library
}

interface Library {
  group?: string
  name?: string
  module?: string
  version: Version | string
}

interface Bundles {
  [key: string]: string[]
}

interface Plugins {
  [key: string]: string | Plugin
}

interface Plugin {
  id: string
  version: Version | string
}

interface Version {
  ref?: string
  require?: string
  strictly?: string
  prefer?: string
  reject?: string[]
  rejectAll?: boolean
}
