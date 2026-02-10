export type ArticleStatus = 'draft' | 'published'

export type ArticleSource = {
  key: string
  title: string
  url: string
  accessed_at: string
}

export type ArticleRow = {
  id: string
  title: string
  slug: string
  lead: string | null
  tags: string[] | null
  status: ArticleStatus
  heading_numbering: boolean | null
  content_json: unknown | null
  content_text: string | null
  sources_json: ArticleSource[] | null
  created_by: string | null
  created_at: string | null
  published_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export type ArticleSearchResult = {
  id: string
  slug: string
  title: string
  lead: string | null
  tags: string[] | null
  snippet: string | null
}

export type ArticleSaveDraft = {
  title: string
  slug: string
  lead: string
  tags: string[]
  status: ArticleStatus
  heading_numbering: boolean
  content_json: unknown
  content_text: string
  sources_json: ArticleSource[]
}
