import MarkdownViewer from './MarkdownViewer.jsx'
import MarkdownEditor from './MarkdownEditor.jsx'
import CommitHistory from './CommitHistory.jsx'
import TagResults from './TagResults.jsx'
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
  notes,
  onNavigate,
  previewOpen,
  onPreviewToggle,
  backlinks = [],
  config,
  historyOpen,
  onHistoryClose,
  tagResults,
  onTagClick,
  onTagClose,
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
    <div className={s.pane} style={{ position: 'relative' }}>
      {historyOpen && selectedPath && (
        <CommitHistory config={config} path={selectedPath} onClose={onHistoryClose} />
      )}
      {tagResults && (
        <TagResults
          tag={tagResults.tag}
          results={tagResults.results}
          loading={tagResults.loading}
          error={tagResults.error}
          onClose={onTagClose}
          onSelect={path => { onTagClose(); onNavigate(path) }}
        />
      )}
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
        <div className={s.viewStack}>
          <MarkdownViewer content={cached.content} notes={notes} onNavigate={onNavigate} onTagClick={onTagClick} />
          {backlinks.length > 0 && (
            <div className={s.backlinks}>
              <div className={s.backlinksLabel}>Linked from</div>
              <div className={s.backlinksList}>
                {backlinks.map(n => {
                  const name = n.path.split('/').pop().replace(/\.md$/, '')
                  return (
                    <button
                      key={n.path}
                      className={s.backlinkItem}
                      onClick={() => onNavigate(n.path)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {cached && mode === 'edit' && (
        <MarkdownEditor
          content={editContent}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          notes={notes}
          previewOpen={previewOpen}
          onPreviewToggle={onPreviewToggle}
        />
      )}
    </div>
  )
}
