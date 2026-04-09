/**
 * Permalink helpers — encode/decode app state into the URL hash + query params.
 *
 * Hash format:
 *   #owner/repo                        (repo only, default branch)
 *   #owner/repo@branch                 (repo + non-default branch)
 *   #owner/repo/path/to/note.md        (repo + file, default branch)
 *   #owner/repo@branch/path/to/note.md (repo + file + branch)
 *
 * Query params (appended to the URL before the hash):
 *   ?sort=date-desc   sort order (date-desc | date-asc | name-asc | name-desc)
 *   &view=tree        sidebar view mode (tree | files)
 *   &sidebar=1        sidebar open (omitted when closed)
 */

const VALID_SORTS = new Set(['date-desc', 'date-asc', 'name-asc', 'name-desc'])
const VALID_VIEWS = new Set(['tree', 'files'])

/**
 * Build a query string from UI state.
 * Only includes params that differ from their defaults so URLs stay clean.
 */
export function buildParams({ sortOrder, viewMode, sidebarOpen }) {
  const p = new URLSearchParams()
  if (sortOrder && sortOrder !== 'date-desc') p.set('sort', sortOrder)
  if (viewMode  && viewMode  !== 'tree')       p.set('view', viewMode)
  if (sidebarOpen)                              p.set('sidebar', '1')
  return p.toString() // '' when all defaults
}

/**
 * Parse query params back into UI state.
 * Returns defaults for any missing/invalid values.
 */
export function parseParams(search) {
  const p = new URLSearchParams(search)
  const sort    = p.get('sort')
  const view    = p.get('view')
  const sidebar = p.get('sidebar')
  return {
    sortOrder:   VALID_SORTS.has(sort) ? sort : 'date-desc',
    viewMode:    VALID_VIEWS.has(view) ? view : 'tree',
    sidebarOpen: sidebar === '1',
  }
}

/**
 * Build a hash string from the current state.
 * @param {object} config  - { owner, repo, branch }
 * @param {string|null} filePath - e.g. "folder/note.md" or null
 * @param {string|null} folderPath - e.g. "folder/sub/" (trailing slash) or null
 * @returns {string} hash without leading #
 */
export function buildHash(config, filePath, folderPath) {
  const { owner, repo, branch = 'main' } = config
  if (!owner || !repo) return ''

  const branchSuffix = branch && branch !== 'main' ? `@${branch}` : ''
  const base = `${owner}/${repo}${branchSuffix}`

  const path = filePath ?? folderPath
  if (!path || path === '/') return base

  // Encode each segment of the file path individually so internal slashes
  // stay as slashes (human-readable), but special chars are escaped.
  const segments = path.replace(/\/$/, '').split('/').filter(Boolean)
  const encodedPath = segments.map(seg => encodeURIComponent(seg)).join('/')

  // Re-append trailing slash for folder paths
  return `${base}/${encodedPath}${path.endsWith('/') ? '/' : ''}`
}

/**
 * Parse a hash string back into { owner, repo, branch, filePath }.
 * Returns null if the hash is empty or malformed.
 * @param {string} hash - with or without leading #
 */
export function parseHash(hash) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null

  // Split on the first slash to separate "owner/repo[@branch]" from file path
  const slashIdx = raw.indexOf('/')
  if (slashIdx === -1) return null // need at least owner/repo

  const owner = raw.slice(0, slashIdx)
  const rest = raw.slice(slashIdx + 1) // "repo[@branch]" or "repo[@branch]/path/to/file"

  if (!owner) return null

  // Second slash separates repo (+ optional branch) from file path
  const slashIdx2 = rest.indexOf('/')
  const repoPart = slashIdx2 === -1 ? rest : rest.slice(0, slashIdx2)
  const filePart = slashIdx2 === -1 ? null : rest.slice(slashIdx2 + 1)

  // Parse optional @branch from repoPart
  const atIdx = repoPart.indexOf('@')
  const repo = atIdx === -1 ? repoPart : repoPart.slice(0, atIdx)
  const branch = atIdx === -1 ? 'main' : repoPart.slice(atIdx + 1)

  if (!repo) return null

  if (!filePart) return { owner, repo, branch, filePath: null, folderPath: null }

  // Decode the path segments
  const isFolderPath = filePart.endsWith('/')
  const decoded = filePart.replace(/\/$/, '').split('/').map(seg => decodeURIComponent(seg)).join('/')

  return {
    owner,
    repo,
    branch,
    filePath:   isFolderPath ? null : decoded,
    folderPath: isFolderPath ? decoded + '/' : null,
  }
}
