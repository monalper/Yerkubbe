import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Search as SearchIcon } from 'lucide-react'
import { Seo } from '../../lib/seo/Seo'
import styles from './public.module.css'

export function HomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const hasQuery = q.trim().length > 0

  return (
    <section className={styles.homeShell}>
      <Seo title="Anasayfa" description="Yerkubbe: özgür metin arşivi." />

      <div className={styles.homeMain}>
        <header className={styles.homeHero}>
          <h1 className={styles.homeTitle}>Yerkubbe</h1>
          <p className={styles.homeTagline}>(Yerkkube gerçek bir terim değildir.)</p>

          <form
            className={styles.homeSearchForm}
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              const next = q.trim()
              navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
            }}
          >
            <label className="srOnly" htmlFor="homeq">
              Ara
            </label>
            <SearchIcon className={styles.homeSearchIcon} aria-hidden />
            <input
              id="homeq"
              name="q"
              className={styles.homeSearchInput}
              placeholder="Yerkubbe'de ara…"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
            />
            <button
              className={styles.homeSearchGo}
              type="submit"
              aria-label={hasQuery ? 'Ara' : 'Keşfet sayfasına git'}
              data-active={hasQuery ? 'true' : 'false'}
            >
              <ArrowRight className={styles.homeSearchGoIcon} aria-hidden />
            </button>
          </form>

          <nav className={styles.homeQuickLinks} aria-label="Kısa bağlantılar">
            <Link className={styles.homeQuickLink} to="/search">
              Tüm Yazılar
            </Link>
            <Link className={styles.homeQuickLink} to="/text/birinci-rehber">
              Yerkubbe Nedir?
            </Link>
          </nav>
        </header>
      </div>
    </section>
  )
}
