import { useEffect, useRef, useState } from 'react'
import MarkdownViewer from './MarkdownViewer.jsx'
import s from '../styles/EditorPane.module.css'

export default function MarkdownEditor({ content, onChange, onSave, onCancel, isSaving }) {
  const ref = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (ref.current) ref.current.focus()
  }, [])

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      onSave()
    }
    // Allow Tab to insert spaces instead of focus-jumping
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = ref.current
      const start = el.selectionStart
      const end = el.selectionEnd
      onChange(content.substring(0, start) + '  ' + content.substring(end))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }

  const editorBlock = (
    <div className={s.editorOuter}>
      <div className={s.editorWrap}>
        <textarea
          ref={ref}
          className={s.editorArea}
          value={content}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <div className={s.editorActions}>
          <span className={s.editorHint}>⌘S / Ctrl+S to save</span>
          <div className={s.spacer} />
          <button className={s.btnCancel} onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button className={s.btnSave} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save (commit)'}
          </button>
        </div>
      </div>

      {/* Collapsed toggle tab — only shown when preview is closed */}
      {!previewOpen && (
        <button
          className={s.previewToggle}
          onClick={() => setPreviewOpen(true)}
          title="Open live preview"
        >
          ›
        </button>
      )}
    </div>
  )

  if (!previewOpen) {
    return editorBlock
  }

  return (
    <div className={s.editSplit}>
      {editorBlock}

      <div className={s.previewRail}>
        <div className={s.previewRailHeader}>
          <span className={s.previewRailLabel}>Live preview</span>
          <button
            className={s.previewRailClose}
            onClick={() => setPreviewOpen(false)}
            title="Close preview"
          >
            ✕
          </button>
        </div>
        <MarkdownViewer content={content} />
      </div>
    </div>
  )
}
