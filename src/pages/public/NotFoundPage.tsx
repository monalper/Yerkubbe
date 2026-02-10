import { Link, useLocation } from 'react-router-dom'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function NotFoundPage() {
  const location = useLocation()
  const attempted = `${location.pathname}${location.search}${location.hash}`

  return (
    <section>
      <Seo title="Sayfa bulunamadı" description="Aradığın sayfa bulunamadı." noindex />
      <p className={styles.notFoundCode} aria-hidden>
        404
      </p>
      <h1 className={styles.h1}>Sayfa bulunamadı</h1>
      <p className={styles.lead}>
        Aradığın sayfa mevcut değil: <span className={styles.path}>{attempted}</span>
      </p>
      <div className={styles.actions}>
        <Link to="/" className={styles.primaryLink}>
          Anasayfa
        </Link>
        <Link to="/search" className={styles.secondaryLink}>
          Arama
        </Link>
      </div>
    </section>
  )
}
