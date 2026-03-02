import { useState, useEffect, useRef } from 'react'
import s from '../styles/ContextMenu.module.css'

export default function ContextMenu({ items, className }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`${s.wrapper} ${className ?? ''}`} ref={menuRef}>
      <button
        className={s.trigger}
        aria-label="More options"
        onClick={e => {
          e.stopPropagation()
          setOpen(o => !o)
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="2" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="7" cy="12" r="1.2" />
        </svg>
      </button>

      {open && (
        <div className={s.dropdown}>
          {items.map((item, i) => (
            <button
              key={i}
              className={`${s.item} ${item.disabled ? s.itemDisabled : ''} ${item.danger ? s.itemDanger : ''}`}
              disabled={item.disabled}
              onClick={e => {
                e.stopPropagation()
                setOpen(false)
                item.action()
              }}
            >
              {item.icon && <span className={s.itemIcon}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
