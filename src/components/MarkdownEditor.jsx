import { useEffect, useRef, useState } from 'react'
import MarkdownViewer from './MarkdownViewer.jsx'
import s from '../styles/EditorPane.module.css'

// Extract the [[partial query if cursor is inside an open [[ … ]]
function getWikilinkQuery(text, cursorPos) {
  const before = text.slice(0, cursorPos)
  const openIdx = before.lastIndexOf('[[')
  if (openIdx === -1) return null
  // Make sure there's no closing ]] between [[ and cursor
  const between = before.slice(openIdx + 2)
  if (between.includes(']]')) return null
  return between
}

// Fuzzy-ish filter: every character in query must appear in order in candidate
function fuzzyMatch(candidate, query) {
  if (!query) return true
  const c = candidate.toLowerCase()
  const q = query.toLowerCase()
  let ci = 0
  for (let qi = 0; qi < q.length; qi++) {
    ci = c.indexOf(q[qi], ci)
    if (ci === -1) return false
    ci++
  }
  return true
}

export default function MarkdownEditor({ content, onChange, onSave, onCancel, isSaving, notes = [], previewOpen, onPreviewToggle }) {
  const ref = useRef(null)

  // Autocomplete state
  const [acQuery, setAcQuery] = useState(null)   // null = closed, string = open
  const [acIndex, setAcIndex] = useState(0)
  const [acPos, setAcPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (ref.current) ref.current.focus()
  }, [])

  // Derive the filtered note list from current query
  const notenames = notes.map(n => {
    const parts = n.path.split('/')
    return parts[parts.length - 1].replace(/\.md$/, '')
  })
  const uniqueNames = [...new Set(notenames)]
  const acMatches = acQuery !== null
    ? uniqueNames.filter(name => fuzzyMatch(name, acQuery)).slice(0, 8)
    : []

  function handleChange(e) {
    const val = e.target.value
    onChange(val)

    const cursor = e.target.selectionStart
    const query = getWikilinkQuery(val, cursor)
    if (query !== null) {
      setAcQuery(query)
      setAcIndex(0)
      positionDropdown(e.target, cursor)
    } else {
      setAcQuery(null)
    }
  }

  // Approximate cursor position by measuring characters — works for monospace
  function positionDropdown(textarea, cursorPos) {
    const rect = textarea.getBoundingClientRect()
    const style = window.getComputedStyle(textarea)
    const lineHeight = parseFloat(style.lineHeight) || 22
    const fontSize = parseFloat(style.fontSize) || 14
    const charWidth = fontSize * 0.6  // monospace approximation
    const paddingTop = parseFloat(style.paddingTop) || 0
    const paddingLeft = parseFloat(style.paddingLeft) || 0

    const text = textarea.value.slice(0, cursorPos)
    const lines = text.split('\n')
    const currentLine = lines[lines.length - 1]
    const lineIndex = lines.length - 1

    // Scroll offset within textarea
    const scrollTop = textarea.scrollTop

    const top = rect.top + paddingTop + (lineIndex + 1) * lineHeight - scrollTop
    const left = rect.left + paddingLeft + currentLine.length * charWidth

    setAcPos({ top, left })
  }

  function applyAutocomplete(name) {
    const el = ref.current
    const cursor = el.selectionStart
    const text = content
    const before = text.slice(0, cursor)
    const openIdx = before.lastIndexOf('[[')
    const newText = text.slice(0, openIdx) + '[[' + name + ']]' + text.slice(cursor)
    onChange(newText)
    setAcQuery(null)
    // Move cursor after the inserted link
    const newCursor = openIdx + 2 + name.length + 2
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newCursor
      el.focus()
    })
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      onSave()
      return
    }

    // Autocomplete keyboard navigation
    if (acQuery !== null && acMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAcIndex(i => (i + 1) % acMatches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAcIndex(i => (i - 1 + acMatches.length) % acMatches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applyAutocomplete(acMatches[acIndex])
        return
      }
      if (e.key === 'Escape') {
        setAcQuery(null)
        return
      }
    }

    // Allow Tab to insert spaces instead of focus-jumping (only when ac closed)
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = ref.current
      const start = el.selectionStart
      const end = el.selectionEnd
      onChange(content.substring(0, start) + '  ' + content.substring(end))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }

  const editorBlock = (
    <div className={s.editorOuter}>
      <div className={s.editorWrap}>
        <textarea
          ref={ref}
          className={s.editorArea}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setAcQuery(null), 150)}
          spellCheck={false}
        />
        <div className={s.editorActions}>
          <span className={s.editorHint}>⌘S / Ctrl+S to save · type [[ to link a note</span>
          <div className={s.spacer} />
          <button className={s.btnCancel} onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button className={s.btnSave} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save (commit)'}
          </button>
        </div>
      </div>

      {/* Collapsed toggle tab — only shown when preview is closed */}
      {!previewOpen && (
        <button
          className={s.previewToggle}
          onClick={() => onPreviewToggle(true)}
          title="Open live preview"
        >
          ›
        </button>
      )}

      {/* Autocomplete dropdown */}
      {acQuery !== null && acMatches.length > 0 && (
        <div
          className={s.acDropdown}
          style={{ top: acPos.top, left: acPos.left }}
        >
          {acMatches.map((name, i) => (
            <div
              key={name}
              className={`${s.acItem} ${i === acIndex ? s.acItemActive : ''}`}
              onMouseDown={e => { e.preventDefault(); applyAutocomplete(name) }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!previewOpen) {
    return editorBlock
  }

  return (
    <div className={s.editSplit}>
      {editorBlock}

      <div className={s.previewRail}>
        <div className={s.previewRailHeader}>
          <span className={s.previewRailLabel}>Live preview</span>
          <button
            className={s.previewRailClose}
            onClick={() => onPreviewToggle(false)}
            title="Close preview"
          >
            ✕
          </button>
        </div>
        <MarkdownViewer content={content} notes={notes} />
      </div>
    </div>
  )
}
