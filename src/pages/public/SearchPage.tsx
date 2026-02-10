import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { listPublishedArticles, searchArticles } from '../../features/articles/queries'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const showAll = q.length === 0
  const pageSize = 20

  function getPreview(text: string | null, maxChars = 240) {
    const cleaned = (text ?? '').replace(/\s+/g, ' ').trim()
    if (!cleaned) return null
    if (cleaned.length <= maxChars) return cleaned
    return `${cleaned.slice(0, maxChars).trimEnd()}…`
  }

  function getPageParam() {
    const raw = (params.get('page') ?? '').trim()
    if (!raw) return 1
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return 1
    return Math.max(1, n)
  }

  function makeSearchHref(nextPage: number) {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (nextPage > 1) sp.set('page', String(nextPage))
    const qs = sp.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  const { data: allData, isLoading: allLoading, error: allError } = useQuery({
    queryKey: ['articles', 'published'],
    queryFn: listPublishedArticles,
    enabled: showAll,
  })

  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchArticles(q),
    enabled: !showAll,
  })

  const isLoading = showAll ? allLoading : searchLoading
  const error = showAll ? allError : searchError
  const items: any[] = showAll ? (allData ?? []) : (searchData ?? [])

  const totalPagesRaw = Math.ceil(items.length / pageSize)
  const totalPages = Math.max(1, Number.isFinite(totalPagesRaw) ? totalPagesRaw : 1)
  const currentPage = Math.min(getPageParam(), totalPages)
  const startIndex = (currentPage - 1) * pageSize
      const pagedItems = items.slice(startIndex, startIndex + pageSize)

  function getPager() {
    if (totalPages <= 1) return []
    const out: Array<number | '…'> = []
    const add = (v: number | '…') => {
      if (out[out.length - 1] === v) return
      out.push(v)
    }

    add(1)
    if (totalPages === 2) {
      add(2)
      return out
    }

    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)

    if (start > 2) add('…')
    for (let p = start; p <= end; p += 1) add(p)
    if (end < totalPages - 1) add('…')
    add(totalPages)

    return out
  }

  return (
    <section>
      <Seo title="Keşfet" description="Yerkubbe içinde makale ara." noindex />
      <h1 className={styles.h1}>Keşfet</h1>
      {q ? <p className={styles.lead}>Sorgu: “{q}”</p> : <p className={styles.lead}>Tüm yazılar.</p>}

      {isLoading ? <p className={styles.muted}>Yükleniyor…</p> : null}
      {error ? <p className={styles.muted}>Bir hata oluştu.</p> : null}

      <ul className={styles.searchGrid} aria-label={showAll ? 'Yazı listesi' : 'Keşfet sonuçları'}>
        {pagedItems.map((r) => (
          <li key={r.id} className={styles.searchCard}>
            <Link to={`/text/${r.slug}`} className={styles.searchTitle}>
              {r.title}
            </Link>

            {!showAll && r.snippet ? (
              <p className={styles.searchSnippet} dangerouslySetInnerHTML={{ __html: r.snippet }} />
            ) : (
              (() => {
                const preview = r.lead ? String(r.lead) : getPreview(r.content_text)
                return preview ? <p className={styles.searchSnippet}>{preview}</p> : null
              })()
            )}
            {r.tags?.length ? (
              <p className={styles.searchMeta}>
                {r.tags.map((t: string) => (
                  <span key={t} className={styles.searchTag}>
                    {t}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {!isLoading && !error && totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Sayfa navigasyonu">
          <div className={styles.paginationInner}>
            {currentPage > 1 ? (
              <Link className={styles.pageNav} to={makeSearchHref(currentPage - 1)} aria-label="Önceki sayfa">
                ‹
              </Link>
            ) : (
              <span className={styles.pageNav} aria-disabled="true">
                ‹
              </span>
            )}

            <div className={styles.pageNumbers} aria-label="Sayfalar">
              {getPager().map((p, idx) =>
                p === '…' ? (
                  <span key={`e-${idx}`} className={styles.pageEllipsis} aria-hidden="true">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    to={makeSearchHref(p)}
                    className={styles.pageLink}
                    aria-current={p === currentPage ? 'page' : undefined}
                    data-active={p === currentPage ? 'true' : 'false'}
                  >
                    {p}
                  </Link>
                ),
              )}
            </div>

            {currentPage < totalPages ? (
              <Link className={styles.pageNav} to={makeSearchHref(currentPage + 1)} aria-label="Sonraki sayfa">
                ›
              </Link>
            ) : (
              <span className={styles.pageNav} aria-disabled="true">
                ›
              </span>
            )}

            <p className={styles.pageStatus}>
              Sayfa {currentPage} / {totalPages}
            </p>
          </div>
        </nav>
      ) : null}
    </section>
  )
}
