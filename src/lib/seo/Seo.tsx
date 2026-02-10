import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildDefaultDescription, buildTitle, getSiteOrigin, SITE_NAME } from './site'

type OgType = 'website' | 'article'

export type SeoProps = {
  title?: string | null
  description?: string | null
  canonicalPath?: string | null
  noindex?: boolean
  ogType?: OgType
  imageUrl?: string | null
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: string[] | null
  jsonLd?: object | object[] | null
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function esc(s: string) {
  const CSSAny = (globalThis as any).CSS
  if (CSSAny?.escape) return CSSAny.escape(s)
  return s.replace(/\"/g, '\\"')
}

function upsertMetaByName(name: string, content: string | null) {
  const head = document.head
  const sel = `meta[name="${esc(name)}"]`
  const existing = head.querySelector(sel) as HTMLMetaElement | null
  if (!content) {
    existing?.remove()
    return
  }
  const el = existing ?? (document.createElement('meta') as HTMLMetaElement)
  el.setAttribute('name', name)
  el.setAttribute('content', content)
  el.setAttribute('data-seo', 'true')
  if (!existing) head.appendChild(el)
}

function upsertMetaByProperty(property: string, content: string | null) {
  const head = document.head
  const sel = `meta[property="${esc(property)}"]`
  const existing = head.querySelector(sel) as HTMLMetaElement | null
  if (!content) {
    existing?.remove()
    return
  }
  const el = existing ?? (document.createElement('meta') as HTMLMetaElement)
  el.setAttribute('property', property)
  el.setAttribute('content', content)
  el.setAttribute('data-seo', 'true')
  if (!existing) head.appendChild(el)
}

function setCanonicalLink(href: string | null) {
  const head = document.head
  const existing = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!href) {
    existing?.remove()
    return
  }
  const el = existing ?? (document.createElement('link') as HTMLLinkElement)
  el.setAttribute('rel', 'canonical')
  el.setAttribute('href', href)
  el.setAttribute('data-seo', 'true')
  if (!existing) head.appendChild(el)
}

function setMultiMetaProperty(property: string, values: string[]) {
  const head = document.head
  head.querySelectorAll(`meta[property="${esc(property)}"][data-seo="multi"]`).forEach((n) => n.remove())
  for (const v of values) {
    const value = String(v ?? '').trim()
    if (!value) continue
    const el = document.createElement('meta')
    el.setAttribute('property', property)
    el.setAttribute('content', value)
    el.setAttribute('data-seo', 'multi')
    head.appendChild(el)
  }
}

function setJsonLd(objs: object[]) {
  const head = document.head
  head.querySelectorAll('script[type="application/ld+json"][data-seo="jsonld"]').forEach((n) => n.remove())
  for (const obj of objs) {
    const el = document.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    el.setAttribute('data-seo', 'jsonld')
    el.text = JSON.stringify(obj)
    head.appendChild(el)
  }
}

export function Seo(props: SeoProps) {
  const location = useLocation()

  useEffect(() => {
    const origin = getSiteOrigin() ?? window.location.origin
    const path = (props.canonicalPath ?? location.pathname ?? '/').trim() || '/'
    const canonicalUrl = origin ? new URL(path, origin).toString() : null

    const fullTitle = buildTitle(props.title)
    const desc = (props.description ?? '').trim() || buildDefaultDescription()
    const ogImage = (props.imageUrl ?? '').trim() || (origin ? new URL('/logo.svg', origin).toString() : null)
    const ogType: OgType = props.ogType ?? 'website'

    const robots = props.noindex
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

    document.documentElement.lang = 'tr'
    document.title = fullTitle

    upsertMetaByName('description', desc)
    upsertMetaByName('robots', robots)
    setCanonicalLink(canonicalUrl)

    upsertMetaByProperty('og:site_name', SITE_NAME)
    upsertMetaByProperty('og:locale', 'tr_TR')
    upsertMetaByProperty('og:type', ogType)
    upsertMetaByProperty('og:title', fullTitle)
    upsertMetaByProperty('og:description', desc)
    upsertMetaByProperty('og:url', canonicalUrl)
    upsertMetaByProperty('og:image', ogImage)

    upsertMetaByName('twitter:card', 'summary')
    upsertMetaByName('twitter:title', fullTitle)
    upsertMetaByName('twitter:description', desc)
    upsertMetaByName('twitter:image', ogImage)

    upsertMetaByProperty('article:published_time', ogType === 'article' ? props.publishedTime ?? null : null)
    upsertMetaByProperty('article:modified_time', ogType === 'article' ? props.modifiedTime ?? null : null)
    setMultiMetaProperty('article:tag', ogType === 'article' ? (props.tags ?? []) : [])

    setJsonLd(asArray(props.jsonLd))
  }, [
    location.pathname,
    props.canonicalPath,
    props.description,
    props.imageUrl,
    props.jsonLd,
    props.modifiedTime,
    props.noindex,
    props.ogType,
    props.publishedTime,
    props.tags,
    props.title,
  ])

  return null
}
