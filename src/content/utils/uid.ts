/** Generates a short unique ID — used for console outputs and snippets. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
