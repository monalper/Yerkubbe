import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Check, ChevronDown, ChevronRight, Link2, Linkedin, MessageCircle, Send, Twitter } from 'lucide-react'
import type { ArticleRow } from '../articles/types'
import { Citation } from '../shared/tiptap/Citation'
import { Figure } from '../shared/tiptap/Figure'
import { MathBlock, MathInline } from '../shared/tiptap/Math'
import { AnchoredHeading } from '../shared/tiptap/AnchoredHeading'
import { BrokenInternalLinks, setBrokenInternalSlugs } from '../shared/tiptap/BrokenInternalLinks'
import { WikiLink } from '../shared/tiptap/WikiLink'
import { extractHeadings } from './docUtils'
import styles from './reader.module.css'

type PMNode = { type?: string; attrs?: any; content?: PMNode[] }
type TocNode = { level: number; id: string; text: string; children: TocNode[] }

const FONT_SIZE_DEFAULT_PX = 16.5
const FONT_SIZE_MIN_PX = 14
const FONT_SIZE_MAX_PX = 22
const FONT_SIZE_STEP_PX = 0.5
const FONT_SIZE_STORAGE_KEY = 'a1.articleFontSizePx'

function clampFontSizePx(v: number) {
  if (!Number.isFinite(v)) return FONT_SIZE_DEFAULT_PX
  const snapped = Math.round(v / FONT_SIZE_STEP_PX) * FONT_SIZE_STEP_PX
  const clamped = Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, snapped))
  return Number(clamped.toFixed(1))
}

