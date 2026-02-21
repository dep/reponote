import s from '../styles/NoteItem.module.css'

export default function NoteItem({ path, isSelected, onClick }) {
  const parts = path.split('/')
  const name = parts.pop().replace(/\.md$/, '')
  const folder = parts.join('/')

  return (
    <div
      className={`${s.item} ${isSelected ? s.selected : ''}`}
      onClick={onClick}
    >
      <span className={s.name}>{name}</span>
      {folder && <span className={s.path}>{folder}</span>}
    </div>
  )
}
