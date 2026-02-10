export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ')
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

export function truncate(input: string, maxLen: number): string {
  if (input.length <= maxLen) return input
  const cut = input.slice(0, Math.max(0, maxLen - 1))
  const lastSpace = cut.lastIndexOf(' ')
  const base = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()
  return `${base}…`
}

export function toMetaDescription(input: string | null | undefined, maxLen = 160): string | null {
  const v = (input ?? '').trim()
  if (!v) return null
  return truncate(normalizeWhitespace(stripHtml(v)), maxLen)
}

