import { Link } from 'react-router-dom'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function UsageRightsPage() {
  return (
    <section className={styles.prose}>
      <Seo title="Kullanım hakları" description="Yerkubbe kullanım hakları." />
      <h1 className={styles.h1}>Kullanım hakları</h1>
      <p className={styles.lead}>Bu sayfa yakında güncellenecek.</p>

      <div className={styles.actions}>
        <Link to="/" className={styles.primaryLink}>
          Anasayfa
        </Link>
        <Link to="/about" className={styles.secondaryLink}>
          Yerkubbe Nedir?
        </Link>
      </div>
    </section>
  )
}

