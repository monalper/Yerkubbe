import { Link } from 'react-router-dom'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function AboutPage() {
  return (
    <section className={styles.prose}>
      <Seo
        title="Hakkımızda"
        description="Yerkubbe, metinleri düzenli yayınlamak ve hızlı erişilebilir bir bilgi arşivi oluşturmak için hazırlanmış bir makale kütüphanesidir."
      />
      <h1 className={styles.h1}>Hakkımızda</h1>
      <p className={styles.lead}>
        Yerkubbe, metinleri düzenli bir şekilde yayınlamak ve hızlı erişilebilir bir bilgi arşivi oluşturmak için
        hazırlanmış bir makale kütüphanesidir.
      </p>

      <h2 className={styles.h2}>Neler yapabilirsin?</h2>
      <ul className={styles.bullets}>
        <li>Makaleleri anasayfadan listeleyebilir veya arama ile hızlıca bulabilirsin.</li>
        <li>
          Makale sayfalarında başlıklar bağlantı (anchor) üretir; böylece belirli bir bölüme doğrudan link
          paylaşabilirsin.
        </li>
        <li>Kaynak/atıf numaraları (örn. [1]) ile referans verilen bölümleri takip edebilirsin.</li>
      </ul>

      <h2 className={styles.h2}>İç linkler</h2>
      <p className={styles.paragraph}>
        Site içi bağlantı formatı <code className={styles.code}>/text/&lt;slug&gt;</code> şeklindedir. Eğer bir link
        kırık görünüyorsa ilgili makale henüz yayınlanmamış olabilir veya başlık değiştirilmiş olabilir.
      </p>

      <h2 className={styles.h2}>İletişim</h2>
      <p className={styles.paragraph}>
        Geri bildirim veya düzeltme önerilerin için admin ile iletişime geçebilirsin.
      </p>

      <div className={styles.actions}>
        <Link to="/" className={styles.primaryLink}>
          Anasayfa
        </Link>
        <Link to="/search" className={styles.secondaryLink}>
          Keşfet
        </Link>
      </div>
    </section>
  )
}
