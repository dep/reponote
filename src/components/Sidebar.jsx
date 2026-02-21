import NoteItem from './NoteItem.jsx'
import s from '../styles/Sidebar.module.css'

export default function Sidebar({ notes, noteCache, noteMeta, selectedPath, searchQuery, onSearch, onSelect, loading }) {
  // Filter by search query
  const filtered = notes.filter(note => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const titleMatch = note.path.toLowerCase().includes(q)
    const contentMatch = noteCache[note.path]?.content?.toLowerCase().includes(q) ?? false
    return titleMatch || contentMatch
  })

  // Sort: notes with a known lastModified (from saves/creates this session) come first,
  // descending by timestamp. The rest stay in their original alphabetical order.
  const visible = [...filtered].sort((a, b) => {
    const ta = noteMeta[a.path] ?? 0
    const tb = noteMeta[b.path] ?? 0
    if (ta !== tb) return tb - ta          // most recently modified first
    return a.path.localeCompare(b.path)    // alphabetical tiebreak
  })

  return (
    <div className={s.sidebar}>
      <div className={s.search}>
        <input
          className={s.searchInput}
          type="search"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className={s.list}>
        {loading ? (
          <div className={s.loading}>
            <div className={s.skeleton} />
            <div className={s.skeleton} />
            <div className={s.skeleton} />
          </div>
        ) : visible.length === 0 ? (
          <div className={s.empty}>
            {searchQuery ? 'No notes match your search.' : 'No markdown files found.'}
          </div>
        ) : (
          visible.map(note => (
            <NoteItem
              key={note.path}
              path={note.path}
              isSelected={note.path === selectedPath}
              onClick={() => onSelect(note.path)}
            />
          ))
        )}
      </div>
    </div>
  )
}
