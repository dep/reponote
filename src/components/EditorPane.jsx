import MarkdownViewer from './MarkdownViewer.jsx'
import MarkdownEditor from './MarkdownEditor.jsx'
import s from '../styles/EditorPane.module.css'

export default function EditorPane({
  selectedPath,
  noteCache,
  mode,
  editContent,
  onEditChange,
  onSave,
  onCancel,
  isSaving,
  noteError,
  onReloadNote,
}) {
  if (!selectedPath) {
    return (
      <div className={s.pane}>
        <div className={s.empty}>
          <span className={s.emptyIcon}>📝</span>
          <span className={s.emptyText}>Select a note or create a new one</span>
        </div>
      </div>
    )
  }

  const cached = noteCache[selectedPath]

  if (!cached && !noteError) {
    return (
      <div className={s.pane}>
        <div className={s.loadingPane}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className={s.pane}>
      {noteError && (
        <div className={s.errorBanner}>
          {noteError}
          {noteError.includes('modified remotely') && (
            <button className={s.reloadBtn} onClick={onReloadNote}>
              Reload note
            </button>
          )}
        </div>
      )}

      {cached && mode === 'view' && (
        <MarkdownViewer content={cached.content} />
      )}

      {cached && mode === 'edit' && (
        <MarkdownEditor
          content={editContent}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
