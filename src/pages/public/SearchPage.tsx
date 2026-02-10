import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { searchArticles } from '../../features/articles/queries'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchArticles(q),
    enabled: q.length > 0,
  })

  return (
      <section>
      <Seo title="Arama" description="Yerkubbe içinde makale ara." noindex />
      <h1 className={styles.h1}>Arama</h1>
      {q ? <p className={styles.lead}>Sorgu: “{q}”</p> : <p className={styles.muted}>Bir arama terimi gir.</p>}

      {isLoading ? <p className={styles.muted}>Yükleniyor…</p> : null}

      <ul className={styles.list} aria-label="Arama sonuçları">
        {(data ?? []).map((r) => (
          <li key={r.id} className={styles.listItem}>
            <Link to={`/text/${r.slug}`} className={styles.title}>
              {r.title}
            </Link>
            {r.snippet ? (
              <p className={styles.snippet} dangerouslySetInnerHTML={{ __html: r.snippet }} />
            ) : r.lead ? (
              <p className={styles.snippet}>{r.lead}</p>
            ) : null}
            {r.tags?.length ? <p className={styles.meta}>{r.tags.join(' · ')}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
