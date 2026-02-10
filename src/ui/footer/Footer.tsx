import { Link } from 'react-router-dom'
import styles from './footer.module.css'

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} aria-label="Site altbilgisi">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.brandName} aria-label="Yerkubbe ana sayfaya dön">
            Yerkubbe
          </Link>
          <span className={styles.license}>
            © {currentYear} Tüm hakları saklıdır.
          </span>
        </div>

        <nav className={styles.nav} aria-label="Kurumsal bağlantılar">
          <Link className={styles.link} to="/about">
            Yerkubbe Nedir?
          </Link>
          <Link className={styles.link} to="/gelistirici-yazarlik-talebi">
            Yazarlık Talebi
          </Link>
          <Link className={styles.link} to="/destekle">
            Destekle
          </Link>
          <Link className={styles.link} to="/kullanim-haklari">
            Kullanım
          </Link>
          <Link className={styles.link} to="/sorumluluk-reddi">
            Sorumluluk Reddi
          </Link>
        </nav>
      </div>
    </footer>
  )
}