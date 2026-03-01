const KEYS = {
  PAT:       'reponote_pat',
  OWNER:     'reponote_owner',
  REPO:      'reponote_repo',
  BRANCH:    'reponote_branch',
  ALL_FILES: 'reponote_all_files',
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
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

export function loadShowAllFiles() {
  return localStorage.getItem(KEYS.ALL_FILES) === 'true'
}

export function saveShowAllFiles(value) {
  localStorage.setItem(KEYS.ALL_FILES, value ? 'true' : 'false')
}
