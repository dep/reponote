import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import s from '../styles/EditorPane.module.css'

marked.setOptions({ breaks: true, gfm: true })

export default function MarkdownViewer({ content }) {
  const html = useMemo(() => {
    if (!content) return ''
    return DOMPurify.sanitize(marked.parse(content))
  }, [content])

  return (
    <div
      className={s.prose}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
