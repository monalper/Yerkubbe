import { InputRule, Node, type Editor } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import katex from 'katex'
import styles from './nodes.module.css'

function renderLatex(latex: string, displayMode: boolean) {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode })
  } catch {
    return ''
  }
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { latex: { default: '' } }
  },

  addInputRules() {
    const findInline = /(^|[^\\])\$(?!\$)([^$\n]+?)\$$/

    return [
      new InputRule({
        find: findInline,
        handler: ({ state, range, match, chain }) => {
          const prefix = String(match[1] ?? '')
          const latex = String(match[2] ?? '')

          if (!latex.trim()) return null

          const $from = state.selection.$from
          if ($from.parent.type.spec.code) return null
          if ($from.parent.type.name === 'codeBlock') return null

          const codeMark = state.schema.marks.code
          if (codeMark) {
            const activeMarks = state.storedMarks ?? $from.marks()
            if (activeMarks.some((m) => m.type === codeMark)) return null
          }

          const from = range.from + prefix.length
          const to = range.to
          if (from >= to) return null

          chain()
            .insertContentAt(
              { from, to },
              { type: this.name, attrs: { latex } },
              { applyInputRules: false, applyPasteRules: false, updateSelection: true },
            )
            .run()
          return null
        },
      }),
    ]
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-math-inline': 'true' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView)
  },
})

function MathInlineView(props: { node: any; editor: Editor; updateAttributes: (attrs: any) => void }) {
  const latex = String(props.node.attrs?.latex ?? '')
  const html = renderLatex(latex, false)
  return (
    <NodeViewWrapper
      as="span"
      className={styles.mathInline}
      onDoubleClick={() => {
        if (!props.editor.isEditable) return
        const next = window.prompt('Inline LaTeX', latex)
        if (next == null) return
        props.updateAttributes({ latex: next })
      }}
      dangerouslySetInnerHTML={{ __html: html || latex }}
    />
  )
}

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return { latex: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-math-block': 'true' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView)
  },
})

function MathBlockView(props: { node: any; editor: Editor; updateAttributes: (attrs: any) => void }) {
  const latex = String(props.node.attrs?.latex ?? '')
  const html = renderLatex(latex, true)
  return (
    <NodeViewWrapper
      as="div"
      className={styles.mathBlock}
      onDoubleClick={() => {
        if (!props.editor.isEditable) return
        const next = window.prompt('Block LaTeX', latex)
        if (next == null) return
        props.updateAttributes({ latex: next })
      }}
      dangerouslySetInnerHTML={{ __html: html || latex }}
    />
  )
}
