import { useState, useEffect, useRef } from 'react'
import s from '../styles/Modal.module.css'

export default function Modal({ modal, onConfirm, onCancel, onUnsavedDiscard, onUnsavedSave }) {
  const [newPath, setNewPath] = useState('')
  const [renamePath, setRenamePath] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (modal && inputRef.current) inputRef.current.focus()
    if (modal?.type === 'new')    setNewPath(modal.prefix ?? '')
    if (modal?.type === 'rename') setRenamePath(modal.path ?? '')
    if (modal?.type === 'gist')   setCopied(false)
  }, [modal])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        if (modal?.type === 'delete') onConfirm()
        if (modal?.type === 'new' && newPath.trim()) onConfirm(newPath.trim())
        if (modal?.type === 'rename' && renamePath.trim() && renamePath !== modal.path)
          onConfirm(renamePath.trim())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal, newPath, renamePath, onConfirm, onCancel])

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
            <div className={s.title}>{modal.folderMode ? 'New folder' : 'New note'}</div>
            <div className={s.field}>
              <label className={s.label}>File path</label>
              <input
                ref={inputRef}
                className={s.input}
                type="text"
                placeholder={modal.folderMode
                  ? (modal.prefix ? `${modal.prefix}subfolder/note.md` : 'folder/note.md')
                  : (modal.prefix ? `${modal.prefix}note.md` : 'folder/my-note.md')}
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

        {modal.type === 'rename' && (
          <>
            <div className={s.title}>Rename / move note</div>
            <div className={s.field}>
              <label className={s.label}>New file path</label>
              <input
                ref={inputRef}
                className={s.input}
                type="text"
                value={renamePath}
                onChange={e => setRenamePath(e.target.value)}
              />
              <span className={s.hint}>
                Change the path to move the note. A new commit will be created on GitHub.
              </span>
            </div>
            <div className={s.actions}>
              <button className={s.btnCancel} onClick={onCancel}>Cancel</button>
              <button
                className={s.btnConfirm}
                onClick={() => renamePath.trim() && renamePath !== modal.path && onConfirm(renamePath.trim())}
                disabled={!renamePath.trim() || renamePath === modal.path}
              >
                Rename
              </button>
            </div>
          </>
        )}

        {modal.type === 'gist' && (
          <>
            <div className={s.title}>Published as Gist</div>
            <div className={s.body}>
              Your note has been published as a secret GitHub Gist.
            </div>
            <div className={s.gistUrl}>
              <a href={modal.url} target="_blank" rel="noopener noreferrer">
                {modal.url}
              </a>
            </div>
            <div className={s.actions}>
              <button
                className={s.btnCancel}
                onClick={() => { navigator.clipboard.writeText(modal.url); setCopied(true) }}
              >
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>
              <button className={s.btnConfirm} onClick={onCancel}>Done</button>
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
