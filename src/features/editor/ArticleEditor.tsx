import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
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
import Papa from 'papaparse'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import { supabase } from '../../lib/supabaseClient'
import { checkSlugsExist, listAllSlugs, pickUniqueSlug } from '../articles/queries'
import type { ArticleRow, ArticleSaveDraft, ArticleSource, ArticleStatus } from '../articles/types'
import { extractInternalSlugs } from '../reader/docUtils'
import { AnchoredHeading } from '../shared/tiptap/AnchoredHeading'
import { BrokenInternalLinks, setBrokenInternalSlugs } from '../shared/tiptap/BrokenInternalLinks'
import { Citation, getCitationOrder } from '../shared/tiptap/Citation'
import { Figure } from '../shared/tiptap/Figure'
import { MathBlock, MathInline } from '../shared/tiptap/Math'
import { WikiLink } from '../shared/tiptap/WikiLink'
import type { LucideIcon } from 'lucide-react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold as BoldIcon,
  BookMarked,
  BookPlus,
  Braces,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  Heading,
  Image as ImageIcon,
  ImageUp,
  Italic as ItalicIcon,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Sigma,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  TextQuote,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import styles from './editor.module.css'
import tiptapStyles from './tiptap.module.css'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
  initial?: ArticleRow
  saving: boolean
  onSave: (draft: ArticleSaveDraft) => Promise<void>
}

function slugFromTitle(title: string) {
  return slugify(title, { lower: true, strict: true, locale: 'tr' })
}

function parseTags(text: string) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

type PMNode = { type?: string; attrs?: any; content?: PMNode[]; marks?: any[] }

function isCsvFile(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return true
  if (file.type === 'text/csv') return true
  if (file.type && file.type.toLowerCase().includes('csv')) return true
  return false
}

function csvTextToRows(csvText: string) {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return []
  const parsed = Papa.parse<string[]>(cleaned, { skipEmptyLines: true })
  return (parsed.data as any[])
    .filter((r) => Array.isArray(r))
    .map((row) => (row as any[]).map((cell) => String(cell ?? '')))
}

function rowsToTableJson(rows: string[][], opts?: { headerRow?: boolean }): PMNode | null {
  const headerRow = opts?.headerRow ?? true
  const maxCols = Math.max(0, ...rows.map((r) => r.length))
  if (!rows.length || maxCols <= 0) return null

  return {
    type: 'table',
    content: rows.map((row, rowIndex) => {
      const padded = row.length === maxCols ? row : [...row, ...Array.from({ length: maxCols - row.length }, () => '')]
      const cellType = headerRow && rowIndex === 0 ? 'tableHeader' : 'tableCell'
      return {
        type: 'tableRow',
        content: padded.map((cell) => ({
          type: cellType,
          content: [{ type: 'paragraph', content: cell ? [{ type: 'text', text: cell }] : [] }],
        })),
      }
    }),
  }
}

function insertCsvAsTable(editor: Editor, csvText: string, opts?: { headerRow?: boolean }) {
  const rows = csvTextToRows(csvText)
  const table = rowsToTableJson(rows, opts)
  if (!table) return false
  return editor.chain().focus().insertContent(table as any).run()
}

function findFigureIssues(doc: unknown) {
  const issues: string[] = []
  const visit = (n: PMNode | null | undefined) => {
    if (!n) return
    if (n.type === 'figure') {
      const a = n.attrs ?? {}
      if (!String(a.caption ?? '').trim()) issues.push('Görsel caption zorunlu.')
      if (!String(a.source ?? '').trim()) issues.push('Görsel kaynak zorunlu.')
      if (!String(a.license ?? '').trim()) issues.push('Görsel lisans zorunlu.')
    }
    for (const c of n.content ?? []) visit(c)
  }
  visit(doc as any)
  return Array.from(new Set(issues))
}

function findMissingCitations(doc: unknown, sources: ArticleSource[]) {
  const keys = new Set(sources.map((s) => s.key))
  const missing: string[] = []
  const visit = (n: PMNode | null | undefined) => {
    if (!n) return
    if (n.type === 'citation') {
      const key = String(n.attrs?.sourceKey ?? '')
      if (key && !keys.has(key)) missing.push(key)
    }
    for (const c of n.content ?? []) visit(c)
  }
  visit(doc as any)
  return Array.from(new Set(missing))
}

