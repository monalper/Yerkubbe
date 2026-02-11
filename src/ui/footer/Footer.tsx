import { Link } from 'react-router-dom'
import styles from './footer.module.css'

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} aria-label="Site altbilgisi">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.brandName} aria-label="Yerkubbe ana sayfaya dön">
            
          </Link>
          <span className={styles.license}>
            © {currentYear} Yerkubbe Tüm hakları saklıdır.
          </span>
        </div>

        <nav className={styles.nav} aria-label="Kurumsal bağlantılar">
          <Link className={styles.link} to="/text/birinci-rehber">
            Yerkubbe Nedir?
          </Link>
          <Link className={styles.link} to="/text/ikinci-rehber">
            Yazarlık Talebi
          </Link>
          <Link className={styles.link} to="/text/ikinci-rehber#destekle">
            Destekle
          </Link>
          <Link className={styles.link} to="/text/ucuncu-rehber#kullanim">
            Kullanım
          </Link>
          <Link className={styles.link} to="/text/ucuncu-rehber#sorumluluk-reddi">
            Sorumluluk Reddi
          </Link>
        </nav>
      </div>
    </footer>
  )
}
