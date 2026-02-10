export const SITE_NAME = 'Yerkubbe'

export function getSiteOrigin(): string | null {
  const raw = (import.meta as any)?.env?.VITE_SITE_URL as string | undefined
  const fromEnv = (raw ?? '').trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return null
}

export function buildTitle(title?: string | null): string {
  const t = (title ?? '').trim()
  if (!t) return SITE_NAME
  const lower = t.toLocaleLowerCase('tr-TR')
  const siteLower = SITE_NAME.toLocaleLowerCase('tr-TR')
  if (lower.includes(siteLower)) return t
  return `${t} - ${SITE_NAME}`
}

export function buildDefaultDescription(): string {
  return 'Yerkubbe: Kişisel kaynak arşivi.'
}
