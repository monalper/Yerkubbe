import { supabase } from '../../lib/supabaseClient'
import type { ArticleRow, ArticleSaveDraft, ArticleSearchResult, ArticleStatus } from './types'

function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    const v = raw.trim()
    if (!v) continue
    const key = v.toLocaleLowerCase('tr-TR')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

export async function listPublishedArticles(): Promise<Pick<ArticleRow, 'id' | 'title' | 'slug' | 'lead' | 'tags'>[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,title,slug,lead,tags')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as any
}

export async function getArticleBySlug(slug: string): Promise<ArticleRow | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return (data as any) ?? null
}

export async function listAdminArticles(args: {
  q: string
  status: ArticleStatus | null
}): Promise<Pick<ArticleRow, 'id' | 'title' | 'slug' | 'status' | 'published_at' | 'updated_at'>[]> {
  let qy = supabase
    .from('articles')
    .select('id,title,slug,status,published_at,updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (args.status) qy = qy.eq('status', args.status)
  if (args.q) {
    const like = `%${args.q}%`
    qy = qy.or(`title.ilike.${like},slug.ilike.${like}`)
  }

  const { data, error } = await qy.limit(200)
  if (error) throw error
  return (data ?? []) as any
}

export async function getAdminArticleById(id: string): Promise<ArticleRow | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as any) ?? null
}

export async function createArticle(draft: ArticleSaveDraft): Promise<Pick<ArticleRow, 'id'> & { id: string }> {
  const payload = {
    ...draft,
    tags: normalizeTags(draft.tags),
    lead: draft.lead.trim(),
    content_text: draft.content_text ?? '',
  }

  const { data, error } = await supabase.from('articles').insert(payload).select('id').single()
  if (error) throw error
  return data as any
}

export async function updateArticle(args: { id: string; patch: ArticleSaveDraft }): Promise<void> {
  const payload = {
    ...args.patch,
    tags: normalizeTags(args.patch.tags),
    lead: args.patch.lead.trim(),
    content_text: args.patch.content_text ?? '',
  }
  const { error } = await supabase.from('articles').update(payload).eq('id', args.id)
  if (error) throw error
}

export async function updateArticleStatus(args: { id: string; status: ArticleStatus }): Promise<void> {
  const patch: any = { status: args.status }
  if (args.status === 'published') patch.published_at = new Date().toISOString()
  else patch.published_at = null
  const { error } = await supabase.from('articles').update(patch).eq('id', args.id)
  if (error) throw error
}

export async function deleteArticle(args: { id: string }): Promise<void> {
  const { error } = await supabase.from('articles').update({ deleted_at: new Date().toISOString() }).eq('id', args.id)
  if (error) throw error
}

export async function searchArticles(q: string): Promise<ArticleSearchResult[]> {
  const query = q.trim()
  if (!query) return []

  const { data: rpcData, error: rpcError } = await supabase.rpc('search_articles', { q: query })
  if (!rpcError && Array.isArray(rpcData)) return rpcData as any

  const like = `%${query}%`
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,title,lead,tags')
    .eq('status', 'published')
    .is('deleted_at', null)
    .or(`title.ilike.${like},lead.ilike.${like},content_text.ilike.${like}`)
    .limit(50)
  if (error) throw error
  return (data ?? []).map((r: any) => ({ ...r, snippet: null })) as any
}

export async function checkSlugsExist(slugs: string[]): Promise<{ existing: string[]; missing: string[] }> {
  const uniq = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)))
  if (uniq.length === 0) return { existing: [], missing: [] }
  const { data, error } = await supabase
    .from('articles')
    .select('slug')
    .in('slug', uniq)
    .is('deleted_at', null)
  if (error) throw error
  const existing = (data ?? []).map((r: any) => String(r.slug))
  const set = new Set(existing)
  const missing = uniq.filter((s) => !set.has(s))
  return { existing, missing }
}

export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  let qy = supabase.from('articles').select('id').eq('slug', slug).is('deleted_at', null).limit(1)
  if (exceptId) qy = qy.neq('id', exceptId)
  const { data, error } = await qy
  if (error) throw error
  return (data ?? []).length > 0
}

export async function pickUniqueSlug(base: string, exceptId?: string): Promise<string> {
  const cleaned = base.trim()
  if (!cleaned) return cleaned
  if (!(await isSlugTaken(cleaned, exceptId))) return cleaned
  for (let i = 2; i < 50; i += 1) {
    const next = `${cleaned}-${i}`
    if (!(await isSlugTaken(next, exceptId))) return next
  }
  return `${cleaned}-${Date.now()}`
}

export async function listAllSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('articles').select('slug').is('deleted_at', null).limit(2000)
  if (error) throw error
  return (data ?? []).map((r: any) => String(r.slug))
}
