/**
 * Walks an arbitrary API response and reports every place a forbidden field appears.
 *
 * A shallow `expect(body.hospital.password).toBeUndefined()` only checks the one nesting
 * the test author thought of. Leaks show up in whichever relation a future `include`
 * widens, so these assertions traverse the whole payload and report the exact path.
 */
export function findForbiddenFields(payload: unknown, forbidden: string[]): string[] {
  const hits: string[] = []
  const forbiddenSet = new Set(forbidden)

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }

    if (node === null || typeof node !== 'object') return

    for (const [key, value] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key
      if (forbiddenSet.has(key)) hits.push(childPath)
      walk(value, childPath)
    }
  }

  walk(payload, '')
  return hits
}

/** Collects every key name present anywhere in a payload — used to assert an allow-list. */
export function collectKeys(payload: unknown): Set<string> {
  const keys = new Set<string>()

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node === null || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      keys.add(key)
      walk(value)
    }
  }

  walk(payload)
  return keys
}
