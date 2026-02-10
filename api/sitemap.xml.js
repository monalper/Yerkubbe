import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://rfptqxptbanoskfnjnoa.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcHRxeHB0YmFub3NrZm5qbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODA2MTksImV4cCI6MjA4NjE1NjYxOX0.yBX5RbQuTmdMQr1O3PVlhjB2YFNuaa2g-DzPzdwkzkE'

function normalizeBaseUrl(input) {
  if (!input) return null
  let url = String(input).trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/+$/, '')
}

function baseUrlFromRequest(req) {
  const proto = (req.headers['x-forwarded-proto'] ?? 'https').toString().split(',')[0].trim()
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host ?? '').toString().split(',')[0].trim()
  if (!host) return null
  return normalizeBaseUrl(`${proto}://${host}`)
}

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function isoDateOnly(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

async function fetchPublishedArticles({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl || !supabaseAnonKey) return []
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const pageSize = 1000
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('articles')
      .select('slug,updated_at,published_at,deleted_at,status')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    if (data?.length) rows.push(...data)
    if (!data || data.length < pageSize) break
  }

  return rows
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, HEAD')
    res.end('Method Not Allowed')
    return
  }

  const baseUrl =
    normalizeBaseUrl(process.env.SITE_URL) ??
    normalizeBaseUrl(process.env.VITE_SITE_URL) ??
    normalizeBaseUrl(process.env.PUBLIC_SITE_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    baseUrlFromRequest(req) ??
    'https://yerkubbe.com'

  const supabaseUrlRaw = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim()
  const supabaseAnonKeyRaw = (
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim()

  const supabaseUrl = supabaseUrlRaw || DEFAULT_SUPABASE_URL
  const supabaseAnonKey = supabaseAnonKeyRaw || DEFAULT_SUPABASE_ANON_KEY

  let articles = []
  try {
    articles = await fetchPublishedArticles({ supabaseUrl, supabaseAnonKey })
  } catch (e) {
    // don't 500 sitemap for a temporary DB issue; ship minimum valid sitemap
    console.warn('[sitemap] supabase fetch failed:', e?.message ?? e)
    articles = []
  }

  const articleUrls = articles
    .map((row) => {
      const slug = typeof row.slug === 'string' ? row.slug : null
      if (!slug) return null
      const loc = `${baseUrl}/text/${encodeURIComponent(slug)}`
      const lastmod = isoDateOnly(row.updated_at ?? row.published_at)
      return { loc, lastmod }
    })
    .filter(Boolean)

  const latestLastmod =
    articleUrls.map((u) => u.lastmod).filter(Boolean).sort().at(-1) ?? isoDateOnly(new Date())

  const urls = [
    { loc: `${baseUrl}/`, lastmod: latestLastmod },
    { loc: `${baseUrl}/about`, lastmod: null },
    { loc: `${baseUrl}/kullanim-haklari`, lastmod: null },
    { loc: `${baseUrl}/sorumluluk-reddi`, lastmod: null },
    { loc: `${baseUrl}/destekle`, lastmod: null },
    { loc: `${baseUrl}/gelistirici-yazarlik-talebi`, lastmod: null },
    ...articleUrls,
  ]

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(({ loc, lastmod }) => {
        const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''
        return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`
      })
      .join('\n') +
    `\n</urlset>\n`

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
  res.setHeader('Vary', 'Host, X-Forwarded-Host, X-Forwarded-Proto')
  res.setHeader('X-Sitemap-Articles', String(articleUrls.length))
  res.setHeader('X-Sitemap-BaseUrl', baseUrl)
  res.end(req.method === 'HEAD' ? '' : xml)
}
