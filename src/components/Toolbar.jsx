import s from '../styles/Toolbar.module.css'

export default function Toolbar({
  selectedPath,
  mode,
  status,
  readOnly,
  showAllFiles,
  onToggleAllFiles,
  onNewNote,
  onDelete,
  onToggleMode,
  onDisconnect,
  onOpenPalette,
  onOpenHistory,
  onRename,
  onPublishGist,
}) {
  const dotClass = status.type === 'idle' ? '' : s[status.type]
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC')
  const mod = isMac ? '⌘' : 'Ctrl'
  const isMarkdown = selectedPath?.endsWith('.md') ?? false

  return (
    <div className={s.toolbar}>
      <div className={s.logo}>
        <span className={s.logoIcon}>📝</span>
        <span className={s.logoText}>RepoNote</span>
      </div>

      <div className={s.divider} />

      {!readOnly && (
        <button className={s.btnNew} onClick={onNewNote} title={`New note (${mod}N)`}>
          + New note <kbd className={s.kbd}>{mod}N</kbd>
        </button>
      )}

      <button className={s.btnIcon} onClick={onOpenPalette} title={`Go to file (${mod}K)`}>
        🔍 Go to file <kbd className={s.kbd}>{mod}K</kbd>
      </button>

      {readOnly && (
        <span className={s.readOnlyBadge} title="No PAT — read-only access">
          Read-only
        </span>
      )}

      {selectedPath && (
        <>
          {!readOnly && isMarkdown && (
            <button className={s.btnIcon} onClick={onToggleMode} title={`Toggle edit/view (${mod}E)`}>
              {mode === 'view' ? '✏️ Edit' : '👁 View'} <kbd className={s.kbd}>{mod}E</kbd>
            </button>
          )}
          <button className={s.btnIcon} onClick={onOpenHistory} title="Commit history">
            🕓 History
          </button>
          {!readOnly && (
            <>
              {isMarkdown && (
                <>
                  <button className={s.btnIcon} onClick={onRename} title="Rename or move note">
                    📁 Rename
                  </button>
                  <button className={s.btnIcon} onClick={onPublishGist} title="Publish as secret Gist">
                    ↑ Gist
                  </button>
                </>
              )}
              <button className={s.btnDanger} onClick={onDelete} title={`Delete note (${mod}⌫)`}>
                🗑 Delete
              </button>
            </>
          )}
        </>
      )}

      <div className={s.spacer} />

      {status.message && (
        <div className={s.status}>
          <div className={`${s.dot} ${dotClass}`} />
          {status.message}
        </div>
      )}

      <button
        className={`${s.btnToggle} ${showAllFiles ? s.btnToggleActive : ''}`}
        onClick={onToggleAllFiles}
        title={showAllFiles ? 'Showing all files — click to show Markdown only' : 'Showing Markdown only — click to show all files'}
      >
        {showAllFiles ? 'All files' : 'Markdown only'}
      </button>

      <button className={s.disconnect} onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  )
}
