const BASE = 'https://api.github.com'

function headers(pat) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.message ?? `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

// Encode UTF-8 string to base64 safely (handles emoji, CJK, etc.)
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

// Decode base64 to UTF-8 string safely
function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))))
}

// List all .md files in the repo
export async function listNotes(config) {
  const { pat, owner, repo, branch } = config

  // Step 1: resolve branch → tree SHA
  const branchData = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/branches/${branch}`,
    { headers: headers(pat) }
  )
  const treeSha = branchData.commit.commit.tree.sha

  // Step 2: fetch recursive tree
  const treeData = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers: headers(pat) }
  )

  if (treeData.truncated) {
    console.warn('RepoNote: tree was truncated — repo may have too many files.')
  }

  return treeData.tree
    .filter(item => item.type === 'blob' && item.path.endsWith('.md'))
    .map(item => ({ path: item.path, sha: item.sha }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

// Get a single note's content and blob SHA
export async function getNote(config, path) {
  const { pat, owner, repo, branch } = config
  const data = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    { headers: headers(pat) }
  )
  return {
    content: decodeBase64(data.content),
    sha: data.sha,
  }
}

// Create or update a note (sha=null to create, sha=blobSha to update)
export async function saveNote(config, path, content, sha = null, message = null) {
  const { pat, owner, repo, branch } = config
  const body = {
    message: message ?? (sha ? `Update ${path}` : `Create ${path}`),
    content: encodeBase64(content),
    branch,
  }
  if (sha) body.sha = sha

  return ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: { ...headers(pat), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

// Delete a note (sha of the blob is required by GitHub)
export async function deleteNote(config, path, sha) {
  const { pat, owner, repo, branch } = config
  return ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'DELETE',
      headers: { ...headers(pat), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Delete ${path}`,
        sha,
        branch,
      }),
    }
  )
}
