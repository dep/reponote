import { useEffect, useRef } from 'react'
import s from '../styles/EditorPane.module.css'

export default function MarkdownEditor({ content, onChange, onSave, onCancel, isSaving }) {
  const ref = useRef(null)

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

  return (
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
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
