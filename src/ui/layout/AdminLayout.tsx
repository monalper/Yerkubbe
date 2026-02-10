import { Outlet } from 'react-router-dom'
import { SkipLink } from '../primitives/SkipLink'
import { AdminNav } from '../nav/AdminNav'
import { Seo } from '../../lib/seo/Seo'
import styles from './layout.module.css'

export function AdminLayout() {
  return (
    <div className={styles.page}>
      <Seo title="Admin" description="Admin paneli." noindex />
      <SkipLink />
      <AdminNav />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
