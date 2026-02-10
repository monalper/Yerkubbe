import { Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

function slugFromHref(href: string) {
  const match = href.match(/^\/text\/([^#?]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export const BrokenInternalLinks = Extension.create({
  name: 'brokenInternalLinks',

  addStorage() {
    return {
      missing: new Set<string>(),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const missing: Set<string> = (this.editor.storage as any).brokenInternalLinks?.missing ?? new Set<string>()
            if (!missing.size) return null

            const decos: Decoration[] = []
            state.doc.descendants((node, pos) => {
              for (const m of node.marks ?? []) {
                if (m.type.name !== 'link') continue
                const href = String(m.attrs?.href ?? '')
                if (!href.startsWith('/text/')) continue
                const slug = slugFromHref(href)
                if (!slug || !missing.has(slug)) continue
                const from = pos
                const to = pos + node.nodeSize
                if (from < to) decos.push(Decoration.inline(from, to, { 'data-broken': 'true' }))
              }
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})

export function setBrokenInternalSlugs(editor: any, slugs: string[]) {
  const storage = editor?.storage?.brokenInternalLinks
  if (!storage) return
  storage.missing = new Set(slugs)
  editor.view.dispatch(editor.state.tr.setMeta('brokenInternalLinks:refresh', Date.now()))
}
