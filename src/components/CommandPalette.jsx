import { useState, useEffect, useRef, useCallback } from 'react'
import s from '../styles/CommandPalette.module.css'

/**
 * Fuzzy-filter: returns true if all chars of `query` appear in `str` in order.
 * Also returns an array of match indices for highlighting.
 */
function fuzzyMatch(str, query) {
  if (!query) return { match: true, indices: [] }
  const lower = str.toLowerCase()
  const q = query.toLowerCase()
  const indices = []
  let si = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = lower.indexOf(q[qi], si)
    if (found === -1) return { match: false, indices: [] }
    indices.push(found)
    si = found + 1
  }
  return { match: true, indices }
}

/**
 * Render a string with matched character indices highlighted via <mark>.
 */
function Highlighted({ text, indices }) {
  if (!indices.length) return <span>{text}</span>
  const indexSet = new Set(indices)
  return (
    <span>
      {text.split('').map((ch, i) =>
        indexSet.has(i) ? <mark key={i}>{ch}</mark> : ch
      )}
    </span>
  )
}

export default function CommandPalette({ notes, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter + score results
  const results = notes
    .map(note => {
      const parts = note.path.split('/')
      const name = parts.pop().replace(/\.md$/, '')
      const folder = parts.join('/')
      const { match, indices } = fuzzyMatch(name, query)
      // Also try matching against full path for folder-aware queries
      const { match: fullMatch, indices: fullIndices } = fuzzyMatch(note.path, query)
      if (!match && !fullMatch) return null
      return {
        path: note.path,
        name,
        folder,
        indices: match ? indices : [],           // prefer name match highlights
        score: match ? indices.length : 99,       // name matches rank first
      }
    })
    .filter(Boolean)
    .slice(0, 50) // cap at 50 for perf

  // Reset cursor when results change
  useEffect(() => { setActiveIdx(0) }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[activeIdx]) {
        onSelect(results[activeIdx].path)
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, activeIdx, onSelect, onClose])

  return (
    <div className={s.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={s.palette}>
        <div className={s.inputRow}>
          <span className={s.icon}>🔍</span>
          <input
            ref={inputRef}
            className={s.input}
            type="text"
            placeholder="Go to file…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <span className={s.kbdHint}><kbd>esc</kbd> to close</span>
        </div>

        <div className={s.results} ref={listRef}>
          {results.length === 0 ? (
            <div className={s.empty}>No files match "{query}"</div>
          ) : (
            results.map((item, i) => (
              <div
                key={item.path}
                className={`${s.item} ${i === activeIdx ? s.active : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={() => { onSelect(item.path); onClose() }}
              >
                <span className={s.itemIcon}>📄</span>
                <span className={s.itemName}>
                  <Highlighted text={item.name} indices={item.indices} />
                </span>
                {item.folder && (
                  <span className={s.itemPath}>{item.folder}</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className={s.footer}>
          <span className={s.footerHint}><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span className={s.footerHint}><kbd>↵</kbd> open</span>
          <span className={s.footerHint}><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
