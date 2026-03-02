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

export default function MarkdownEditor({ content, onChange, onSave, onCancel, isSaving, notes = [], isMarkdown = true, previewOpen, onPreviewToggle }) {
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

  // Insert text preserving the browser's native undo stack via execCommand.
  // Also syncs React state so saves always reflect what's on screen.
  function insertText(el, text) {
    el.focus()
    if (document.execCommand) {
      document.execCommand('insertText', false, text)
    } else {
      const start = el.selectionStart
      const end = el.selectionEnd
      el.value = el.value.substring(0, start) + text + el.value.substring(end)
      el.selectionStart = el.selectionEnd = start + text.length
    }
    // Keep React state in sync regardless of which path ran
    onChange(el.value)
  }

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
    const before = content.slice(0, cursor)
    const openIdx = before.lastIndexOf('[[')
    // Select from [[ to cursor, then replace with the completed link
    el.selectionStart = openIdx
    el.selectionEnd = cursor
    insertText(el, '[[' + name + ']]')
    setAcQuery(null)
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

    // Tab / Shift-Tab: indent or unindent affected lines by 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = ref.current
      const start = el.selectionStart
      const end = el.selectionEnd
      const indent = '  '

      if (start === end && !e.shiftKey) {
        // No selection, no shift — insert indent at cursor
        insertText(el, indent)
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + indent.length })
        return
      }

      // Find the full extent of all affected lines.
      // When there's no selection, extend to end of current line so Shift-Tab
      // unindents the whole line rather than just the text up to the cursor.
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const rawEnd = start === end ? (content.indexOf('\n', end) + 1 || content.length) : end
      const lineEnd = rawEnd > lineStart && content[rawEnd - 1] === '\n' ? rawEnd - 1 : rawEnd
      const lines = content.substring(lineStart, lineEnd).split('\n')

      let newSelStart = start
      let selAdjustment = 0

      const newLines = lines.map((line, i) => {
        if (e.shiftKey) {
          const removed = line.match(/^ {1,2}/)?.[0].length ?? 0
          if (removed === 0) return line
          if (i === 0) newSelStart = Math.max(lineStart, newSelStart - removed)
          selAdjustment -= removed
          return line.slice(removed)
        } else {
          if (i === 0) newSelStart += indent.length
          selAdjustment += indent.length
          return indent + line
        }
      })

      el.selectionStart = lineStart
      el.selectionEnd = lineEnd
      insertText(el, newLines.join('\n'))
      // Restore selection after React re-render from onChange
      requestAnimationFrame(() => {
        el.selectionStart = newSelStart
        el.selectionEnd = end + selAdjustment
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
          <span className={s.editorHint}>{isMarkdown ? '⌘S / Ctrl+S to save · type [[ to link a note' : '⌘S / Ctrl+S to save'}</span>
          <div className={s.spacer} />
          <button className={s.btnCancel} onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button className={s.btnSave} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save (commit)'}
          </button>
        </div>
      </div>

      {/* Collapsed toggle tab — only shown when preview is closed (markdown only) */}
      {isMarkdown && !previewOpen && (
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
