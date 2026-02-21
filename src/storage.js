const KEYS = {
  PAT:    'reponote_pat',
  OWNER:  'reponote_owner',
  REPO:   'reponote_repo',
  BRANCH: 'reponote_branch',
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
