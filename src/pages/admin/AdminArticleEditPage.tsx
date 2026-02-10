import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminArticleById, updateArticle } from '../../features/articles/queries'
import { ArticleEditor } from '../../features/editor/ArticleEditor'
import styles from './admin.module.css'

export function AdminArticleEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'article', id],
    queryFn: () => getAdminArticleById(id!),
    enabled: Boolean(id),
  })

  const mut = useMutation({
    mutationFn: updateArticle,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'article', id] })
    },
  })

  if (isLoading) return <p className={styles.muted}>Yükleniyor…</p>
  if (!data) return <p className={styles.muted}>Makale bulunamadı.</p>

  return (
    <section>
      <div className={styles.headerRow}>
        <h1 className={styles.h1}>Düzenle</h1>
        <button type="button" className={styles.buttonLink} onClick={() => navigate('/admin/articles')}>
          Listeye dön
        </button>
      </div>
      <ArticleEditor
        mode="edit"
        initial={data}
        saving={mut.isPending}
        onSave={async (draft) => {
          await mut.mutateAsync({ id: data.id, patch: draft })
        }}
      />
    </section>
  )
}
