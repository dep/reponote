import { useMemo } from 'react'
import hljs from '../highlight.js'
import MarkdownViewer from './MarkdownViewer.jsx'
import MarkdownEditor from './MarkdownEditor.jsx'
import CommitHistory from './CommitHistory.jsx'
import TagResults from './TagResults.jsx'
import { saveSortOrder } from '../storage.js'
import s from '../styles/EditorPane.module.css'

// Map file extensions to highlight.js language identifiers
const EXT_LANG = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', cs: 'csharp', swift: 'swift', kt: 'kotlin',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  html: 'html', css: 'css', scss: 'scss',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
  php: 'php',
  sql: 'sql', graphql: 'graphql',
  xml: 'xml', svg: 'xml',
  dockerfile: 'dockerfile',
}

const SORT_CYCLE  = ['date-desc', 'date-asc', 'name-asc', 'name-desc']
const SORT_LABELS = {
  'date-desc': { label: 'Date', arrow: '↓' },
  'date-asc':  { label: 'Date', arrow: '↑' },
  'name-asc':  { label: 'Name', arrow: '↑' },
  'name-desc': { label: 'Name', arrow: '↓' },
}

function FolderListing({ folderPath, notes, noteMeta, onNavigate, onFolderNavigate, sortOrder, onSortChange }) {
  function cycleSortOrder() {
    const next = SORT_CYCLE[(SORT_CYCLE.indexOf(sortOrder) + 1) % SORT_CYCLE.length]
    saveSortOrder(next)
    onSortChange(next)
  }

  // Normalise: strip leading slash, ensure trailing slash; '' means root
  const rawPrefix = folderPath.replace(/^\//, '').replace(/\/?$/, '/')
  const prefix = rawPrefix === '/' ? '' : rawPrefix

  // Direct children only
  const { files, subfolders } = useMemo(() => {
    const files = []
    const seenFolders = new Set()

    for (const note of notes) {
      if (!note.path.startsWith(prefix)) continue
      const rel = note.path.slice(prefix.length)
      const slash = rel.indexOf('/')
      if (slash === -1) {
        files.push(note)
      } else {
        const folderName = rel.slice(0, slash)
        seenFolders.add(folderName)
      }
    }

    const byName  = sortOrder === 'name-asc' || sortOrder === 'name-desc'
    const asc     = sortOrder === 'name-asc'  || sortOrder === 'date-asc'

    // Sort files
    const sortedFiles = [...files].sort((a, b) => {
      let cmp
      if (byName) {
        cmp = a.path.split('/').pop().localeCompare(b.path.split('/').pop())
      } else {
        cmp = (noteMeta[b.path] ?? 0) - (noteMeta[a.path] ?? 0)
      }
      return asc ? cmp : byName ? -cmp : cmp
    })

    // Sort subfolders
    function folderRecency(name) {
      const fp = prefix + name + '/'
      let best = 0
      for (const note of notes) {
        if (note.path.startsWith(fp)) best = Math.max(best, noteMeta[note.path] ?? 0)
      }
      return best
    }

    const sortedFolders = [...seenFolders].sort((a, b) => {
      let cmp
      if (byName) {
        cmp = a.localeCompare(b)
      } else {
        cmp = folderRecency(b) - folderRecency(a)
      }
      return asc ? cmp : byName ? -cmp : cmp
    })

    return { files: sortedFiles, subfolders: sortedFolders }
  }, [notes, noteMeta, prefix, sortOrder])

  const folderName = prefix.replace(/\/$/, '').split('/').pop() || prefix

  // Breadcrumb segments from the folder path
  const breadcrumbs = useMemo(() => {
    if (!prefix) return []
    const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
    return parts.map((name, i) => ({
      name,
      path: parts.slice(0, i + 1).join('/') + '/',
    }))
  }, [prefix])

  return (
    <div className={s.folderListing}>
      <div className={s.folderHeader}>
        <div className={s.folderBreadcrumb}>
          <button className={s.breadcrumbRoot} onClick={() => onFolderNavigate('')}>
            /
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className={s.breadcrumbItem}>
              <span className={s.breadcrumbSep}>/</span>
              {i === breadcrumbs.length - 1
                ? <span className={s.breadcrumbCurrent}>{crumb.name}</span>
                : <button className={s.breadcrumbLink} onClick={() => onFolderNavigate(crumb.path)}>{crumb.name}</button>
              }
            </span>
          ))}
        </div>
        <button
          className={s.folderSortBtn}
          onClick={cycleSortOrder}
          title={`Sort: ${sortOrder} — click to cycle`}
        >
          {SORT_LABELS[sortOrder].label}
          <span className={s.folderSortArrow}>{SORT_LABELS[sortOrder].arrow}</span>
        </button>
      </div>

      <div className={s.folderBody}>
        {subfolders.length === 0 && files.length === 0 && (
          <div className={s.folderEmpty}>No files in this folder.</div>
        )}

        {subfolders.map(name => (
          <button
            key={name}
            className={s.folderRow}
            onClick={() => onFolderNavigate(prefix + name + '/')}
          >
            <span className={s.folderRowIcon}>📁</span>
            <span className={s.folderRowName}>{name}</span>
            <span className={s.folderRowMeta}>folder</span>
          </button>
        ))}

        {files.map(note => {
          const name = note.path.split('/').pop().replace(/\.md$/, '')
          const ts = noteMeta[note.path]
          const date = ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
          return (
            <button
              key={note.path}
              className={s.folderRow}
              onClick={() => onNavigate(note.path)}
            >
              <span className={s.folderRowIcon}>📄</span>
              <span className={s.folderRowName}>{name}</span>
              {date && <span className={s.folderRowMeta}>{date}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NoteBreadcrumb({ path, onFolderNavigate }) {
  const parts = path.split('/')
  if (parts.length < 2) return null // root-level file, no breadcrumb needed
  const folders = parts.slice(0, -1)
  return (
    <div className={s.noteBreadcrumb}>
      <button className={s.breadcrumbRoot} onClick={() => onFolderNavigate('/')}>
        /
      </button>
      {folders.map((name, i) => {
        const folderPath = folders.slice(0, i + 1).join('/') + '/'
        return (
          <span key={folderPath} className={s.breadcrumbItem}>
            <span className={s.breadcrumbSep}>/</span>
            <button className={s.breadcrumbLink} onClick={() => onFolderNavigate(folderPath)}>
              {name}
            </button>
          </span>
        )
      })}
    </div>
  )
}

export default function EditorPane({
  selectedPath,
  folderPath,
  noteCache,
  mode,
  editContent,
  onEditChange,
  onSave,
  onCancel,
  isSaving,
  noteError,
  onReloadNote,
  notes,
  noteMeta,
  onNavigate,
  onFolderNavigate,
  sortOrder,
  onSortChange,
  previewOpen,
  onPreviewToggle,
  backlinks = [],
  config,
  historyOpen,
  onHistoryClose,
  tagResults,
  onTagClick,
  onTagClose,
}) {
  if (folderPath !== null && folderPath !== undefined && !selectedPath) {
    return (
      <div className={s.pane}>
        <FolderListing
          folderPath={folderPath}
          notes={notes}
          noteMeta={noteMeta ?? {}}
          onNavigate={onNavigate}
          onFolderNavigate={onFolderNavigate}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
        />
      </div>
    )
  }

  if (!selectedPath) {
    return (
      <div className={s.pane}>
        <div className={s.empty}>
          <span className={s.emptyIcon}>📝</span>
          <span className={s.emptyText}>Select a note or create a new one</span>
        </div>
      </div>
    )
  }

  const cached = noteCache[selectedPath]
  const isMarkdown = selectedPath.endsWith('.md')

  const highlightedRaw = useMemo(() => {
    if (!cached || isMarkdown) return null
    const ext = selectedPath.split('.').pop().toLowerCase()
    const lang = EXT_LANG[ext]
    if (!lang || !hljs.getLanguage(lang)) return null
    return hljs.highlight(cached.content, { language: lang }).value
  }, [cached, selectedPath, isMarkdown])

  if (!cached && !noteError) {
    return (
      <div className={s.pane}>
        <div className={s.loadingPane}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className={s.pane} style={{ position: 'relative' }}>
      {historyOpen && selectedPath && (
        <CommitHistory config={config} path={selectedPath} onClose={onHistoryClose} />
      )}
      {tagResults && (
        <TagResults
          tag={tagResults.tag}
          results={tagResults.results}
          loading={tagResults.loading}
          error={tagResults.error}
          onClose={onTagClose}
          onSelect={path => { onTagClose(); onNavigate(path) }}
        />
      )}
      {noteError && (
        <div className={s.errorBanner}>
          {noteError}
          {noteError.includes('modified remotely') && (
            <button className={s.reloadBtn} onClick={onReloadNote}>
              Reload note
            </button>
          )}
        </div>
      )}

      <NoteBreadcrumb path={selectedPath} onFolderNavigate={onFolderNavigate} />

      {cached && !isMarkdown && mode === 'view' && (
        <div className={s.viewStack}>
          {highlightedRaw
            ? <pre className={`${s.rawViewer} hljs`} dangerouslySetInnerHTML={{ __html: highlightedRaw }} />
            : <pre className={s.rawViewer}>{cached.content}</pre>
          }
        </div>
      )}

      {cached && isMarkdown && mode === 'view' && (
        <div className={s.viewStack}>
          <MarkdownViewer content={cached.content} notes={notes} onNavigate={onNavigate} onTagClick={onTagClick} />
          {backlinks.length > 0 && (
            <div className={s.backlinks}>
              <div className={s.backlinksLabel}>Linked from</div>
              <div className={s.backlinksList}>
                {backlinks.map(n => {
                  const name = n.path.split('/').pop().replace(/\.md$/, '')
                  return (
                    <button
                      key={n.path}
                      className={s.backlinkItem}
                      onClick={() => onNavigate(n.path)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {cached && mode === 'edit' && (
        <MarkdownEditor
          content={editContent}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          notes={notes}
          isMarkdown={isMarkdown}
          previewOpen={previewOpen}
          onPreviewToggle={onPreviewToggle}
        />
      )}
    </div>
  )
}
