import { useEffect, useRef, useState } from 'react'
import { Form, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Search as SearchIcon, X } from 'lucide-react'
import { useAuth } from '../../lib/auth/AuthProvider'
import styles from './nav.module.css'

export function TopNav({ wide }: { wide?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const urlQ = (params.get('q') ?? '').trim()
  const { session, profile } = useAuth()
  const showAdmin = Boolean(session?.user && profile?.role === 'admin')

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const popupOpen = menuOpen || searchOpen

  const [searchValue, setSearchValue] = useState(urlQ)

  useEffect(() => {
    if (!searchOpen) setSearchValue(urlQ)
  }, [urlQ, searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [searchOpen])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!popupOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [popupOpen])

  useEffect(() => {
    if (!popupOpen) return

    function onScroll() {
      setMenuOpen(false)
      setSearchOpen(false)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [popupOpen])

  const headerClassName = [styles.header, popupOpen ? styles.headerExpanded : null, wide ? styles.headerWide : null]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClassName}>
      <div className={styles.topInner}>
        <Link to="/" className={styles.brand} aria-label="Yerkubbe">
          Yerkubbe
        </Link>

        <div className={styles.actions}>
          <div className={styles.searchInline}>
            <Form
              role="search"
              className={styles.searchInlineForm}
              onSubmit={(e) => {
                e.preventDefault()
                const next = searchValue.trim()
                setSearchOpen(false)
                navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
              }}
            >
              <label className="srOnly" htmlFor="navq">
                Ara
              </label>
              <div className={`${styles.searchInlineShell} ${searchOpen ? styles.searchInlineShellOpen : ''}`}>
                <div className={styles.searchField}>
                  <SearchIcon className={styles.searchIcon} aria-hidden />
                  <input
                    id="navq"
                    ref={searchInputRef}
                    name="q"
                    className={styles.searchInput}
                    placeholder="Yerkubbe'de Ara…"
                    autoComplete="off"
                    value={searchValue}
                    disabled={!searchOpen}
                    tabIndex={searchOpen ? 0 : -1}
                    onChange={(e) => setSearchValue(e.currentTarget.value)}
                  />
                </div>
              </div>
            </Form>

            <button
              type="button"
              className={styles.iconButton}
              aria-label={searchOpen ? 'Kapat' : 'Arama'}
              aria-controls="navq"
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen((v) => !v)
                setMenuOpen(false)
              }}
            >
              {searchOpen ? (
                <X className={styles.icon} aria-hidden />
              ) : (
                <SearchIcon className={styles.icon} aria-hidden />
              )}
            </button>
          </div>

          <button
            type="button"
            className={styles.iconButton}
            aria-label="Menü"
            aria-controls="topnav-menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v)
              setSearchOpen(false)
            }}
          >
            {menuOpen ? <X className={styles.icon} aria-hidden /> : <Menu className={styles.icon} aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className={styles.dropdownWrap}>
          <div
            id="topnav-menu"
            className={`${styles.menuPanel} ${styles.menuPanelBare}`}
            role="dialog"
            aria-modal="true"
            aria-label="Gezinme"
            onPointerDown={(e) => e.stopPropagation()}
          >
              <nav className={styles.menuNav} aria-label="Sayfalar">
                <Link to="/" className={styles.menuLink} onClick={() => setMenuOpen(false)}>
                  Anasayfa
                </Link>
                <Link to="/search" className={styles.menuLink} onClick={() => setMenuOpen(false)}>
                  Arama
                </Link>
                <Link to="/about" className={styles.menuLink} onClick={() => setMenuOpen(false)}>
                  Hakkımızda
                </Link>
                {showAdmin ? (
                  <>
                    <div className={styles.menuDivider} aria-hidden />
                    <Link to="/admin/articles" className={styles.menuLink} onClick={() => setMenuOpen(false)}>
                      Admin
                    </Link>
                  </>
                ) : null}
              </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
