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

  const txt = `User-agent: *\nDisallow: /admin/\n\nSitemap: ${baseUrl}/sitemap.xml\n`

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800')
  res.setHeader('Vary', 'Host, X-Forwarded-Host, X-Forwarded-Proto')
  res.setHeader('X-Robots-BaseUrl', baseUrl)
  res.end(req.method === 'HEAD' ? '' : txt)
}
