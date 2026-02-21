import { useState, useMemo, useEffect, useRef } from 'react'
import NoteItem from './NoteItem.jsx'
import s from '../styles/Sidebar.module.css'

// Build a nested tree from a flat list of note paths.
// Returns { rootNotes: [...], folders: { 'folderPath': { notes: [...], subfolders: {...} } } }
function buildTree(notes, noteMeta) {
  const root = { notes: [], folders: {} }

  for (const note of notes) {
    const parts = note.path.split('/')
    if (parts.length === 1) {
      root.notes.push(note)
    } else {
      // Walk/create folder nodes
      let node = root
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i]
        if (!node.folders[seg]) {
          node.folders[seg] = { notes: [], folders: {}, fullPath: parts.slice(0, i + 1).join('/') }
        }
        node = node.folders[seg]
      }
      node.notes.push(note)
    }
  }

  // Sort notes within each node by noteMeta (recent first), then alpha
  function sortNotes(nodeNotes) {
    return [...nodeNotes].sort((a, b) => {
      const ta = noteMeta[a.path] ?? 0
      const tb = noteMeta[b.path] ?? 0
      if (ta !== tb) return tb - ta
      return a.path.localeCompare(b.path)
    })
  }

  // Sort folder entries: folders whose most-recent noteMeta note bubbles first, then alpha
  function folderRecency(folderNode) {
    let best = 0
    function walk(n) {
      for (const note of n.notes) best = Math.max(best, noteMeta[note.path] ?? 0)
      for (const sub of Object.values(n.folders)) walk(sub)
    }
    walk(folderNode)
    return best
  }

  function sortedFolders(foldersObj) {
    return Object.entries(foldersObj)
      .sort(([nameA, nodeA], [nameB, nodeB]) => {
        const ta = folderRecency(nodeA)
        const tb = folderRecency(nodeB)
        if (ta !== tb) return tb - ta
        return nameA.localeCompare(nameB)
      })
      .map(([name, node]) => ({
        name,
        fullPath: node.fullPath,
        notes: sortNotes(node.notes),
        folders: sortedFolders(node.folders),
      }))
  }

  return {
    rootNotes: sortNotes(root.notes),
    folders: sortedFolders(root.folders),
  }
}

// Recursive folder component
function FolderNode({ folder, depth, collapsed, onToggle, selectedPath, onSelect, noteMeta }) {
  const isCollapsed = collapsed.has(folder.fullPath)
  const hasRecent = Object.keys(noteMeta).some(p => p.startsWith(folder.fullPath + '/'))
  const indent = depth * 12

  return (
    <div className={s.folderGroup}>
      {/* Folder header row */}
      <div
        className={s.folderRow}
        style={{ paddingLeft: 14 + indent }}
        onClick={() => onToggle(folder.fullPath)}
        title={folder.fullPath}
      >
        <svg className={`${s.chevron} ${isCollapsed ? s.chevronCollapsed : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg className={`${s.folderIcon} ${!isCollapsed ? s.folderIconOpen : ''}`} width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="currentColor" opacity="0.5"/>
          <path d="M1 6h14v7a1 1 0 01-1 1H2a1 1 0 01-1-1V6z" fill="currentColor"/>
        </svg>
        <span className={s.folderName}>{folder.name}</span>
        {hasRecent && <span className={s.folderDot} />}
      </div>

      {/* Folder contents (notes + subfolders) */}
      {!isCollapsed && (
        <div className={s.folderContents}>
          {/* Subfolders first */}
          {folder.folders.map(sub => (
            <FolderNode
              key={sub.fullPath}
              folder={sub}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
              noteMeta={noteMeta}
            />
          ))}
          {/* Then notes */}
          {folder.notes.map(note => (
            <NoteItem
              key={note.path}
              path={note.path}
              depth={depth + 1}
              isSelected={note.path === selectedPath}
              onClick={() => onSelect(note.path)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Collect every folder fullPath from the tree recursively
function allFolderPaths(folders) {
  const paths = []
  for (const f of folders) {
    paths.push(f.fullPath)
    paths.push(...allFolderPaths(f.folders))
  }
  return paths
}

export default function Sidebar({ notes, noteCache, noteMeta, selectedPath, searchQuery, onSearch, onSelect, loading, searchRef }) {
  const [collapsed, setCollapsed] = useState(new Set())
  const initializedRef = useRef(false)

  function toggleFolder(path) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Once notes load for the first time, collapse all folders by default
  useEffect(() => {
    if (initializedRef.current || notes.length === 0) return
    const tree = buildTree(notes, noteMeta)
    const paths = allFolderPaths(tree.folders)
    if (paths.length > 0) {
      setCollapsed(new Set(paths))
      initializedRef.current = true
    }
  }, [notes]) // eslint-disable-line react-hooks/exhaustive-deps

  // When searching: flat filtered list sorted by recency then alpha
  const isSearching = searchQuery.trim().length > 0

  const filtered = useMemo(() => {
    if (!isSearching) return notes
    const q = searchQuery.toLowerCase().trim()
    return notes.filter(note => {
      const titleMatch = note.path.toLowerCase().includes(q)
      const contentMatch = noteCache[note.path]?.content?.toLowerCase().includes(q) ?? false
      return titleMatch || contentMatch
    })
  }, [notes, noteCache, searchQuery, isSearching])

  const flatSorted = useMemo(() => {
    if (!isSearching) return []
    return [...filtered].sort((a, b) => {
      const ta = noteMeta[a.path] ?? 0
      const tb = noteMeta[b.path] ?? 0
      if (ta !== tb) return tb - ta
      return a.path.localeCompare(b.path)
    })
  }, [filtered, noteMeta, isSearching])

  const tree = useMemo(() => {
    if (isSearching) return null
    return buildTree(notes, noteMeta)
  }, [notes, noteMeta, isSearching])

  return (
    <div className={s.sidebar}>
      <div className={s.search}>
        <input
          ref={searchRef}
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
        ) : isSearching ? (
          // Flat search results
          flatSorted.length === 0 ? (
            <div className={s.empty}>No notes match your search.</div>
          ) : (
            flatSorted.map(note => (
              <NoteItem
                key={note.path}
                path={note.path}
                depth={0}
                isSelected={note.path === selectedPath}
                onClick={() => onSelect(note.path)}
                showFolder
              />
            ))
          )
        ) : notes.length === 0 ? (
          <div className={s.empty}>No markdown files found.</div>
        ) : (
          // Tree view — folders first, then root-level notes
          <>
            {tree.folders.map(folder => (
              <FolderNode
                key={folder.fullPath}
                folder={folder}
                depth={0}
                collapsed={collapsed}
                onToggle={toggleFolder}
                selectedPath={selectedPath}
                onSelect={onSelect}
                noteMeta={noteMeta}
              />
            ))}
            {/* Root-level notes (no folder) after all folders */}
            {tree.rootNotes.length > 0 && tree.folders.length > 0 && (
              <div className={s.rootDivider} />
            )}
            {tree.rootNotes.map(note => (
              <NoteItem
                key={note.path}
                path={note.path}
                depth={0}
                isSelected={note.path === selectedPath}
                onClick={() => onSelect(note.path)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
