import { Link } from 'react-router-dom'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function DeveloperAuthorshipRequestPage() {
  return (
    <section className={styles.prose}>
      <Seo
        title="Geliştirici & Yazarlık Talebi"
        description="Yerkubbe için geliştirici ve yazarlık talepleri."
      />
      <h1 className={styles.h1}>Geliştirici &amp; Yazarlık Talebi</h1>
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

