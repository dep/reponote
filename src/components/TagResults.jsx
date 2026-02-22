import { useEffect } from 'react'
import s from '../styles/TagResults.module.css'

export default function TagResults({ tag, results, loading, error, onClose, onSelect }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <span className={s.label}>
          Notes tagged <span className={s.tag}>#{tag}</span>
        </span>
        <button className={s.close} onClick={onClose} title="Close">✕</button>
      </div>

      <div className={s.list}>
        {loading && <div className={s.loading}>Searching…</div>}
        {error && <div className={s.error}>{error}</div>}
        {!loading && !error && results.length === 0 && (
          <div className={s.empty}>No notes found with #{tag}.</div>
        )}
        {!loading && !error && results.map(r => {
          const parts = r.path.split('/')
          const name = parts.pop().replace(/\.md$/, '')
          const folder = parts.join('/')
          return (
            <button key={r.path} className={s.item} onClick={() => onSelect(r.path)}>
              <span className={s.name}>{name}</span>
              {folder && <span className={s.folder}>{folder}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
