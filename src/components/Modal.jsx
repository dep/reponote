import { useState, useEffect, useRef } from 'react'
import s from '../styles/Modal.module.css'

export default function Modal({ modal, onConfirm, onCancel, onUnsavedDiscard, onUnsavedSave }) {
  const [newPath, setNewPath] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (modal && inputRef.current) {
      inputRef.current.focus()
    }
    if (modal?.type === 'new') setNewPath('')
  }, [modal])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        if (modal?.type === 'delete') onConfirm()
        if (modal?.type === 'new' && newPath.trim()) onConfirm(newPath.trim())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal, newPath, onConfirm, onCancel])

  if (!modal) return null

  return (
    <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className={s.dialog}>
        {modal.type === 'delete' && (
          <>
            <div className={s.title}>Delete note</div>
            <div className={s.body}>
              Are you sure you want to delete{' '}
              <span className={s.filename}>{modal.path}</span>?
              This will create a commit on GitHub — the file history is preserved but the file will be gone.
            </div>
            <div className={s.actions}>
              <button className={s.btnCancel} onClick={onCancel}>Cancel</button>
              <button className={s.btnDanger} onClick={onConfirm}>Delete</button>
            </div>
          </>
        )}

        {modal.type === 'new' && (
          <>
            <div className={s.title}>New note</div>
            <div className={s.field}>
              <label className={s.label}>File path</label>
              <input
                ref={inputRef}
                className={s.input}
                type="text"
                placeholder="folder/my-note.md"
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
              />
              <span className={s.hint}>
                Relative path in the repo. <code>.md</code> will be appended if omitted.
                Use <code>/</code> to organize in folders.
              </span>
            </div>
            <div className={s.actions}>
              <button className={s.btnCancel} onClick={onCancel}>Cancel</button>
              <button
                className={s.btnConfirm}
                onClick={() => newPath.trim() && onConfirm(newPath.trim())}
                disabled={!newPath.trim()}
              >
                Create
              </button>
            </div>
          </>
        )}

        {modal.type === 'unsaved' && (
          <>
            <div className={s.title}>Unsaved changes</div>
            <div className={s.body}>
              You have unsaved changes in{' '}
              <span className={s.filename}>{modal.path}</span>.
              What would you like to do?
            </div>
            <div className={s.actions}>
              <button className={s.btnCancel} onClick={onCancel}>Keep editing</button>
              <button className={s.btnDiscard} onClick={onUnsavedDiscard}>Discard</button>
              <button className={s.btnConfirm} onClick={onUnsavedSave}>Save (commit)</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