async function uploadToMediaBucket(file: File) {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  const safeExt = ext && ext.length <= 8 ? ext : 'bin'
  const path = `media/${new Date().toISOString().slice(0, 10)}/${nanoid(12)}.${safeExt}`

  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

export function ArticleEditor({ mode, initial, saving, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug))
  const [lead, setLead] = useState(initial?.lead ?? '')
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(', '))
  const [status, setStatus] = useState<ArticleStatus>(initial?.status ?? 'draft')
  const [headingNumbering, setHeadingNumbering] = useState(Boolean(initial?.heading_numbering ?? false))
  const [sources, setSources] = useState<ArticleSource[]>(initial?.sources_json ?? [])
  const [missingInternal, setMissingInternal] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const internalCheckTimer = useRef<number | null>(null)

  const { data: allSlugs } = useQuery({
    queryKey: ['admin', 'slugs'],
    queryFn: listAllSlugs,
  })

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: false, link: false }),
        AnchoredHeading.configure({ levels: [2, 3, 4, 5, 6] }),
        Underline,
        WikiLink.configure({ openOnClick: false }),
        BrokenInternalLinks,
        Subscript,
        Superscript,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: 'Yazmaya başla…' }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        MathInline,
        MathBlock,
        Figure,
        Citation.configure({ sources }),
      ],
      content: (initial?.content_json as any) ?? { type: 'doc', content: [] },
      editorProps: {
        attributes: { class: tiptapStyles.prose },
        handlePaste: (view, event) => {
          const items = Array.from(event.clipboardData?.items ?? [])
          const file = items.find((i) => i.kind === 'file')?.getAsFile() ?? null
          if (!file) return false
          if (!file.type.startsWith('image/')) return false
          void (async () => {
            const url = await uploadToMediaBucket(file)
            const tr = view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.figure.create({
                src: url,
                alt: '',
                caption: '',
                source: '',
                license: '',
                align: 'center',
              }),
            )
            view.dispatch(tr)
          })()
          return true
        },
        handleDrop: (view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? [])
          const csvFile = files.find(isCsvFile) ?? null
          if (csvFile) {
            event.preventDefault()
            event.stopPropagation()
            void (async () => {
              try {
                setFormError(null)
                const csvText = await csvFile.text()
                const rows = csvTextToRows(csvText)
                const tableJson = rowsToTableJson(rows, { headerRow: true })
                if (!tableJson) {
                  setFormError('CSV boş veya geçersiz.')
                  return
                }
                const tableNode = view.state.schema.nodeFromJSON(tableJson as any)
                const tr = view.state.tr.replaceSelectionWith(tableNode)
                view.dispatch(tr)
              } catch {
                setFormError('CSV içe aktarılamadı.')
              }
            })()
            return true
          }

          const file = files.find((f) => f.type.startsWith('image/')) ?? null
          if (!file) return false
          void (async () => {
            const url = await uploadToMediaBucket(file)
            const tr = view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.figure.create({
                src: url,
                alt: '',
                caption: '',
                source: '',
                license: '',
                align: 'center',
              }),
            )
            view.dispatch(tr)
          })()
          return true
        },
      },
      onUpdate: ({ editor }) => {
        const slugs = extractInternalSlugs(editor.getJSON())
        if (internalCheckTimer.current) window.clearTimeout(internalCheckTimer.current)
        internalCheckTimer.current = window.setTimeout(() => {
          void (async () => {
            const res = await checkSlugsExist(slugs)
            setMissingInternal(res.missing)
            setBrokenInternalSlugs(editor, res.missing)
          })()
        }, 450)
      },
    },
    // sources changes should not recreate editor; content is the source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id],
  )

  useEffect(() => {
    if (!title) return
    if (slugEdited) return
    setSlug(slugFromTitle(title))
  }, [title, slugEdited])

  useEffect(() => {
    if (!editor) return
    setBrokenInternalSlugs(editor, missingInternal)
  }, [editor, missingInternal])

  const citationInfo = useMemo(() => getCitationOrder(editor), [editor])

  useEffect(() => {
    return () => {
      if (internalCheckTimer.current) window.clearTimeout(internalCheckTimer.current)
    }
  }, [])

  const saveMut = useMutation({
    mutationFn: async () => {
      setFormError(null)
      if (!editor) throw new Error('Editör hazır değil.')

      const baseSlug = slug.trim()
      if (!title.trim()) throw new Error('Başlık zorunlu.')
      if (!baseSlug) throw new Error('Slug zorunlu.')

      const uniqueSlug = await pickUniqueSlug(baseSlug, initial?.id)
      if (uniqueSlug !== baseSlug) setSlug(uniqueSlug)

      const json = editor.getJSON()
      const figureIssues = findFigureIssues(json)
      if (figureIssues.length) throw new Error(figureIssues[0]!)

      const missingCitations = findMissingCitations(json, sources)
      if (missingCitations.length) throw new Error('Atıflar içinde silinmiş kaynaklar var.')

      const draft: ArticleSaveDraft = {
        title: title.trim(),
        slug: uniqueSlug,
        lead: lead.trim(),
        tags: parseTags(tagsText),
        status,
        heading_numbering: headingNumbering,
        content_json: json,
        content_text: editor.getText(),
        sources_json: sources,
      }
      await onSave(draft)
    },
    onError: (e: any) => {
      setFormError(e?.message ?? 'Kaydetme başarısız.')
    },
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const svgInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className={styles.grid}>
      <div className={styles.main}>
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <label className={styles.label}>
              Başlık
              <input
                className={styles.input}
                value={title}
                onChange={(e) => {
                  setTitle(e.currentTarget.value)
                  if (!slugEdited) setSlug(slugFromTitle(e.currentTarget.value))
                }}
              />
            </label>
          </div>
          <div className={styles.metaRow2}>
            <label className={styles.label}>
              Slug (benzersiz)
              <input
                className={styles.input}
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(e.currentTarget.value)
                }}
                list="slug-suggestions"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <datalist id="slug-suggestions">
                {(allSlugs ?? []).slice(0, 2000).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className={styles.label}>
              Durum
              <select className={styles.input} value={status} onChange={(e) => setStatus(e.currentTarget.value as any)}>
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </label>
          </div>
          <div className={styles.metaRow}>
            <label className={styles.label}>
              Kısa özet (lead)
              <textarea className={styles.textarea} value={lead ?? ''} onChange={(e) => setLead(e.currentTarget.value)} />
            </label>
          </div>
          <div className={styles.metaRow2}>
            <label className={styles.label}>
              Etiketler (virgülle)
              <input className={styles.input} value={tagsText} onChange={(e) => setTagsText(e.currentTarget.value)} />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={headingNumbering}
                onChange={(e) => setHeadingNumbering(e.currentTarget.checked)}
              />
              Başlık numaralandırma (TOC)
            </label>
          </div>
        </div>

        <div className={styles.editorShell} aria-label="Makale editörü">
          <EditorToolbar
            editor={editor}
            sources={sources}
            internalSlugs={allSlugs ?? []}
            onInsertCitation={(key) => {
              editor?.chain().focus().insertContent({ type: 'citation', attrs: { sourceKey: key } }).run()
            }}
            onAddSource={() => {
              const key = nanoid(10)
              setSources((prev) => [
                ...prev,
                { key, title: '', url: '', accessed_at: new Date().toISOString().slice(0, 10) },
              ])
            }}
            onUploadImage={() => fileInputRef.current?.click()}
            onUploadSvg={() => svgInputRef.current?.click()}
            onImportCsv={() => {
              if (!editor) return
              const csv =
                window.prompt('CSV yapıştır (ilk satır dahil). İstersen .csv dosyasını editöre sürükleyip bırakabilirsin.') ?? ''
              if (!csv.trim()) return
              insertCsvAsTable(editor, csv, { headerRow: true })
            }}
          />

          <div className={styles.editorWrap}>
            {editor ? <EditorContent editor={editor} /> : <p className={styles.muted}>Editör hazırlanıyor…</p>}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (!file || !editor) return
            void (async () => {
              const url = await uploadToMediaBucket(file)
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'figure',
                  attrs: { src: url, alt: '', caption: '', source: '', license: '', align: 'center' },
                })
                .run()
            })()
          }}
        />
        <input
          ref={svgInputRef}
          type="file"
          accept="image/svg+xml"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (!file || !editor) return
            void (async () => {
              const url = await uploadToMediaBucket(file)
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'figure',
                  attrs: { src: url, alt: '', caption: '', source: '', license: '', align: 'center' },
                })
                .run()
            })()
          }}
        />

        <div className={styles.footer}>
          {formError ? <p className={styles.error}>{formError}</p> : null}
          {missingInternal.length ? (
            <p className={styles.muted}>Kırık iç linkler: {missingInternal.slice(0, 12).join(', ')}</p>
          ) : null}
          {citationInfo.orderedKeys.length ? (
            <p className={styles.muted}>Atıf sırası: {citationInfo.orderedKeys.join(', ')}</p>
          ) : null}
          <button
            type="button"
            className={styles.primary}
            disabled={saving || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saving || saveMut.isPending ? 'Kaydediliyor…' : mode === 'create' ? 'Oluştur' : 'Kaydet'}
          </button>
        </div>
      </div>

      <aside className={styles.side} aria-label="Kaynaklar">
        <h2 className={styles.h2}>Kaynaklar</h2>
        <p className={styles.muted}>Metin içinde “Kaynak ekle” ile [1], [2]… eklenir.</p>
        <div className={styles.sources}>
          {sources.map((s) => (
            <div key={s.key} className={styles.sourceRow}>
              <p className={styles.sourceKey}>{s.key}</p>
              <label className={styles.label}>
                Başlık
                <input
                  className={styles.input}
                  value={s.title}
                  onChange={(e) => {
                    const nextTitle = e.currentTarget.value
                    setSources((prev) => prev.map((x) => (x.key === s.key ? { ...x, title: nextTitle } : x)))
                  }}
                />
              </label>
              <label className={styles.label}>
                URL
                <input
                  className={styles.input}
                  value={s.url}
                  onChange={(e) => {
                    const nextUrl = e.currentTarget.value
                    setSources((prev) => prev.map((x) => (x.key === s.key ? { ...x, url: nextUrl } : x)))
                  }}
                />
              </label>
              <label className={styles.label}>
                Erişim tarihi
                <input
                  className={styles.input}
                  value={s.accessed_at}
                  onChange={(e) => {
                    const nextAccessedAt = e.currentTarget.value
                    setSources((prev) => prev.map((x) => (x.key === s.key ? { ...x, accessed_at: nextAccessedAt } : x)))
                  }}
                />
              </label>
              <div className={styles.sourceActions}>
                <button
                  type="button"
                  className={styles.buttonLink}
                  onClick={() => editor?.chain().focus().insertContent({ type: 'citation', attrs: { sourceKey: s.key } }).run()}
                >
                  Bu kaynağı metne ekle
                </button>
                <button
                  type="button"
                  className={styles.buttonLink}
                  onClick={() => setSources((prev) => prev.filter((x) => x.key !== s.key))}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.primaryAlt}
          onClick={() =>
            setSources((prev) => [...prev, { key: nanoid(10), title: '', url: '', accessed_at: new Date().toISOString().slice(0, 10) }])
          }
        >
          Kaynak ekle
        </button>
      </aside>
    </div>
  )
}

