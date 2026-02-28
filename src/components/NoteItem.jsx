import ContextMenu from './ContextMenu.jsx'
import s from '../styles/NoteItem.module.css'

export default function NoteItem({ path, isSelected, onClick, depth = 0, showFolder = false, menuItems }) {
  const parts = path.split('/')
  const name = parts.pop().replace(/\.md$/, '')
  const folder = parts.join('/')

  return (
    <div
      className={`${s.item} ${isSelected ? s.selected : ''}`}
      style={{ paddingLeft: 14 + depth * 12 }}
      onClick={onClick}
      title={path}
    >
      <div className={s.row}>
        <div className={s.nameBlock}>
          <span className={s.name}>{name}</span>
          {showFolder && folder && <span className={s.path}>{folder}</span>}
        </div>
        {menuItems && (
          <ContextMenu items={menuItems} className={s.contextMenu} />
        )}
      </div>
    </div>
  )
}
