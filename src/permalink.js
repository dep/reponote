/**
 * Permalink helpers — encode/decode app state into the URL hash.
 *
 * Format:
 *   #owner/repo                        (repo only, default branch)
 *   #owner/repo@branch                 (repo + non-default branch)
 *   #owner/repo/path/to/note.md        (repo + file, default branch)
 *   #owner/repo@branch/path/to/note.md (repo + file + branch)
 *
 * The file path portion is percent-encoded so slashes inside it are
 * preserved as %2F — but we use a different separator strategy:
 * the branch (if present) is encoded as @branch immediately after
 * the repo name, before any slash that starts the file path.
 */

/**
 * Build a hash string from the current state.
 * @param {object} config  - { owner, repo, branch }
 * @param {string|null} filePath - e.g. "folder/note.md" or null
 * @returns {string} hash without leading #
 */
export function buildHash(config, filePath) {
  const { owner, repo, branch = 'main' } = config
  if (!owner || !repo) return ''

  const branchSuffix = branch && branch !== 'main' ? `@${branch}` : ''
  const base = `${owner}/${repo}${branchSuffix}`

  if (!filePath) return base

  // Encode each segment of the file path individually so internal slashes
  // stay as slashes (human-readable), but special chars are escaped.
  const encodedPath = filePath
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/')

  return `${base}/${encodedPath}`
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

  // Decode the file path segments
  const filePath = filePart
    ? filePart.split('/').map(seg => decodeURIComponent(seg)).join('/')
    : null

  return { owner, repo, branch, filePath }
}
