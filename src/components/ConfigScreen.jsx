import { useState } from 'react'
import { saveConfig } from '../storage.js'
import { listNotes } from '../github.js'
import s from '../styles/ConfigScreen.module.css'

// Parse a GitHub repo URL into { owner, repo, branch }
// Handles:
//   https://github.com/owner/repo
//   https://github.com/owner/repo/tree/branch
//   owner/repo
function parseGitHubUrl(raw) {
  const str = raw.trim()
  // Full URL
  const urlMatch = str.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\/.*)?$/)
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] || 'main' }
  }
  // owner/repo shorthand
  const shortMatch = str.match(/^([^/]+)\/([^/]+)$/)
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2], branch: 'main' }
  }
  return null
}

export default function ConfigScreen({ onConnect, hints }) {
  const [tab, setTab] = useState('pat') // 'pat' | 'url'

  // PAT tab state
  const [form, setForm] = useState({
    pat: '',
    owner: hints?.owner ?? '',
    repo: hints?.repo ?? '',
    branch: hints?.branch ?? 'main',
  })

  // URL tab state
  const [repoUrl, setRepoUrl] = useState(
    hints?.owner && hints?.repo
      ? `https://github.com/${hints.owner}/${hints.repo}`
      : ''
  )

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { type: 'success'|'error', message }

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleTest() {
    if (!form.pat || !form.owner || !form.repo) {
      setTestResult({ type: 'error', message: 'Fill in all fields first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const notes = await listNotes(form)
      setTestResult({ type: 'success', message: `Connected! Found ${notes.length} markdown file${notes.length !== 1 ? 's' : ''}.` })
    } catch (e) {
      setTestResult({ type: 'error', message: e.message })
    } finally {
      setTesting(false)
    }
  }

  function handleConnect() {
    if (!form.pat || !form.owner || !form.repo) {
      setTestResult({ type: 'error', message: 'All fields are required.' })
      return
    }
    saveConfig(form)
    onConnect(form)
  }

  async function handleBrowse() {
    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      setTestResult({ type: 'error', message: 'Could not parse URL. Try: https://github.com/owner/repo' })
      return
    }
    setTesting(true)
    setTestResult(null)
    const cfg = { pat: '', ...parsed }
    try {
      const notes = await listNotes(cfg)
      setTestResult({ type: 'success', message: `Found ${notes.length} markdown file${notes.length !== 1 ? 's' : ''}. Read-only access.` })
      saveConfig(cfg)
      onConnect(cfg)
    } catch (e) {
      const msg = e.status === 404
        ? 'Repo not found — it may be private or the URL is incorrect.'
        : e.status === 403 || e.status === 401
        ? 'Access denied. This repo may be private — use a PAT to access it.'
        : e.message
      setTestResult({ type: 'error', message: msg })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={s.overlay}>
      <div className={s.card}>
        <div className={s.logo}>
          <span className={s.logoIcon}>📝</span>
          <span className={s.logoText}>RepoNote</span>
        </div>

        <div className={s.tabs}>
          <button
            className={`${s.tab} ${tab === 'pat' ? s.tabActive : ''}`}
            onClick={() => { setTab('pat'); setTestResult(null) }}
          >
            Personal Access Token
          </button>
          <button
            className={`${s.tab} ${tab === 'url' ? s.tabActive : ''}`}
            onClick={() => { setTab('url'); setTestResult(null) }}
          >
            Public repo URL
          </button>
        </div>

        {tab === 'pat' && (
          <>
            <div className={s.warning}>
              <strong>Security notice:</strong> Your Personal Access Token will be stored in{' '}
              <code>localStorage</code> unencrypted. This is a proof-of-concept.
              Use a fine-grained PAT scoped to a single repo, and avoid using this on
              shared computers.
            </div>

            <div className={s.form}>
              <div className={s.field}>
                <label className={s.label}>
                  Personal Access Token{' '}
                  <a
                    className={s.labelHint}
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noreferrer"
                  >
                    (create one ↗)
                  </a>
                </label>
                <input
                  className={s.input}
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={form.pat}
                  onChange={set('pat')}
                  autoComplete="off"
                />
              </div>

              <div className={s.row}>
                <div className={s.field}>
                  <label className={s.label}>Owner</label>
                  <input
                    className={s.input}
                    type="text"
                    placeholder="username or org"
                    value={form.owner}
                    onChange={set('owner')}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Repo</label>
                  <input
                    className={s.input}
                    type="text"
                    placeholder="my-notes"
                    value={form.repo}
                    onChange={set('repo')}
                  />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Branch</label>
                <input
                  className={s.input}
                  type="text"
                  placeholder="main"
                  value={form.branch}
                  onChange={set('branch')}
                />
              </div>

              {testResult && (
                <div className={`${s.statusMsg} ${s[testResult.type]}`}>
                  {testResult.message}
                </div>
              )}

              <div className={s.actions}>
                <button
                  className={s.btnSecondary}
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button className={s.btnPrimary} onClick={handleConnect}>
                  Connect
                </button>
              </div>
            </div>

            <p className={s.footer}>
              Needs <code>repo</code> scope (or <code>public_repo</code> for public repos)
            </p>
          </>
        )}

        {tab === 'url' && (
          <>
            <div className={s.urlHint}>
              Browse any <strong>public</strong> GitHub repo without a token.
              You can view and download files, but cannot make edits.
            </div>

            <div className={s.form}>
              <div className={s.field}>
                <label className={s.label}>GitHub repo URL</label>
                <input
                  className={s.input}
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBrowse()}
                  autoFocus
                />
              </div>

              {testResult && (
                <div className={`${s.statusMsg} ${s[testResult.type]}`}>
                  {testResult.message}
                </div>
              )}

              <div className={s.actions}>
                <button
                  className={s.btnPrimary}
                  onClick={handleBrowse}
                  disabled={testing || !repoUrl.trim()}
                >
                  {testing ? 'Loading…' : 'Browse repo'}
                </button>
              </div>
            </div>

            <p className={s.footer}>
              Public repos only · Read-only · 60 API requests/hour
            </p>
          </>
        )}
      </div>
    </div>
  )
}
