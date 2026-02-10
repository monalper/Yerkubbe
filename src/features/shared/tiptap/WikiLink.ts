import Link from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'

export const WikiLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href = typeof HTMLAttributes.href === 'string' ? (HTMLAttributes.href as string) : ''
    const isInternal = href.startsWith('/text/')
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, isInternal ? { 'data-internal': 'true' } : {}),
      0,
    ]
  },
})
