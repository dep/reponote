import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from '../highlight.js'
import s from '../styles/EditorPane.module.css'

marked.setOptions({ breaks: true, gfm: true })

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : null
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value
  const cls = language ? ` class="language-${language} hljs"` : ' class="hljs"'
  return `<pre><code${cls}>${highlighted}</code></pre>`
}

// Convert [[note name]] into a special anchor before markdown parsing.
// We use a data-wikilink attribute so we can attach a click handler after render.
function preprocessWikilinks(text, notes) {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    // Find a note whose filename (without .md) matches (case-insensitive)
    const match = notes.find(n => {
      const parts = n.path.split('/')
      const filename = parts[parts.length - 1].replace(/\.md$/, '')
      return filename.toLowerCase() === name.trim().toLowerCase()
    })
    const path = match ? match.path : ''
    return `<a class="wikilink${match ? '' : ' wikilink-missing'}" data-wikilink="${path || name}" href="#">${name}</a>`
  })
}

// Convert #tag tokens (word chars only, not inside code spans or headings marked with ##)
// into clickable chip spans. We skip lines that start with # (headings).
function preprocessHashtags(text) {
  return text
    .split('\n')
    .map(line => {
      // Skip heading lines (## Heading) — don't convert # there
      if (/^#{1,6}\s/.test(line)) return line
      // Replace #word that is not inside backtick code spans
      // Split on backtick spans to avoid modifying code
      const parts = line.split(/(`[^`]*`)/g)
      return parts
        .map((part, i) => {
          // Odd-indexed parts are backtick code spans — leave unchanged
          if (i % 2 === 1) return part
          return part.replace(/(^|[\s\(,;:>])#([A-Za-z]\w*)/g, (_, before, tag) => {
            return `${before}<span class="hashtag" data-tag="${tag}">#${tag}</span>`
          })
        })
        .join('')
    })
    .join('\n')
}

export default function MarkdownViewer({ content, notes = [], onNavigate, onTagClick, basePath, config }) {
  const html = useMemo(() => {
    if (!content) return ''

    // Build a per-render renderer so the image rewriter has access to basePath/config
    const r = new marked.Renderer()
    r.code = renderer.code

    if (basePath && config?.owner && config?.repo && config?.branch) {
      // Directory of the current note, e.g. "People" for "People/Nick.md"
      const noteDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : ''
      r.image = ({ href, text }) => {
        let src = href
        // Rewrite relative paths to raw.githubusercontent.com
        if (src && !/^https?:\/\//i.test(src) && !src.startsWith('data:')) {
          const filePath = noteDir ? `${noteDir}/${src}` : src
          src = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${filePath}`
        }
        return `<img src="${src}" alt="${text ?? ''}">`
      }
    }

    const withLinks = preprocessWikilinks(content, notes)
    const withTags = preprocessHashtags(withLinks)
    // Parse as markdown, then sanitize — allow data-* attrs and hljs class names
    return DOMPurify.sanitize(marked.parse(withTags, { renderer: r }), {
      ADD_ATTR: ['data-wikilink', 'data-tag'],
    })
  }, [content, notes, basePath, config])

  function handleClick(e) {
    // Wikilink navigation
    const a = e.target.closest('a[data-wikilink]')
    if (a) {
      e.preventDefault()
      if (a.classList.contains('wikilink-missing')) return
      const path = a.getAttribute('data-wikilink')
      if (path && onNavigate) onNavigate(path)
      return
    }

    // Hashtag click
    const chip = e.target.closest('span[data-tag]')
    if (chip) {
      e.preventDefault()
      const tag = chip.getAttribute('data-tag')
      if (tag && onTagClick) onTagClick(tag)
    }
  }

  return (
    <div
      className={s.prose}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}
