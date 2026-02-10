import { Link, useLocation } from 'react-router-dom'
import styles from './admin.module.css'

export function AdminNotFoundPage() {
  const location = useLocation()
  const attempted = `${location.pathname}${location.search}${location.hash}`

  return (
    <section>
      <h1 className={styles.h1}>Sayfa bulunamadı</h1>
      <p className={styles.muted}>
        Bu admin sayfası yok: <code>{attempted}</code>
      </p>
      <div className={styles.controls}>
        <Link to="/admin/articles" className={styles.primaryLink}>
          Makaleler
        </Link>
        <Link to="/" className={styles.buttonLink}>
          Siteye dön
        </Link>
      </div>
    </section>
  )
}

