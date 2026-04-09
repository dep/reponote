const KEYS = {
  PAT:         'reponote_pat',
  OWNER:       'reponote_owner',
  REPO:        'reponote_repo',
  BRANCH:      'reponote_branch',
  ALL_FILES:   'reponote_all_files',
  CONNECTIONS: 'reponote_connections',
  SORT_ORDER:  'reponote_sort_order',
  VIEW_MODE:   'reponote_view_mode',
}

export function loadConfig() {
  return {
    pat:    localStorage.getItem(KEYS.PAT)    ?? '',
    owner:  localStorage.getItem(KEYS.OWNER)  ?? '',
    repo:   localStorage.getItem(KEYS.REPO)   ?? '',
    branch: localStorage.getItem(KEYS.BRANCH) ?? 'main',
  }
}

export function saveConfig({ pat, owner, repo, branch }) {
  localStorage.setItem(KEYS.PAT,    pat)
  localStorage.setItem(KEYS.OWNER,  owner)
  localStorage.setItem(KEYS.REPO,   repo)
  localStorage.setItem(KEYS.BRANCH, branch)
}

export function clearConfig() {
  ;[KEYS.PAT, KEYS.OWNER, KEYS.REPO, KEYS.BRANCH].forEach(k => localStorage.removeItem(k))
}

// Saved connections — array of { id, label, pat, owner, repo, branch }
export function loadConnections() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CONNECTIONS) ?? '[]')
  } catch {
    return []
  }
}

export function saveConnection(conn) {
  const connections = loadConnections().filter(c => c.id !== conn.id)
  connections.unshift(conn)
  localStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(connections))
}

export function deleteConnection(id) {
  const connections = loadConnections().filter(c => c.id !== id)
  localStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(connections))
}

export function loadShowAllFiles() {
  return localStorage.getItem(KEYS.ALL_FILES) === 'true'
}

export function saveShowAllFiles(value) {
  localStorage.setItem(KEYS.ALL_FILES, value ? 'true' : 'false')
}

// Sort order: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'
export function loadSortOrder() {
  return localStorage.getItem(KEYS.SORT_ORDER) ?? 'date-desc'
}

export function saveSortOrder(value) {
  localStorage.setItem(KEYS.SORT_ORDER, value)
}

// Sidebar view mode: 'tree' | 'files'
export function loadViewMode() {
  return localStorage.getItem(KEYS.VIEW_MODE) ?? 'tree'
}

export function saveViewMode(value) {
  localStorage.setItem(KEYS.VIEW_MODE, value)
}
