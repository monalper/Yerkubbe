import fs from 'node:fs/promises'
import path from 'node:path'

function stripQuotes(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

async function loadDotEnvIfPresent(dotenvPath) {
  try {
    const raw = await fs.readFile(dotenvPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const l = line.trim()
      if (!l || l.startsWith('#')) continue
      const eq = l.indexOf('=')
      if (eq === -1) continue
      const key = l.slice(0, eq).trim()
      const value = stripQuotes(l.slice(eq + 1))
      if (!key) continue
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // ignore
  }
}

function normalizeBaseUrl(input) {
  if (!input) return null
  let url = input.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  url = url.replace(/\/+$/, '')
  return url
}

function escapeXml(text) {
  return text
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

async function fetchArticleUrls({ supabaseUrl, supabaseAnonKey, baseUrl }) {
  if (!supabaseUrl || !supabaseAnonKey) return []
  try {
    const mod = await import('@supabase/supabase-js')
    const createClient = mod.createClient
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const pageSize = 1000
    const urls = []
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('articles')
        .select('slug,updated_at,published_at,deleted_at,status')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      const batch = (data ?? [])
        .map((row) => {
          const slug = typeof row.slug === 'string' ? row.slug : null
          if (!slug) return null
          const loc = `${baseUrl}/text/${encodeURIComponent(slug)}`
          const lastmod = isoDateOnly(row.updated_at ?? row.published_at)
          return { loc, lastmod }
        })
        .filter(Boolean)

      urls.push(...batch)
      if (!data || data.length < pageSize) break
    }

    return urls
  } catch (e) {
    console.warn('[postbuild] sitemap: Supabase fetch skipped:', e?.message ?? e)
    return []
  }
}

async function main() {
  await loadDotEnvIfPresent(path.resolve('.env'))

  const distDir = path.resolve('dist')
  const baseUrl =
    normalizeBaseUrl(process.env.VITE_SITE_URL) ??
    normalizeBaseUrl(process.env.SITE_URL) ??
    normalizeBaseUrl(process.env.PUBLIC_SITE_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL)

  const effectiveBaseUrl = baseUrl ?? 'https://yerkubbe.com'
  if (!baseUrl) {
    console.warn(
      '[postbuild] VITE_SITE_URL missing; sitemap/robots will default to https://yerkubbe.com'
    )
  }

  const buildDate = isoDateOnly(new Date())
  const staticPaths = [
    '/',
    '/about',
    '/kullanim-haklari',
    '/sorumluluk-reddi',
    '/destekle',
    '/gelistirici-yazarlik-talebi',
  ]
  const staticUrls = staticPaths.map((p) => ({
    loc: `${effectiveBaseUrl}${p}`,
    lastmod: buildDate,
  }))

  const articleUrls = await fetchArticleUrls({
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    baseUrl: effectiveBaseUrl,
  })

  const urls = [...staticUrls, ...articleUrls]

  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(({ loc, lastmod }) => {
        const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''
        return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`
      })
      .join('\n') +
    `\n</urlset>\n`

  const robotsTxt =
    `User-agent: *\n` +
    `Disallow: /admin/\n` +
    `\n` +
    `Sitemap: ${effectiveBaseUrl}/sitemap.xml\n`

  await fs.mkdir(distDir, { recursive: true })
  await Promise.all([
    fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8'),
    fs.writeFile(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8'),
  ])

  console.log(`[postbuild] wrote ${urls.length} urls to dist/sitemap.xml`)
}

main().catch((e) => {
  console.error('[postbuild] failed:', e)
  process.exitCode = 1
})
