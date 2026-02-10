import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { checkSlugsExist, getArticleBySlug } from '../../features/articles/queries'
import { ArticleRenderer } from '../../features/reader/ArticleRenderer'
import { extractInternalSlugs } from '../../features/reader/docUtils'
import { Seo } from '../../lib/seo/Seo'
import { getSiteOrigin, SITE_NAME } from '../../lib/seo/site'
import { toMetaDescription } from '../../lib/seo/text'
import styles from './public.module.css'

export function ArticlePage() {
  const { slug } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['article', 'slug', slug],
    queryFn: () => getArticleBySlug(slug!),
    enabled: Boolean(slug),
  })

  const internalSlugs = useMemo(() => extractInternalSlugs(data?.content_json ?? null), [data?.content_json])
  const { data: slugCheck } = useQuery({
    queryKey: ['slugs', 'exist', internalSlugs],
    queryFn: () => checkSlugsExist(internalSlugs),
    enabled: internalSlugs.length > 0,
  })

  const canonicalPathFromParam = slug ? `/text/${encodeURIComponent(slug)}` : null

  if (isLoading) {
    return (
      <>
        <Seo title="Makale" description="Makale yükleniyor." canonicalPath={canonicalPathFromParam} />
        <p className={styles.muted}>Yükleniyor…</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Seo title="Makale" description="Makale yüklenemedi." canonicalPath={canonicalPathFromParam} />
        <p className={styles.muted}>Makale yüklenemedi.</p>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <Seo
          title="Makale bulunamadı"
          description="Makale bulunamadı."
          canonicalPath={canonicalPathFromParam}
          noindex
        />
        <p className={styles.muted}>Makale bulunamadı.</p>
      </>
    )
  }

  const missing = (slugCheck?.missing ?? []).slice(0, 10)
  const canonicalPath = `/text/${encodeURIComponent(data.slug)}`
  const description = toMetaDescription(data.lead) ?? toMetaDescription(data.content_text) ?? null
  const origin = getSiteOrigin()
  const canonicalUrl = origin ? new URL(canonicalPath, origin).toString() : null
  const logoUrl = origin ? new URL('/logo.svg', origin).toString() : null

  const jsonLd = canonicalUrl
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: origin ? new URL('/', origin).toString() : '/' },
            { '@type': 'ListItem', position: 2, name: data.title, item: canonicalUrl },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
          headline: data.title,
          description: description ?? undefined,
          datePublished: data.published_at ?? undefined,
          dateModified: data.updated_at ?? data.published_at ?? undefined,
          inLanguage: 'tr-TR',
          author: { '@type': 'Organization', name: SITE_NAME },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: logoUrl ? { '@type': 'ImageObject', url: logoUrl } : undefined,
          },
          url: canonicalUrl,
          keywords: data.tags?.length ? data.tags.join(', ') : undefined,
        },
      ]
    : null

  return (
    <>
      <Seo
        title={data.title}
        description={description}
        canonicalPath={canonicalPath}
        ogType="article"
        publishedTime={data.published_at}
        modifiedTime={data.updated_at ?? data.published_at}
        tags={data.tags}
        jsonLd={jsonLd}
      />
      <article className={styles.article}>
        <ArticleRenderer article={data} missingInternalSlugs={missing} />
      </article>
    </>
  )
}
