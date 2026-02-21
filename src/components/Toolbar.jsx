import s from '../styles/Toolbar.module.css'

export default function Toolbar({
  selectedPath,
  mode,
  status,
  onNewNote,
  onDelete,
  onToggleMode,
  onDisconnect,
  onOpenPalette,
}) {
  const dotClass = status.type === 'idle' ? '' : s[status.type]
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC')
  const mod = isMac ? '⌘' : 'Ctrl'

  return (
    <div className={s.toolbar}>
      <div className={s.logo}>
        <span className={s.logoIcon}>📝</span>
        <span className={s.logoText}>RepoNote</span>
      </div>

      <div className={s.divider} />

      <button className={s.btnNew} onClick={onNewNote} title={`New note (${mod}N)`}>
        + New note <kbd className={s.kbd}>{mod}N</kbd>
      </button>

      <button className={s.btnIcon} onClick={onOpenPalette} title={`Go to file (${mod}K)`}>
        🔍 Go to file <kbd className={s.kbd}>{mod}K</kbd>
      </button>

      {selectedPath && (
        <>
          <button className={s.btnIcon} onClick={onToggleMode} title={`Toggle edit/view (${mod}E)`}>
            {mode === 'view' ? '✏️ Edit' : '👁 View'} <kbd className={s.kbd}>{mod}E</kbd>
          </button>
          <button className={s.btnDanger} onClick={onDelete} title={`Delete note (${mod}⌫)`}>
            🗑 Delete
          </button>
        </>
      )}

      <div className={s.spacer} />

      {status.message && (
        <div className={s.status}>
          <div className={`${s.dot} ${dotClass}`} />
          {status.message}
        </div>
      )}

      <button className={s.disconnect} onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  )
}
