import { Node, type Editor } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const lightboxTitleId = useId()

  useEffect(() => {
    if (!isLightboxOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isLightboxOpen])

  return (
    <NodeViewWrapper as="figure" className={styles.figure} data-align={attrs.align} data-editable={editable ? 'true' : 'false'}>
      {attrs.src ? (
        editable ? (
          <img className={styles.figureImg} src={attrs.src} alt={attrs.alt || ''} />
        ) : (
          <button
            type="button"
            className={styles.figureImgButton}
            onClick={() => setIsLightboxOpen(true)}
            aria-label="Görseli büyüt"
          >
            <img className={styles.figureImg} src={attrs.src} alt={attrs.alt || ''} />
          </button>
        )
      ) : null}

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
        <>
          {attrs.caption ? (
            <figcaption className={styles.figureCaption}>
              <p className={styles.captionText}>{attrs.caption}</p>
            </figcaption>
          ) : null}

          {isLightboxOpen
            ? createPortal(
                <div className={styles.lightboxBackdrop} onClick={() => setIsLightboxOpen(false)}>
                  <div
                    className={styles.lightbox}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={lightboxTitleId}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={styles.lightboxClose}
                      onClick={() => setIsLightboxOpen(false)}
                      aria-label="Kapat"
                      autoFocus
                    >
                      ×
                    </button>

                    <img className={styles.lightboxImg} src={attrs.src} alt={attrs.alt || ''} />

                    <div className={styles.lightboxCaption} id={lightboxTitleId}>
                      {attrs.caption || 'Görsel'}
                    </div>

                    <div className={styles.lightboxMeta}>
                      {attrs.source ? (
                        <div className={styles.lightboxMetaRow}>
                          <span className={styles.lightboxMetaLabel}>Sahiplik :</span>
                          <span>{attrs.source}</span>
                        </div>
                      ) : null}
                      {attrs.license ? (
                        <div className={styles.lightboxMetaRow}>
                          <span className={styles.lightboxMetaLabel}>Lisans :</span>
                          <span>{attrs.license}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}
        </>
      )}
    </NodeViewWrapper>
  )
}
