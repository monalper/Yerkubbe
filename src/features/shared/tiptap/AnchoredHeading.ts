import Heading from '@tiptap/extension-heading'
import { mergeAttributes } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { slugifyTr } from './text'

export const AnchoredHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: { default: null },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level) ? node.attrs.level : this.options.levels[0]
    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, tr } = newState
          let changed = false

          const counts = new Map<string, number>()
          doc.descendants((node, pos) => {
            if (node.type.name !== this.name) return
            const text = node.textContent.trim()
            const base = slugifyTr(text) || 'section'
            const seen = counts.get(base) ?? 0
            counts.set(base, seen + 1)
            const id = seen === 0 ? base : `${base}-${seen + 1}`
            if (node.attrs.id !== id) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id })
              changed = true
            }
          })

          return changed ? tr : null
        },
      }),
    ]
  },
})
