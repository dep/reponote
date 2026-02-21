import { useState } from 'react'
import { saveConfig } from '../storage.js'
import { listNotes } from '../github.js'
import s from '../styles/ConfigScreen.module.css'

export default function ConfigScreen({ onConnect }) {
  const [form, setForm] = useState({ pat: '', owner: '', repo: '', branch: 'main' })
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

  return (
    <div className={s.overlay}>
      <div className={s.card}>
        <div className={s.logo}>
          <span className={s.logoIcon}>📝</span>
          <span className={s.logoText}>RepoNote</span>
        </div>

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
      </div>
    </div>
  )
}
