import s from '../styles/NoteItem.module.css'

export default function NoteItem({ path, isSelected, onClick, depth = 0, showFolder = false }) {
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
      <span className={s.name}>{name}</span>
      {showFolder && folder && <span className={s.path}>{folder}</span>}
    </div>
  )
}
