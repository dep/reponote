import s from '../styles/Toolbar.module.css'

export default function Toolbar({
  selectedPath,
  mode,
  status,
  onNewNote,
  onDelete,
  onToggleMode,
  onDisconnect,
}) {
  const dotClass = status.type === 'idle' ? '' : s[status.type]

  return (
    <div className={s.toolbar}>
      <div className={s.logo}>
        <span className={s.logoIcon}>📝</span>
        <span className={s.logoText}>RepoNote</span>
      </div>

      <div className={s.divider} />

      <button className={s.btnNew} onClick={onNewNote}>
        + New note
      </button>

      {selectedPath && (
        <>
          <button className={s.btnIcon} onClick={onToggleMode}>
            {mode === 'view' ? '✏️ Edit' : '👁 View'}
          </button>
          <button className={s.btnDanger} onClick={onDelete}>
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
