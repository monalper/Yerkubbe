type PMNode = { type?: string; attrs?: any; content?: PMNode[]; marks?: any[]; text?: string }

export function extractInternalSlugs(doc: unknown): string[] {
  const out: string[] = []
  const visit = (n: PMNode | null | undefined) => {
    if (!n) return
    const marks = n.marks ?? []
    for (const m of marks) {
      if (m?.type === 'link' && typeof m?.attrs?.href === 'string') {
        const href = m.attrs.href as string
        const match = href.match(/^\/text\/([^#?]+)/)
        if (match?.[1]) out.push(decodeURIComponent(match[1]))
      }
    }
    for (const c of n.content ?? []) visit(c)
  }
  visit(doc as any)
  return Array.from(new Set(out))
}

export type HeadingItem = { level: number; id: string; text: string }

function slugifyHeading(s: string) {
  return s
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[ığ]/g, (m) => (m === 'ı' ? 'i' : 'g'))
    .replace(/[ş]/g, 's')
    .replace(/[ç]/g, 'c')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractHeadings(doc: unknown): HeadingItem[] {
  const headings: HeadingItem[] = []
  const idCounts = new Map<string, number>()
  const visit = (n: PMNode | null | undefined) => {
    if (!n) return
    if (n.type === 'heading') {
      const level = Number(n.attrs?.level ?? 2)
      const text = extractText(n).trim()
      if (text) {
        const existing = typeof n.attrs?.id === 'string' ? (n.attrs.id as string) : null
        const base = existing || slugifyHeading(text) || 'section'
        const seen = idCounts.get(base) ?? 0
        idCounts.set(base, seen + 1)
        const id = seen === 0 ? base : `${base}-${seen + 1}`
        headings.push({ level, id, text })
      }
    }
    for (const c of n.content ?? []) visit(c)
  }
  visit(doc as any)
  return headings
}

function extractText(n: PMNode): string {
  if (typeof n.text === 'string') return n.text
  return (n.content ?? []).map(extractText).join('')
}
