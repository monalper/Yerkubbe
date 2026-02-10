import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthProvider'
import styles from './nav.module.css'

export function AdminNav() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <img className={styles.logo} src="/logo.svg" alt="Yerkubbe" />
        </Link>
        <nav aria-label="Admin">
          <NavLink className={styles.navItem} to="/admin/articles">
            Makaleler
          </NavLink>
          <NavLink className={styles.navItem} to="/admin/articles/new">
            Yeni
          </NavLink>
        </nav>
        <button
          type="button"
          className={styles.buttonLink}
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
        >
          Çıkış
        </button>
      </div>
    </header>
  )
}