function extractCitationOrder(doc: unknown): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const visit = (n: PMNode | null | undefined) => {
    if (!n) return
    if (n.type === 'citation') {
      const k = String(n.attrs?.sourceKey ?? '')
      if (k && !seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
    for (const c of n.content ?? []) visit(c)
  }
  visit(doc as any)
  return keys
}

function buildTocTree(headings: { level: number; id: string; text: string }[]): TocNode[] {
  const root: TocNode[] = []
  const stack: TocNode[] = [{ level: 1, id: '__root__', text: '', children: root }]

  for (const h of headings) {
    const level = Math.min(6, Math.max(2, Number(h.level) || 2))
    const node: TocNode = { level, id: h.id, text: h.text, children: [] }

    while (stack.length > 1 && stack[stack.length - 1]!.level >= level) stack.pop()
    stack[stack.length - 1]!.children.push(node)
    stack.push(node)
  }

  return root
}

function computeHeadingNumbers(tocTree: TocNode[]) {
  const byId = new Map<string, string>()
  const visit = (nodes: TocNode[], prefix: number[]) => {
    nodes.forEach((n, idx) => {
      const parts = [...prefix, idx + 1]
      byId.set(n.id, parts.join('.'))
      if (n.children.length) visit(n.children, parts)
    })
  }
  visit(tocTree, [])
  return byId
}

function formatDateTR(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

function TocList({
  nodes,
  depth,
  activeId,
  expandedRootId,
  headingNumbers,
  showNumbers,
  onNavigate,
  onToggleRoot,
}: {
  nodes: TocNode[]
  depth: number
  activeId: string | null
  expandedRootId: string | null
  headingNumbers: Map<string, string>
  showNumbers: boolean
  onNavigate: (id: string) => void
  onToggleRoot: (id: string) => void
}) {
  if (!nodes.length) return null
  return (
    <ol className={styles.tocList}>
      {nodes.map((n) => (
        <li key={n.id} className={styles.tocItem} data-active={n.id === activeId ? 'true' : 'false'}>
          <div className={styles.tocRow}>
            <a
              className={styles.tocLink}
              href={`#${n.id}`}
              aria-current={n.id === activeId ? 'location' : undefined}
              onClick={(e) => {
                if (
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey ||
                  (e.currentTarget.target && e.currentTarget.target !== '_self')
                ) {
                  return
                }
                e.preventDefault()
                onNavigate(n.id)
              }}
            >
              {showNumbers ? <span className={styles.tocNum}>{headingNumbers.get(n.id)} </span> : null}
              <span className={styles.tocText}>{n.text}</span>
            </a>

            {depth === 0 && n.children.length ? (
              <button
                type="button"
                className={styles.tocItemToggle}
                aria-label={expandedRootId === n.id ? 'Bölümü kapat' : 'Bölümü aç'}
                aria-expanded={expandedRootId === n.id}
                onClick={() => onToggleRoot(n.id)}
              >
                {expandedRootId === n.id ? (
                  <ChevronDown size={16} aria-hidden="true" />
                ) : (
                  <ChevronRight size={16} aria-hidden="true" />
                )}
              </button>
            ) : null}
          </div>

          {n.children.length ? (
            <div
              className={styles.tocChildren}
              data-open={depth === 0 ? (expandedRootId === n.id ? 'true' : 'false') : 'true'}
            >
              <div className={styles.tocChildrenInner}>
                <div className={styles.tocSub}>
                  <TocList
                    nodes={n.children}
                    depth={depth + 1}
                    activeId={activeId}
                    expandedRootId={expandedRootId}
                    headingNumbers={headingNumbers}
                    showNumbers={showNumbers}
                    onNavigate={onNavigate}
                    onToggleRoot={onToggleRoot}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export function ArticleRenderer({
  article,
  missingInternalSlugs = [],
}: {
  article: ArticleRow
  missingInternalSlugs?: string[]
}) {
  const fontSizeId = useId()
  const fontSizeLabelId = useId()
  const fontSizePanelId = useId()
  const sharePanelId = useId()

  const [copied, setCopied] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(true)
  const [activeTocId, setActiveTocId] = useState<string | null>(null)
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null)
  const [fontSizePx, setFontSizePx] = useState(FONT_SIZE_DEFAULT_PX)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const toc = useMemo(() => extractHeadings(article.content_json), [article.content_json])
  const tocTree = useMemo(() => buildTocTree(toc), [toc])
  const tocIdToRootId = useMemo(() => {
    const m = new Map<string, string>()
    const visit = (nodes: TocNode[], rootId: string) => {
      for (const n of nodes) {
        m.set(n.id, rootId)
        if (n.children.length) visit(n.children, rootId)
      }
    }
    for (const root of tocTree) visit([root], root.id)
    return m
  }, [tocTree])
  const headingNumbers = useMemo(() => {
    if (!article.heading_numbering) return new Map<string, string>()
    return computeHeadingNumbers(tocTree)
  }, [article.heading_numbering, tocTree])
  const orderedCitationKeys = useMemo(() => extractCitationOrder(article.content_json), [article.content_json])
  const orderedSources = useMemo(() => {
    const sources = article.sources_json ?? []
    const byKey = new Map(sources.map((s) => [s.key, s]))
    const cited = orderedCitationKeys.map((k) => byKey.get(k)).filter(Boolean) as any[]
    const citedSet = new Set(cited.map((s) => s.key))
    const rest = sources.filter((s) => !citedSet.has(s.key))
    return [...cited, ...rest]
  }, [article.sources_json, orderedCitationKeys])

    const aboutItems = useMemo(() => {
      const items: { label: string; value: string }[] = []

      items.push({ label: 'Yazar', value: 'Yerkubbe' })

    const created = formatDateTR(article.created_at)
    if (created) items.push({ label: 'Yazım tarihi', value: created })

    const published = formatDateTR(article.published_at)
    if (published) items.push({ label: 'Yayımlanma', value: published })

    const updated = formatDateTR(article.updated_at)
    if (updated) items.push({ label: 'Güncelleme', value: updated })

    return items
  }, [article.created_at, article.published_at, article.updated_at])

  const editor = useEditor(
    {
      editable: false,
      extensions: [
        StarterKit.configure({ heading: false, link: false }),
        AnchoredHeading.configure({ levels: [2, 3, 4, 5, 6] }),
        Underline,
        WikiLink.configure({ openOnClick: true }),
        BrokenInternalLinks,
        Subscript,
        Superscript,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: '' }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        MathInline,
        MathBlock,
        Figure,
        Citation.configure({ sources: orderedSources }),
      ],
      content: (article.content_json as any) ?? { type: 'doc', content: [] },
    },
    [article.id],
  )

  useEffect(() => {
    const key = 'a1.tocOpen'
    try {
      const saved = window.localStorage.getItem(key)
      if (saved === '0' || saved === '1') {
        setTocOpen(saved === '1')
        return
      }

      const mql = window.matchMedia('(max-width: 1040px)')
      setTocOpen(!mql.matches)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const key = 'a1.tocOpen'
    try {
      window.localStorage.setItem(key, tocOpen ? '1' : '0')
    } catch {
      // ignore
    }
  }, [tocOpen])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY)
      if (saved == null) return
      const n = Number(saved)
      if (!Number.isFinite(n)) return
      setFontSizePx(clampFontSizePx(n))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizePx))
    } catch {
      // ignore
    }
  }, [fontSizePx])

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!editor) return
    setBrokenInternalSlugs(editor, missingInternalSlugs)
  }, [editor, missingInternalSlugs])

  useEffect(() => {
    if (!article.heading_numbering) return
    const root = containerRef.current
    if (!root) return
    const headings = Array.from(root.querySelectorAll('h2,h3,h4,h5,h6')) as HTMLElement[]
    for (const h of headings) {
      const id = h.getAttribute('id')
      if (!id) continue
      const num = headingNumbers.get(id)
      if (num) h.setAttribute('data-number', num)
      else h.removeAttribute('data-number')
    }
  }, [article.heading_numbering, headingNumbers, editor])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    if (!toc.length) return

    const tocIds = new Set(toc.map((h) => h.id))
    let headings: HTMLElement[] = []

    let raf = 0
    const TOP_OFFSET_PX = 120

    const computeActive = () => {
      if (!headings.length) return
      let current = headings[0]!.id
      for (const h of headings) {
        const top = h.getBoundingClientRect().top
        if (top - TOP_OFFSET_PX <= 0) current = h.id
        else break
      }
      setActiveTocId((prev) => (prev === current ? prev : current))

      const rootId = tocIdToRootId.get(current)
      if (rootId) setExpandedRootId((prev) => (prev === rootId ? prev : rootId))
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        computeActive()
      })
    }

    const collectHeadings = () => {
      headings = Array.from(root.querySelectorAll('h2[id],h3[id],h4[id],h5[id],h6[id]')).filter((el) =>
        tocIds.has((el as HTMLElement).id),
      ) as HTMLElement[]
      return headings.length
    }

    collectHeadings()
    computeActive()

    const mo = new MutationObserver(() => {
      if (collectHeadings()) computeActive()
    })
    mo.observe(root, { subtree: true, childList: true })

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      mo.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [toc, editor, tocIdToRootId])

  return (
    <div
      className={styles.wrap}
      data-has-toc={tocTree.length ? 'true' : 'false'}
      style={{ ['--article-font-size' as any]: `${fontSizePx}px` }}
    >
      {tocTree.length ? (
        <nav
          className={styles.toc}
          aria-label="İçindekiler"
          data-open={tocOpen ? 'true' : 'false'}
        >
          <div className={styles.about}>
            <div className={styles.aboutHead}>
              <p className={styles.aboutTitle}>Makale hakkında</p>
              <button
                type="button"
                className={styles.tocToggle}
                aria-expanded={aboutOpen}
                aria-controls="about-body"
                aria-label={aboutOpen ? 'Makale hakkında gizle' : 'Makale hakkında göster'}
                onClick={() => setAboutOpen((v) => !v)}
              >
                <span className="srOnly">{aboutOpen ? 'Gizle' : 'Göster'}</span>
                {aboutOpen ? (
                  <ChevronDown size={16} aria-hidden="true" />
                ) : (
                  <ChevronRight size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            <div id="about-body" className={styles.aboutBody} hidden={!aboutOpen}>
              <dl className={styles.aboutList}>
                {aboutItems.map((it) => (
                  <Fragment key={it.label}>
                    <dt className={styles.aboutLabel}>{it.label}</dt>
                    <dd className={styles.aboutValue}>{it.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </div>

          <div className={styles.tocHead}>
            <p className={styles.tocTitle}>İçindekiler</p>
            <button
              type="button"
              className={styles.tocToggle}
              aria-expanded={tocOpen}
              aria-controls="toc-body"
              aria-label={tocOpen ? 'İçindekiler gizle' : 'İçindekiler göster'}
              onClick={() => setTocOpen((v) => !v)}
            >
              <span className="srOnly">{tocOpen ? 'Gizle' : 'Göster'}</span>
              {tocOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </button>
          </div>
           <div id="toc-body" className={styles.tocBody} hidden={!tocOpen}>
             <TocList
               nodes={tocTree}
               depth={0}
                activeId={activeTocId}
               expandedRootId={expandedRootId}
                headingNumbers={headingNumbers}
                showNumbers={Boolean(article.heading_numbering)}
                onNavigate={(id) => {
                  setActiveTocId(id)
                  const rootId = tocIdToRootId.get(id)
                  if (rootId) setExpandedRootId(rootId)
                  const el = document.getElementById(id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })

                  const url = new URL(window.location.href)
                  url.hash = id
                  history.replaceState(null, '', url.toString())
                }}
               onToggleRoot={(id) => {
                 setExpandedRootId((prev) => (prev === id ? null : id))
               }}
             />
           </div>
         </nav>
        ) : null}

      <aside className={styles.right} aria-label="Okuma ayarları">
        <div className={styles.toolsCard}>
          <section className={styles.section} aria-label="Yazı boyutu">
            <div className={styles.sectionHead}>
              <div className={styles.sectionHeadLeft}>
                <p className={styles.sectionTitle} id={fontSizeLabelId}>
                  Yazı boyutu
                </p>

                {fontSizePx !== FONT_SIZE_DEFAULT_PX ? (
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={() => setFontSizePx(FONT_SIZE_DEFAULT_PX)}
                  >
                    Sıfırla
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                className={styles.sectionToggle}
                aria-expanded={fontSizeOpen}
                aria-controls={fontSizePanelId}
                onClick={() => setFontSizeOpen((v) => !v)}
              >
                <span className="srOnly">{fontSizeOpen ? 'Gizle' : 'Göster'}</span>
                {fontSizeOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              </button>
            </div>

            <div id={fontSizePanelId} className={styles.sectionBody} hidden={!fontSizeOpen}>
              <div className={styles.fontSizeRow}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  aria-label="Yazı boyutunu küçült"
                  onClick={() => setFontSizePx((v) => clampFontSizePx(v - FONT_SIZE_STEP_PX))}
                >
                  A-
                </button>

                <input
                  id={fontSizeId}
                  className={styles.fontSizeRange}
                  type="range"
                  min={FONT_SIZE_MIN_PX}
                  max={FONT_SIZE_MAX_PX}
                  step={FONT_SIZE_STEP_PX}
                  value={fontSizePx}
                  aria-labelledby={fontSizeLabelId}
                  style={{
                    ['--range-pct' as any]: `${((fontSizePx - FONT_SIZE_MIN_PX) / (FONT_SIZE_MAX_PX - FONT_SIZE_MIN_PX)) * 100}%`,
                  }}
                  onChange={(e) => setFontSizePx(clampFontSizePx(Number(e.currentTarget.value)))}
                />

                <button
                  type="button"
                  className={styles.toolBtn}
                  aria-label="Yazı boyutunu büyüt"
                  onClick={() => setFontSizePx((v) => clampFontSizePx(v + FONT_SIZE_STEP_PX))}
                >
                  A+
                </button>
              </div>
            </div>
          </section>

          <section className={styles.section} aria-label="Paylaş">
            <div className={styles.sectionHead}>
              <p className={styles.sectionTitle}>Paylaş</p>

              <button
                type="button"
                className={styles.sectionToggle}
                aria-expanded={shareOpen}
                aria-controls={sharePanelId}
                onClick={() => setShareOpen((v) => !v)}
              >
                <span className="srOnly">{shareOpen ? 'Gizle' : 'Göster'}</span>
                {shareOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              </button>
            </div>

            <div id={sharePanelId} className={styles.sectionBody} hidden={!shareOpen}>
              <div className={styles.shareLinks} aria-label="Paylaşım linkleri">
                <button
                  type="button"
                  className={styles.shareIconBtn}
                  onClick={copyPageLink}
                  aria-label={linkCopied ? 'Kopyalandı' : 'Linki kopyala'}
                  title={linkCopied ? 'Kopyalandı' : 'Linki kopyala'}
                >
                  {linkCopied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
                </button>
                <a
                  className={styles.shareIconLink}
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X'te paylaş"
                  title="X"
                >
                  <Twitter size={18} aria-hidden="true" fill="currentColor" stroke="none" />
                </a>
                <a
                  className={styles.shareIconLink}
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn'de paylaş"
                  title="LinkedIn"
                >
                  <Linkedin size={18} aria-hidden="true" fill="currentColor" stroke="none" />
                </a>
                <a
                  className={styles.shareIconLink}
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram'da paylaş"
                  title="Telegram"
                >
                  <Send size={18} aria-hidden="true" fill="currentColor" stroke="none" />
                </a>
                <a
                  className={styles.shareIconLink}
                  href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${window.location.href}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp'ta paylaş"
                  title="WhatsApp"
                >
                  <MessageCircle size={18} aria-hidden="true" fill="currentColor" stroke="none" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{article.title}</h1>
          {article.lead ? <p className={styles.lead}>{article.lead}</p> : null}
          {missingInternalSlugs.length ? (
            <p className={styles.warn}>Bu sayfada kırık iç bağlantılar var: {missingInternalSlugs.join(', ')}</p>
          ) : null}
        </header>

        <div
          ref={(el) => {
            containerRef.current = el
          }}
          className={styles.content}
          onClick={async (e) => {
            const el = e.target as HTMLElement | null
            if (!el) return
            const heading = el.closest('h2,h3,h4,h5,h6') as HTMLElement | null
            if (!heading) return
            const id = heading.getAttribute('id')
            if (!id) return

            const url = new URL(window.location.href)
            url.hash = id
            history.replaceState(null, '', url.toString())
            try {
              await navigator.clipboard.writeText(url.toString())
              setCopied(id)
              window.setTimeout(() => setCopied((v) => (v === id ? null : v)), 1200)
            } catch {
              // ignore
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>

        <div aria-live="polite" className="srOnly">
          {copied ? 'Bağlantı kopyalandı.' : ''}
        </div>

        {article.sources_json?.length ? (
          <section className={styles.refs} aria-label="Kaynaklar">
            <h2 className={styles.refsTitle} id="kaynaklar">
              Kaynaklar
            </h2>
            <ol className={styles.refsList}>
              {orderedSources.map((s, idx) => (
                <li key={s.key} id={`ref-${s.key}`} className={styles.refItem}>
                  <div className={styles.refHead}>
                    <span className={styles.refIndex}>[{idx + 1}]</span> <span>{s.title || 'Kaynak'}</span>
                  </div>
                  <div className={styles.refMeta}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.url}
                      </a>
                    ) : null}
                    {s.accessed_at ? <span> · erişim: {s.accessed_at}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
  )
}
