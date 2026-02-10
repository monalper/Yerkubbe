import { Node, type Editor } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Plugin } from 'prosemirror-state'
import type { ArticleSource } from '../../articles/types'
import styles from './nodes.module.css'

type Options = { sources: ArticleSource[] }

function computeCitationNumbers(doc: any) {
  const numbers: Record<string, number> = {}
  const orderedKeys: string[] = []
  let n = 0
  doc.descendants((node: any) => {
    if (node.type?.name !== 'citation') return
    const key = String(node.attrs?.sourceKey ?? '')
    if (!key) return
    if (!numbers[key]) {
      n += 1
      numbers[key] = n
      orderedKeys.push(key)
    }
  })
  return { numbers, orderedKeys }
}

export const Citation = Node.create<Options>({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { sources: [] }
  },

  addAttributes() {
    return {
      sourceKey: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-citation': 'true' }]
  },

  addStorage() {
    return { numbers: {} as Record<string, number>, orderedKeys: [] as string[] }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_trs, _oldState, newState) => {
          const { numbers, orderedKeys } = computeCitationNumbers(newState.doc)
          ;(this.storage as any).numbers = numbers
          ;(this.storage as any).orderedKeys = orderedKeys
          return null
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView)
  },
})

function CitationView(props: { node: any; editor: Editor }) {
  const key = String(props.node.attrs?.sourceKey ?? '')
  const numbers: Record<string, number> = (props.editor.storage as any).citation?.numbers ?? {}
  const n = numbers[key] ?? 0

  const label = n ? `[${n}]` : '[?]'
  return (
    <NodeViewWrapper as="span" className={styles.citationWrap} data-citation="">
      <a className={styles.citation} href={key ? `#ref-${key}` : undefined} aria-label={`Kaynak ${label}`}>
        {label}
      </a>
    </NodeViewWrapper>
  )
}

export function getCitationOrder(editor: Editor | null) {
  if (!editor) return { orderedKeys: [] as string[], numbers: {} as Record<string, number> }
  const storage = (editor.storage as any).citation
  return { orderedKeys: storage?.orderedKeys ?? [], numbers: storage?.numbers ?? {} }
}
