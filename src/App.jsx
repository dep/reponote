import { useState, useEffect, useCallback } from 'react'
import { loadConfig, clearConfig } from './storage.js'
import { listNotes, getNote, saveNote, deleteNote } from './github.js'
import ConfigScreen from './components/ConfigScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import Toolbar from './components/Toolbar.jsx'
import EditorPane from './components/EditorPane.jsx'
import Modal from './components/Modal.jsx'
import s from './styles/App.module.css'

export default function App() {
  const [config, setConfig] = useState(loadConfig)

  // Notes list
  const [notes, setNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)

  // Selected note
  const [selectedPath, setSelectedPath] = useState(null)
  const [noteCache, setNoteCache] = useState({}) // { [path]: { content, sha } }
  const [noteError, setNoteError] = useState(null)

  // Editor
  const [mode, setMode] = useState('view') // 'view' | 'edit'
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Status bar
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // Modal
  const [modal, setModal] = useState(null) // { type: 'delete'|'new', path?, sha? }

  const isConfigured = config.pat && config.owner && config.repo

  // ── Fetch note list ───────────────────────────────────────────────────────

  const fetchNoteList = useCallback(async (cfg = config) => {
    setLoadingNotes(true)
    setStatus({ type: 'loading', message: 'Loading notes…' })
    try {
      const list = await listNotes(cfg)
      setNotes(list)
      setStatus({ type: 'idle', message: '' })
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    } finally {
      setLoadingNotes(false)
    }
  }, [config])

  useEffect(() => {
    if (isConfigured) fetchNoteList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured])

  // ── Select a note ─────────────────────────────────────────────────────────

  const handleSelectNote = useCallback(async (path) => {
    setSelectedPath(path)
    setMode('view')
    setNoteError(null)

    if (noteCache[path]) return // already cached

    setStatus({ type: 'loading', message: 'Fetching note…' })
    try {
      const { content, sha } = await getNote(config, path)
      setNoteCache(prev => ({ ...prev, [path]: { content, sha } }))
      setStatus({ type: 'idle', message: '' })
    } catch (e) {
      setNoteError(e.message)
      setStatus({ type: 'error', message: e.message })
    }
  }, [config, noteCache])

  // ── Reload a note (e.g. after conflict) ───────────────────────────────────

  const handleReloadNote = useCallback(async () => {
    if (!selectedPath) return
    setNoteError(null)
    setStatus({ type: 'loading', message: 'Reloading note…' })
    try {
      const { content, sha } = await getNote(config, selectedPath)
      setNoteCache(prev => ({ ...prev, [selectedPath]: { content, sha } }))
      setMode('view')
      setStatus({ type: 'idle', message: '' })
    } catch (e) {
      setNoteError(e.message)
      setStatus({ type: 'error', message: e.message })
    }
  }, [config, selectedPath])

  // ── Toggle edit/view mode ─────────────────────────────────────────────────

  function handleToggleMode() {
    if (mode === 'view') {
      setEditContent(noteCache[selectedPath]?.content ?? '')
      setMode('edit')
    } else {
      handleCancelEdit()
    }
  }

  function handleCancelEdit() {
    setMode('view')
    setEditContent('')
  }

  // ── Save a note ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedPath) return
    setIsSaving(true)
    setStatus({ type: 'saving', message: 'Saving…' })
    const sha = noteCache[selectedPath]?.sha ?? null
    try {
      const result = await saveNote(config, selectedPath, editContent, sha)
      const newSha = result.content.sha
      setNoteCache(prev => ({
        ...prev,
        [selectedPath]: { content: editContent, sha: newSha },
      }))
      setMode('view')
      setStatus({ type: 'success', message: 'Saved.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      const isConflict = e.status === 409 || e.status === 422
      const msg = isConflict
        ? 'Conflict: file was modified remotely. Reload the note to get the latest version.'
        : e.message
      setNoteError(msg)
      setStatus({ type: 'error', message: isConflict ? 'Conflict' : e.message })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Create a note ─────────────────────────────────────────────────────────

  async function handleCreate(rawPath) {
    let path = rawPath.trim()
    if (!path.endsWith('.md')) path += '.md'
    // Prevent path traversal
    if (path.startsWith('/') || path.includes('..')) {
      setStatus({ type: 'error', message: 'Invalid path.' })
      return
    }

    setModal(null)
    setStatus({ type: 'saving', message: 'Creating…' })
    try {
      await saveNote(config, path, '# ' + path.split('/').pop().replace(/\.md$/, '') + '\n\n', null)
      await fetchNoteList()
      // Select and open in edit mode
      const { content, sha } = await getNote(config, path)
      setNoteCache(prev => ({ ...prev, [path]: { content, sha } }))
      setSelectedPath(path)
      setEditContent(content)
      setMode('edit')
      setStatus({ type: 'success', message: 'Note created.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  }

  // ── Delete a note ─────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!modal || modal.type !== 'delete') return
    const { path, sha } = modal
    setModal(null)
    setStatus({ type: 'saving', message: 'Deleting…' })
    try {
      await deleteNote(config, path, sha)
      setNoteCache(prev => {
        const next = { ...prev }
        delete next[path]
        return next
      })
      setNotes(prev => prev.filter(n => n.path !== path))
      if (selectedPath === path) {
        setSelectedPath(null)
        setMode('view')
        setNoteError(null)
      }
      setStatus({ type: 'success', message: 'Deleted.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  }

  function openDeleteModal() {
    if (!selectedPath) return
    const note = notes.find(n => n.path === selectedPath)
    const sha = noteCache[selectedPath]?.sha ?? note?.sha
    setModal({ type: 'delete', path: selectedPath, sha })
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  function handleDisconnect() {
    clearConfig()
    setConfig({ pat: '', owner: '', repo: '', branch: 'main' })
    setNotes([])
    setNoteCache({})
    setSelectedPath(null)
    setMode('view')
    setStatus({ type: 'idle', message: '' })
    setModal(null)
    setSearchQuery('')
    setNoteError(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <ConfigScreen
        onConnect={(cfg) => {
          setConfig(cfg)
        }}
      />
    )
  }

  return (
    <div className={s.shell}>
      <Toolbar
        selectedPath={selectedPath}
        mode={mode}
        status={status}
        onNewNote={() => setModal({ type: 'new' })}
        onDelete={openDeleteModal}
        onToggleMode={handleToggleMode}
        onDisconnect={handleDisconnect}
      />

      <div className={s.body}>
        <Sidebar
          notes={notes}
          noteCache={noteCache}
          selectedPath={selectedPath}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={handleSelectNote}
          loading={loadingNotes}
        />

        <EditorPane
          selectedPath={selectedPath}
          noteCache={noteCache}
          mode={mode}
          editContent={editContent}
          onEditChange={setEditContent}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          noteError={noteError}
          onReloadNote={handleReloadNote}
        />
      </div>

      <Modal
        modal={modal}
        onConfirm={modal?.type === 'new' ? handleCreate : handleDeleteConfirm}
        onCancel={() => setModal(null)}
      />
    </div>
  )
}
