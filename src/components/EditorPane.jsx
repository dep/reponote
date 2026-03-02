import { useMemo } from 'react'
import hljs from '../highlight.js'
import MarkdownViewer from './MarkdownViewer.jsx'
import MarkdownEditor from './MarkdownEditor.jsx'
import CommitHistory from './CommitHistory.jsx'
import TagResults from './TagResults.jsx'
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

export default function EditorPane({
  selectedPath,
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
  onNavigate,
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

      {cached && !isMarkdown && (
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

      {cached && isMarkdown && mode === 'edit' && (
        <MarkdownEditor
          content={editContent}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          notes={notes}
          previewOpen={previewOpen}
          onPreviewToggle={onPreviewToggle}
        />
      )}
    </div>
  )
}
