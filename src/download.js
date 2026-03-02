import JSZip from 'jszip'
import { getNote } from './github.js'

// Trigger a browser file download
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download a single note as a .md file
export async function downloadFile(config, path, noteCache) {
  let content = noteCache[path]?.content
  if (content == null) {
    const result = await getNote(config, path)
    content = result.content
  }
  const filename = path.split('/').pop()
  const blob = new Blob([content], { type: 'text/markdown' })
  triggerDownload(blob, filename)
}

// Download a folder as a .zip file
// onProgress(fetched, total) is called as files are fetched
export async function downloadFolder(config, folderPath, notes, noteCache, onProgress) {
  const isRoot = folderPath === ''
  const prefix = isRoot ? '' : folderPath + '/'
  const folderNotes = isRoot ? notes : notes.filter(n => n.path.startsWith(prefix))

  if (folderNotes.length === 0) return

  const zip = new JSZip()
  let fetched = 0
  const total = folderNotes.length

  await Promise.all(
    folderNotes.map(async note => {
      let content = noteCache[note.path]?.content
      if (content == null) {
        const result = await getNote(config, note.path)
        content = result.content
      }
      // Store with path relative to the folder
      const relativePath = isRoot ? note.path : note.path.slice(prefix.length)
      zip.file(relativePath, content)
      fetched++
      onProgress?.(fetched, total)
    })
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  const zipName = isRoot ? (config.repo ?? 'notes') + '.zip' : folderPath.split('/').pop() + '.zip'
  triggerDownload(blob, zipName)
}