function EditorToolbar(props: {
  editor: any
  sources: ArticleSource[]
  internalSlugs: string[]
  onAddSource: () => void
  onInsertCitation: (key: string) => void
  onUploadImage: () => void
  onUploadSvg: () => void
  onImportCsv: () => void
}) {
  const e = props.editor

  if (!e) return null

  const IconTool = (p: {
    label: string
    icon: LucideIcon
    pressed?: boolean
    disabled?: boolean
    onClick: () => void
  }) => {
    const Icon = p.icon
    return (
      <button
        type="button"
        className={`${styles.toolButton} ${p.pressed ? styles.toolButtonActive : ''}`}
        aria-label={p.label}
        title={p.label}
        aria-pressed={typeof p.pressed === 'boolean' ? p.pressed : undefined}
        disabled={p.disabled}
        onMouseDown={(ev) => ev.preventDefault()}
        onClick={p.onClick}
      >
        <Icon aria-hidden="true" size={18} />
      </button>
    )
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Editör araçları">
      <div className={styles.toolGroup} role="group" aria-label="Geçmiş">
        <IconTool
          label="Geri al"
          icon={Undo2}
          disabled={!e.can().chain().focus().undo().run()}
          onClick={() => e.chain().focus().undo().run()}
        />
        <IconTool
          label="Yinele"
          icon={Redo2}
          disabled={!e.can().chain().focus().redo().run()}
          onClick={() => e.chain().focus().redo().run()}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Metin">
        <IconTool
          label="Kalın"
          icon={BoldIcon}
          pressed={e.isActive('bold')}
          disabled={!e.can().chain().focus().toggleBold().run()}
          onClick={() => e.chain().focus().toggleBold().run()}
        />
        <IconTool
          label="İtalik"
          icon={ItalicIcon}
          pressed={e.isActive('italic')}
          disabled={!e.can().chain().focus().toggleItalic().run()}
          onClick={() => e.chain().focus().toggleItalic().run()}
        />
        <IconTool
          label="Altı çizili"
          icon={UnderlineIcon}
          pressed={e.isActive('underline')}
          disabled={!e.can().chain().focus().toggleUnderline().run()}
          onClick={() => e.chain().focus().toggleUnderline().run()}
        />
        <IconTool
          label="Alt simge"
          icon={SubscriptIcon}
          pressed={e.isActive('subscript')}
          disabled={!e.can().chain().focus().toggleSubscript().run()}
          onClick={() => e.chain().focus().toggleSubscript().run()}
        />
        <IconTool
          label="Üst simge"
          icon={SuperscriptIcon}
          pressed={e.isActive('superscript')}
          disabled={!e.can().chain().focus().toggleSuperscript().run()}
          onClick={() => e.chain().focus().toggleSuperscript().run()}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Paragraf">
        <div className={styles.toolSelectWrap}>
          <Heading aria-hidden="true" size={18} />
          <select
            className={styles.toolSelect}
            aria-label="Başlık seviyesi"
            value={String(e.getAttributes('heading')?.level ?? '')}
            onChange={(ev) => {
              const v = ev.currentTarget.value
              if (!v) e.chain().focus().setParagraph().run()
              else e.chain().focus().toggleHeading({ level: Number(v) }).run()
            }}
          >
            <option value="">Paragraf</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
            <option value="5">H5</option>
            <option value="6">H6</option>
          </select>
        </div>
        <IconTool
          label="Sola hizala"
          icon={AlignLeft}
          pressed={e.isActive({ textAlign: 'left' })}
          disabled={!e.can().chain().focus().setTextAlign('left').run()}
          onClick={() => e.chain().focus().setTextAlign('left').run()}
        />
        <IconTool
          label="Ortala"
          icon={AlignCenter}
          pressed={e.isActive({ textAlign: 'center' })}
          disabled={!e.can().chain().focus().setTextAlign('center').run()}
          onClick={() => e.chain().focus().setTextAlign('center').run()}
        />
        <IconTool
          label="Sağa hizala"
          icon={AlignRight}
          pressed={e.isActive({ textAlign: 'right' })}
          disabled={!e.can().chain().focus().setTextAlign('right').run()}
          onClick={() => e.chain().focus().setTextAlign('right').run()}
        />
        <IconTool
          label="Yasla"
          icon={AlignJustify}
          pressed={e.isActive({ textAlign: 'justify' })}
          disabled={!e.can().chain().focus().setTextAlign('justify').run()}
          onClick={() => e.chain().focus().setTextAlign('justify').run()}
        />
        <IconTool
          label="Paragraf"
          icon={Pilcrow}
          pressed={!e.isActive('heading')}
          disabled={!e.can().chain().focus().setParagraph().run()}
          onClick={() => e.chain().focus().setParagraph().run()}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Blok">
        <IconTool
          label="Alıntı"
          icon={Quote}
          pressed={e.isActive('blockquote')}
          disabled={!e.can().chain().focus().toggleBlockquote().run()}
          onClick={() => e.chain().focus().toggleBlockquote().run()}
        />
        <IconTool
          label="Liste"
          icon={List}
          pressed={e.isActive('bulletList')}
          disabled={!e.can().chain().focus().toggleBulletList().run()}
          onClick={() => e.chain().focus().toggleBulletList().run()}
        />
        <IconTool
          label="Numaralı liste"
          icon={ListOrdered}
          pressed={e.isActive('orderedList')}
          disabled={!e.can().chain().focus().toggleOrderedList().run()}
          onClick={() => e.chain().focus().toggleOrderedList().run()}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Link">
        <IconTool
          label="Dış link"
          icon={ExternalLink}
          onClick={() => {
            const href = window.prompt('Dış link (https://...)') ?? ''
            if (!href.trim()) return
            e.chain().focus().setLink({ href: href.trim(), target: '_blank', rel: 'noreferrer' }).run()
          }}
        />
        <IconTool
          label="İç link"
          icon={Link2}
          onClick={() => {
            const slug = window.prompt('İç link slug (ör: benim-makale)') ?? ''
            if (!slug.trim()) return
            e.chain().focus().setLink({ href: `/text/${encodeURIComponent(slug.trim())}` }).run()
          }}
        />
        <div className={styles.toolSelectWrap}>
          <BookMarked aria-hidden="true" size={18} />
          <select
            className={styles.toolSelect}
            aria-label="İç link seç"
            onChange={(e2) => {
              const v = e2.currentTarget.value
              if (!v) return
              e.chain().focus().setLink({ href: `/text/${encodeURIComponent(v)}` }).run()
              e2.currentTarget.value = ''
            }}
          >
            <option value="">İç link seç…</option>
            {props.internalSlugs.slice(0, 2000).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <IconTool
          label="Link kaldır"
          icon={Link2Off}
          disabled={!e.isActive('link')}
          onClick={() => e.chain().focus().unsetLink().run()}
        />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Ekle">
        <IconTool
          label="Inline LaTeX"
          icon={Sigma}
          onClick={() => {
            const latex = window.prompt('Inline LaTeX') ?? ''
            if (!latex.trim()) return
            e.chain().focus().insertContent({ type: 'mathInline', attrs: { latex } }).run()
          }}
        />
        <IconTool
          label="Block LaTeX"
          icon={Braces}
          onClick={() => {
            const latex = window.prompt('Block LaTeX') ?? ''
            if (!latex.trim()) return
            e.chain().focus().insertContent({ type: 'mathBlock', attrs: { latex } }).run()
          }}
        />
        <IconTool label="Görsel yükle" icon={ImageUp} onClick={props.onUploadImage} />
        <IconTool
          label="Görsel URL"
          icon={ImageIcon}
          onClick={() => {
            const url = window.prompt('Görsel URL (https://...)') ?? ''
            if (!url.trim()) return
            e.chain()
              .focus()
              .insertContent({
                type: 'figure',
                attrs: { src: url.trim(), alt: '', caption: '', source: '', license: '', align: 'center' },
              })
              .run()
          }}
        />
        <IconTool label="SVG ekle" icon={FileCode2} onClick={props.onUploadSvg} />
        <IconTool
          label="Tablo"
          icon={TableIcon}
          disabled={!e.can().chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          onClick={() => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        <IconTool label="CSV → Tablo" icon={FileSpreadsheet} onClick={props.onImportCsv} />
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.toolGroup} role="group" aria-label="Kaynak">
        <IconTool label="Kaynak ekle" icon={BookPlus} onClick={props.onAddSource} />
        <div className={styles.toolSelectWrap}>
          <TextQuote aria-hidden="true" size={18} />
          <select
            className={styles.toolSelect}
            aria-label="Atıf ekle"
            onChange={(e2) => {
              const key = e2.currentTarget.value
              if (!key) return
              props.onInsertCitation(key)
              e2.currentTarget.value = ''
            }}
          >
            <option value="">Atıf ekle…</option>
            {props.sources.map((s) => (
              <option key={s.key} value={s.key}>
                {s.title ? s.title : s.key}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
