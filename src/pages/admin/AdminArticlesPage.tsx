import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteArticle, listAdminArticles, updateArticleStatus } from '../../features/articles/queries'
import type { ArticleStatus } from '../../features/articles/types'
import styles from './admin.module.css'

export function AdminArticlesPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const statusParam = (params.get('status') ?? '').trim()
  const status = statusParam === 'draft' || statusParam === 'published' ? statusParam : ''
  const qc = useQueryClient()

  const statusFilter: ArticleStatus | null = status === 'draft' || status === 'published' ? (status as ArticleStatus) : null

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'articles', { q, status }],
    queryFn: () => listAdminArticles({ q, status: statusFilter }),
  })

  const publishMut = useMutation({
    mutationFn: updateArticleStatus,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteArticle,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
    },
  })

  return (
    <section>
      <h1 className={styles.h1}>Makale yönetimi</h1>
      <div className={styles.controls} role="search">
        <label className="srOnly" htmlFor="aq">
          Ara
        </label>
        <input
          id="aq"
          className={styles.input}
          placeholder="Başlık/slug/etiket…"
          defaultValue={q}
          onChange={(e) => {
            const next = e.currentTarget.value
            setParams((p) => {
              const np = new URLSearchParams(p)
              if (next) np.set('q', next)
              else np.delete('q')
              return np
            })
          }}
        />
        <label className="srOnly" htmlFor="status">
          Durum
        </label>
        <select
          id="status"
          className={styles.input}
          defaultValue={status}
          onChange={(e) => {
            const next = e.currentTarget.value
            setParams((p) => {
              const np = new URLSearchParams(p)
              if (next) np.set('status', next)
              else np.delete('status')
              return np
            })
          }}
        >
          <option value="">Hepsi</option>
          <option value="draft">Taslak</option>
          <option value="published">Yayınlandı</option>
        </select>
        <Link className={styles.primaryLink} to="/admin/articles/new">
          Yeni makale
        </Link>
      </div>

      {isLoading ? <p className={styles.muted}>Yükleniyor…</p> : null}

      <ul className={styles.adminList} aria-label="Admin makaleler">
        {(data ?? []).map((a) => (
          <li key={a.id} className={styles.adminRow}>
            <div className={styles.adminMain}>
              <Link className={styles.adminTitle} to={`/admin/articles/${a.id}/edit`}>
                {a.title || '(Başlıksız)'}
              </Link>
              <div className={styles.adminMeta}>
                <span>/{a.slug}</span>
                <span>· {a.status}</span>
                {a.published_at ? <span>· yay: {new Date(a.published_at).toLocaleString()}</span> : null}
                {a.updated_at ? <span>· upd: {new Date(a.updated_at).toLocaleString()}</span> : null}
              </div>
            </div>
            <div className={styles.adminActions}>
              <button
                type="button"
                className={styles.buttonLink}
                onClick={() =>
                  publishMut.mutate({
                    id: a.id,
                    status: a.status === 'published' ? 'draft' : 'published',
                  })
                }
              >
                {a.status === 'published' ? 'Taslağa al' : 'Yayınla'}
              </button>
              <a className={styles.buttonLink} href={`/text/${a.slug}`} target="_blank" rel="noreferrer">
                Gör
              </a>
              <button
                type="button"
                className={styles.buttonLink}
                onClick={() => {
                  const ok = window.confirm('Silmek istiyor musun? (soft delete)')
                  if (!ok) return
                  deleteMut.mutate({ id: a.id })
                }}
              >
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
