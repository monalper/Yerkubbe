import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createArticle } from '../../features/articles/queries'
import { ArticleEditor } from '../../features/editor/ArticleEditor'
import styles from './admin.module.css'

export function AdminArticleNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: createArticle,
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['admin', 'articles'] })
      navigate(`/admin/articles/${row.id}/edit`, { replace: true })
    },
  })

  return (
    <section>
      <h1 className={styles.h1}>Yeni makale</h1>
      <ArticleEditor
        mode="create"
        saving={mut.isPending}
        onSave={async (draft) => {
          await mut.mutateAsync(draft)
        }}
      />
    </section>
  )
}
