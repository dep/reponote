import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { loadConfig, clearConfig, saveConfig } from './storage.js'
import { listNotes, getNote, saveNote, deleteNote, getNoteCommits, renameNote, publishGist, searchNotesByTag } from './github.js'
import { downloadFile, downloadFolder } from './download.js'
import { buildHash, parseHash } from './permalink.js'
import ConfigScreen from './components/ConfigScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import Toolbar from './components/Toolbar.jsx'
import EditorPane from './components/EditorPane.jsx'
import Modal from './components/Modal.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import { Analytics } from "@vercel/analytics/react"
import s from './styles/App.module.css'

export default function App() {
  const [config, setConfig] = useState(loadConfig)

  // Notes list
  const [notes, setNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  // Track last-modified timestamps for sorting: { [path]: timestamp (ms) }
  const [noteMeta, setNoteMeta] = useState({})

  // Selected note
  const [selectedPath, setSelectedPath] = useState(null)
  const [noteCache, setNoteCache] = useState({}) // { [path]: { content, sha } }
  const [noteError, setNoteError] = useState(null)

  // Editor
  const [mode, setMode] = useState('view') // 'view' | 'edit'
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Tag search panel: null | { tag, results, loading, error }
  const [tagResults, setTagResults] = useState(null)

  // Backlinks: notes that contain a [[wikilink]] pointing to the current note
  const backlinks = useMemo(() => {
    if (!selectedPath) return []
    const parts = selectedPath.split('/')
    const currentFilename = parts[parts.length - 1].replace(/\.md$/, '').toLowerCase()
    const wikilinkRe = /\[\[([^\]]+)\]\]/g
    return notes.filter(n => {
      if (n.path === selectedPath) return false
      const cached = noteCache[n.path]
      if (!cached) return false
      for (const match of cached.content.matchAll(wikilinkRe)) {
        if (match[1].trim().toLowerCase() === currentFilename) return true
      }
      return false
    })
  }, [selectedPath, notes, noteCache])

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Status bar
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // Modal
  const [modal, setModal] = useState(null) // { type: 'delete'|'new', path?, sha? }

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Ref for the sidebar search input (⌘F focuses it)
  const searchRef = useRef(null)

  const isConfigured = config.pat && config.owner && config.repo

  // ── Permalink — write hash whenever repo/file selection changes ───────────

  // Ref so the popstate handler can read latest selectedPath without stale closure
  const selectedPathRef = useRef(selectedPath)
  useEffect(() => { selectedPathRef.current = selectedPath }, [selectedPath])

  // Write hash on every meaningful state change (skip when not configured)
  useEffect(() => {
    if (!isConfigured) return
    const hash = buildHash(config, selectedPath)
    const next = hash ? `#${hash}` : '#'
    if (window.location.hash !== next) {
      window.history.pushState(null, '', next)
    }
  }, [isConfigured, config.owner, config.repo, config.branch, selectedPath])

  // On mount: read hash and auto-configure / auto-select if present
  const didBootFromHash = useRef(false)
  useEffect(() => {
    if (didBootFromHash.current) return
    didBootFromHash.current = true

    const parsed = parseHash(window.location.hash)
    if (!parsed) return

    const { owner, repo, branch, filePath } = parsed

    // If config already matches (e.g. reloading same repo), just auto-select file
    if (
      config.owner === owner &&
      config.repo === repo &&
      config.branch === branch
    ) {
      if (filePath) {
        // Will be selected once the note list loads (handled below)
        setPendingHashFile(filePath)
      }
      return
    }

    // Repo in hash differs from stored config — apply it if we have a PAT
    // (we can't get the PAT from the hash for security reasons)
    if (config.pat) {
      const merged = { ...config, owner, repo, branch }
      saveConfig(merged)
      setConfig(merged)
      if (filePath) setPendingHashFile(filePath)
    }
    // If no PAT, the ConfigScreen will show — the hash sets owner/repo/branch as hints
    else {
      setHashHints({ owner, repo, branch })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pending file path to select once the note list has loaded
  const [pendingHashFile, setPendingHashFile] = useState(null)
  // Hints to pre-fill ConfigScreen when PAT is missing
  const [hashHints, setHashHints] = useState(null)

  // Once notes load, auto-select the pending file from the hash
  useEffect(() => {
    if (!pendingHashFile) return
    if (notes.length === 0) return
    const match = notes.find(n => n.path === pendingHashFile)
    if (match) {
      handleSelectNote(pendingHashFile)
      setPendingHashFile(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, pendingHashFile])

  // Handle browser back/forward
  useEffect(() => {
    function onPopState() {
      const parsed = parseHash(window.location.hash)
      if (!parsed) return
      const { owner, repo, branch, filePath } = parsed
      // Only react if same repo (cross-repo nav via history isn't supported without reload)
      if (owner === config.owner && repo === config.repo && branch === config.branch) {
        if (filePath && filePath !== selectedPathRef.current) {
          handleSelectNote(filePath)
        } else if (!filePath) {
          setSelectedPath(null)
          setMode('view')
        }
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.owner, config.repo, config.branch])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────

  // Keep a ref to the latest state/handlers so the listener never goes stale.
  // This fixes two bugs:
  //   1. ⌘E reading a stale noteCache (empty editor) — noteCache wasn't in deps
  //   2. ⌘N firing browser new-window — preventDefault must run before any guards
  const shortcutStateRef = useRef({})
  shortcutStateRef.current = {
    mode, selectedPath, isConfigured,
    handleSave, handleToggleMode, openDeleteModal,
  }

  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const { mode, selectedPath, isConfigured,
              handleSave, handleToggleMode, openDeleteModal } = shortcutStateRef.current

      const tag = document.activeElement?.tagName
      const inText = tag === 'TEXTAREA' || (tag === 'INPUT' && document.activeElement !== searchRef.current)

      // Identify the shortcut first so we can preventDefault before any guards.
      // Unknown shortcuts fall through without calling preventDefault.
      const key = e.key

      if (key === 's' && inText) {
        // ⌘S inside editor — let MarkdownEditor's own handler fire, don't intercept
        return
      }
      if (key === 's' && mode === 'edit' && selectedPath) {
        e.preventDefault()
        handleSave()
      } else if (key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if (key === 'k' && !inText) {
        e.preventDefault()
        if (isConfigured) setPaletteOpen(p => !p)
      } else if (key === 'n' && !inText) {
        e.preventDefault()
        if (isConfigured) setModal({ type: 'new' })
      } else if (key === 'e' && selectedPath) {
        e.preventDefault()
        handleToggleMode()
      } else if ((key === 'Backspace' || key === 'Delete') && !inText && selectedPath) {
        e.preventDefault()
        openDeleteModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // registered once — reads live state via ref

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

  // Close history panel when switching notes
  useEffect(() => { setHistoryOpen(false) }, [selectedPath])

  // Inner: actually load + switch to the note (no unsaved check).
  const handleSelectNote = useCallback(async (path) => {
    setSelectedPath(path)
    setMode('view')
    setEditContent('')
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

  // Outer: used by Sidebar + popstate. Guards unsaved changes before switching.
  function handleSelectNoteGuarded(path) {
    if (path === selectedPath) return
    const dirty = mode === 'edit' && editContent !== (noteCache[selectedPath]?.content ?? '')
    if (dirty) {
      setModal({ type: 'unsaved', path: selectedPath, onProceed: () => handleSelectNote(path) })
    } else {
      handleSelectNote(path)
    }
  }

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

  // ── Unsaved-changes guard ─────────────────────────────────────────────────

  // If there are unsaved changes, open the warning modal with a proceed callback.
  // Otherwise call onProceed immediately.
  function guardUnsaved(onProceed) {
    const dirty = mode === 'edit' && editContent !== (noteCache[selectedPath]?.content ?? '')
    if (dirty) {
      setModal({ type: 'unsaved', path: selectedPath, onProceed })
    } else {
      onProceed()
    }
  }

  // Called when user clicks "Discard" in the unsaved modal
  function handleUnsavedDiscard() {
    const onProceed = modal?.onProceed
    setModal(null)
    setMode('view')
    setEditContent('')
    onProceed?.()
  }

  // Called when user clicks "Save (commit)" in the unsaved modal
  async function handleUnsavedSave() {
    const onProceed = modal?.onProceed
    setModal(null)
    await handleSave()
    onProceed?.()
  }

  // ── Toggle edit/view mode ─────────────────────────────────────────────────

  function handleToggleMode() {
    if (mode === 'view') {
      setEditContent(noteCache[selectedPath]?.content ?? '')
      setMode('edit')
    } else {
      guardUnsaved(() => {
        setMode('view')
        setEditContent('')
      })
    }
  }

  function handleCancelEdit() {
    guardUnsaved(() => {
      setMode('view')
      setEditContent('')
    })
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
      setNoteMeta(prev => ({ ...prev, [selectedPath]: Date.now() }))
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
      setNoteMeta(prev => ({ ...prev, [path]: Date.now() }))
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

  // ── Rename / move a note ─────────────────────────────────────────────────

  function openRenameModal() {
    if (!selectedPath) return
    setModal({ type: 'rename', path: selectedPath })
  }

  async function handleRenameConfirm(rawNewPath) {
    if (!modal || modal.type !== 'rename') return
    let newPath = rawNewPath.trim()
    if (!newPath.endsWith('.md')) newPath += '.md'
    if (newPath === selectedPath) { setModal(null); return }
    if (notes.some(n => n.path === newPath)) {
      setStatus({ type: 'error', message: `A note already exists at "${newPath}".` })
      return
    }
    const oldPath = selectedPath
    const content = (mode === 'edit' ? editContent : null) ?? noteCache[oldPath]?.content ?? ''
    const sha = noteCache[oldPath]?.sha ?? notes.find(n => n.path === oldPath)?.sha
    setModal(null)
    setStatus({ type: 'saving', message: 'Renaming…' })
    try {
      const newSha = await renameNote(config, oldPath, newPath, content, sha)
      setNoteCache(prev => {
        const next = { ...prev }
        delete next[oldPath]
        next[newPath] = { content, sha: newSha }
        return next
      })
      setNotes(prev =>
        prev
          .filter(n => n.path !== oldPath)
          .concat({ path: newPath, sha: newSha })
          .sort((a, b) => a.path.localeCompare(b.path))
      )
      setNoteMeta(prev => {
        const next = { ...prev }
        delete next[oldPath]
        next[newPath] = Date.now()
        return next
      })
      setSelectedPath(newPath)
      setMode('view')
      setStatus({ type: 'success', message: 'Renamed.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  }

  // ── Publish as Gist ───────────────────────────────────────────────────────

  async function handlePublishGist() {
    if (!selectedPath) return
    const content = noteCache[selectedPath]?.content ?? ''
    setStatus({ type: 'saving', message: 'Publishing gist…' })
    try {
      const url = await publishGist(config, selectedPath, content)
      setStatus({ type: 'success', message: 'Gist published.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000)
      setModal({ type: 'gist', url })
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  }

  // ── Tag search ────────────────────────────────────────────────────────────

  async function handleTagClick(tag) {
    setTagResults({ tag, results: [], loading: true, error: null })
    try {
      const results = await searchNotesByTag(config, tag)
      setTagResults({ tag, results, loading: false, error: null })
    } catch (e) {
      setTagResults({ tag, results: [], loading: false, error: e.message })
    }
  }

  // ── Download file / folder ────────────────────────────────────────────────

  async function handleDownloadFile(path) {
    setStatus({ type: 'loading', message: 'Preparing download…' })
    try {
      await downloadFile(config, path, noteCache)
      setStatus({ type: 'success', message: 'Downloaded.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  }

  async function handleDownloadFolder(folderPath) {
    setStatus({ type: 'loading', message: 'Preparing ZIP…' })
    try {
      await downloadFolder(config, folderPath, notes, noteCache, (fetched, total) => {
        setStatus({ type: 'loading', message: `Fetching ${fetched}/${total} files…` })
      })
      setStatus({ type: 'success', message: 'ZIP downloaded.' })
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
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
    setHashHints(null)
    setPendingHashFile(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <ConfigScreen
        hints={hashHints}
        onConnect={(cfg) => {
          setConfig(cfg)
          if (pendingHashFile) {
            // will be picked up by the pendingHashFile effect once notes load
          }
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
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenHistory={() => setHistoryOpen(h => !h)}
        onRename={openRenameModal}
        onPublishGist={handlePublishGist}
      />

      <div className={s.body}>
        <Sidebar
          notes={notes}
          noteCache={noteCache}
          noteMeta={noteMeta}
          selectedPath={selectedPath}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={handleSelectNoteGuarded}
          loading={loadingNotes}
          searchRef={searchRef}
          onDownloadFile={handleDownloadFile}
          onDownloadFolder={handleDownloadFolder}
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
          notes={notes}
          onNavigate={handleSelectNoteGuarded}
          previewOpen={previewOpen}
          onPreviewToggle={setPreviewOpen}
          backlinks={backlinks}
          config={config}
          historyOpen={historyOpen}
          onHistoryClose={() => setHistoryOpen(false)}
          tagResults={tagResults}
          onTagClick={handleTagClick}
          onTagClose={() => setTagResults(null)}
        />
      </div>

      <Modal
        modal={modal}
        onConfirm={
          modal?.type === 'new'    ? handleCreate :
          modal?.type === 'rename' ? handleRenameConfirm :
          modal?.type === 'gist'   ? () => setModal(null) :
          handleDeleteConfirm
        }
        onCancel={() => setModal(null)}
        onUnsavedDiscard={handleUnsavedDiscard}
        onUnsavedSave={handleUnsavedSave}
      />

      {paletteOpen && (
        <CommandPalette
          notes={notes}
          onSelect={path => { setPaletteOpen(false); handleSelectNoteGuarded(path) }}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      <Analytics />
    </div>
  )
}
