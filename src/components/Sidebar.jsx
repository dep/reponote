import NoteItem from './NoteItem.jsx'
import s from '../styles/Sidebar.module.css'

export default function Sidebar({ notes, noteCache, selectedPath, searchQuery, onSearch, onSelect, loading }) {
  const visible = notes.filter(note => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const titleMatch = note.path.toLowerCase().includes(q)
    const contentMatch = noteCache[note.path]?.content?.toLowerCase().includes(q) ?? false
    return titleMatch || contentMatch
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
