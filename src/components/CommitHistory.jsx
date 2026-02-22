import { useEffect, useState } from 'react'
import { getNoteCommits } from '../github.js'
import s from '../styles/CommitHistory.module.css'

export default function CommitHistory({ config, path, onClose }) {
  const [commits, setCommits] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setCommits(null)
    setError(null)
    getNoteCommits(config, path)
      .then(setCommits)
      .catch(e => setError(e.message))
  }, [path])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <span className={s.label}>Commit history</span>
        <button className={s.close} onClick={onClose} title="Close">✕</button>
      </div>
      <div className={s.path}>{path}</div>

      <div className={s.list}>
        {!commits && !error && (
          <div className={s.loading}>Loading…</div>
        )}
        {error && (
          <div className={s.error}>{error}</div>
        )}
        {commits && commits.length === 0 && (
          <div className={s.empty}>No commits found.</div>
        )}
        {commits && commits.map(c => (
          <div key={c.sha} className={s.commit}>
            <div className={s.commitMeta}>
              <code className={s.sha}>{c.sha}</code>
              <span className={s.author}>{c.author}</span>
              <span className={s.date}>{new Date(c.date).toLocaleDateString()}</span>
            </div>
            <div className={s.message}>{c.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
