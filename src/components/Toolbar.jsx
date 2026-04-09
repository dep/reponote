import s from '../styles/Toolbar.module.css'

export default function Toolbar({
  status,
  readOnly,
  showAllFiles,
  onToggleAllFiles,
  onNewNote,
  onDisconnect,
  onOpenPalette,
  selectedPath,
  mode,
  onToggleMode,
  onMenuToggle,
}) {
  const dotClass = status.type === 'idle' ? '' : s[status.type]
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC')
  const mod = isMac ? '⌘' : 'Ctrl'
  return (
    <div className={s.toolbar}>
      <button className={s.menuBtn} onClick={onMenuToggle} title="Toggle sidebar" aria-label="Toggle sidebar">
        ☰
      </button>

      <div className={s.logo}>
        <span className={s.logoIcon}>📝</span>
        <span className={s.logoText}>RepoNote</span>
      </div>

      <div className={s.divider} />

      {!readOnly && (
        <button className={s.btnNew} onClick={onNewNote} title={`New file (${mod}N)`}>
          <span className={s.btnLabel}>+ New file</span><kbd className={s.kbd}>{mod}N</kbd>
        </button>
      )}

      <button className={s.btnIcon} onClick={onOpenPalette} title={`Go to file (${mod}K)`}>
        🔍 <span className={s.btnLabel}>Go to file</span><kbd className={s.kbd}>{mod}K</kbd>
      </button>

      {selectedPath && !readOnly && (
        <button className={s.btnIcon} onClick={onToggleMode} title={`Toggle edit/view (${mod}E)`}>
          <span className={s.btnLabel}>{mode === 'view' ? 'Edit' : 'View'}</span><kbd className={s.kbd}>{mod}E</kbd>
        </button>
      )}

      {readOnly && (
        <span className={s.readOnlyBadge} title="No PAT — read-only access">
          Read-only
        </span>
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
