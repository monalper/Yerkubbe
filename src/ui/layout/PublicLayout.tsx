import { Outlet, useLocation } from 'react-router-dom'
import { SkipLink } from '../primitives/SkipLink'
import { TopNav } from '../nav/TopNav'
import { Footer } from '../footer/Footer'
import styles from './layout.module.css'

export function PublicLayout() {
  const location = useLocation()
  const isArticleDetail = location.pathname.startsWith('/text/')

  return (
    <div className={styles.page}>
      <SkipLink />
      <TopNav wide />
      <main id="main" className={`${styles.main} ${isArticleDetail ? styles.mainArticle : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
