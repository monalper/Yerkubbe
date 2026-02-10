import { Node, type Editor } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import styles from './nodes.module.css'

export type FigureAttrs = {
  src: string
  alt: string
  caption: string
  source: string
  license: string
  align: 'left' | 'center' | 'right'
}

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      source: { default: '' },
      license: { default: '' },
      align: { default: 'center' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-figure]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', { ...HTMLAttributes, 'data-figure': 'true' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView)
  },
})

function FigureView(props: {
  editor: Editor
  node: any
  updateAttributes: (attrs: Partial<FigureAttrs>) => void
  deleteNode: () => void
}) {
  const attrs = props.node.attrs as FigureAttrs
  const editable = props.editor.isEditable

  return (
    <NodeViewWrapper as="figure" className={styles.figure} data-align={attrs.align} data-editable={editable ? 'true' : 'false'}>
      {attrs.src ? <img className={styles.figureImg} src={attrs.src} alt={attrs.alt || ''} /> : null}

      {editable ? (
        <div className={styles.figureForm}>
          <label className={styles.figureLabel}>
            Caption (zorunlu)
            <input
              className={styles.figureInput}
              value={attrs.caption ?? ''}
              onChange={(e) => props.updateAttributes({ caption: e.currentTarget.value })}
            />
          </label>
          <label className={styles.figureLabel}>
            Kaynak (zorunlu)
            <input
              className={styles.figureInput}
              value={attrs.source ?? ''}
              onChange={(e) => props.updateAttributes({ source: e.currentTarget.value })}
            />
          </label>
          <label className={styles.figureLabel}>
            Lisans (zorunlu)
            <input
              className={styles.figureInput}
              value={attrs.license ?? ''}
              onChange={(e) => props.updateAttributes({ license: e.currentTarget.value })}
            />
          </label>
          <label className={styles.figureLabel}>
            Hizalama
            <select
              className={styles.figureInput}
              value={attrs.align ?? 'center'}
              onChange={(e) => props.updateAttributes({ align: e.currentTarget.value as any })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>

          <button type="button" className={styles.figureRemove} onClick={() => props.deleteNode()}>
            Görseli kaldır
          </button>
        </div>
      ) : (
        <figcaption className={styles.figureCaption}>
          {attrs.caption ? <p className={styles.captionText}>{attrs.caption}</p> : null}
          <p className={styles.captionMeta}>
            {attrs.source ? <span>{attrs.source}</span> : null}
            {attrs.license ? <span> · {attrs.license}</span> : null}
          </p>
        </figcaption>
      )}
    </NodeViewWrapper>
  )
}
