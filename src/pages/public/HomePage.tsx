import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listPublishedArticles } from '../../features/articles/queries'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['articles', 'published'],
    queryFn: listPublishedArticles,
  })

    return (
      <section>
      <Seo title="Makaleler" description="Yayınlanmış metinler. Yerkubbe arşivindeki tüm makaleleri burada bulabilirsin." />
      <h1 className={styles.h1}>Makaleler</h1>
      <p className={styles.lead}>Yayınlanmış metinler.</p>

      {isLoading && <p className={styles.muted}>Yükleniyor…</p>}
      {error && <p className={styles.muted}>Bir hata oluştu.</p>}

      <ul className={styles.list} aria-label="Makale listesi">
        {(data ?? []).map((a) => (
          <li key={a.id} className={styles.listItem}>
            <Link to={`/text/${a.slug}`} className={styles.title}>
              {a.title}
            </Link>
            {a.lead ? <p className={styles.snippet}>{a.lead}</p> : null}
            {a.tags?.length ? <p className={styles.meta}>{a.tags.join(' · ')}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
