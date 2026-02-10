import { Link } from 'react-router-dom'
import styles from './footer.module.css'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer} aria-label="Site altbilgisi">
      <div className={styles.inner}>
        {/* Sol Kısım */}
        <div className={styles.brandSection}>
          <Link to="/" className={styles.brandLink} aria-label="Ana sayfaya dön">
            <img
              className={styles.logo}
              src="/logo.svg"
              alt="Yerkubbe"
              loading="lazy"
              decoding="async"
            />
          </Link>

          <p className={styles.description}>
            Modern kütüphane yönetim sistemi ile bilgiye erişimi dijitalleştiriyor,
            kaynaklarınızı profesyonel bir altyapıyla sunuyoruz.
          </p>

          <div className={styles.motto}>
            <span className={styles.mottoLabel}>Arşiv Kaydı</span>
            <span className={styles.mottoText}>
              Bilgi kalıcıdır, düzen onun muhafızıdır.
            </span>
          </div>
        </div>

        {/* Sağ Kısım */}
        <nav className={styles.nav} aria-label="Footer Navigasyon">
          <div className={styles.navGroup}>
            <span className={styles.groupTitle}>Platform</span>
            <Link className={styles.link} to="/">Anasayfa</Link>
            <Link className={styles.link} to="/search">Katalogda Ara</Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.groupTitle}>Kurumsal</span>
            <Link className={styles.link} to="/admin/login">Admin Paneli</Link>
            <Link className={styles.link} to="/about">Hakkımızda</Link>
          </div>
        </nav>
      </div>

      {/* Alt Bar */}
      <div className={styles.bottomBar}>
        <div>© {year} Yerkubbe. Tüm hakları saklıdır.</div>
        <div className={styles.legalLinks}>
          <span>Gizlilik Politikası</span>
          <span className={styles.dot}>•</span>
          <span>Kullanım Şartları</span>
        </div>
      </div>
    </footer>
  )
}
