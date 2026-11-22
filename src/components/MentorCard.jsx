import { Link } from 'react-router-dom'

const COLORS = ['#2f7d4f', '#b7791f', '#3b7a9e', '#a0522d', '#6a5acd', '#c0587a']

export function Avatar({ name }) {
  const color = COLORS[name.charCodeAt(0) % COLORS.length]
  return <span className="av" style={{ background: color }} aria-hidden="true">{name.charAt(0)}</span>
}

export default function MentorCard({ m }) {
  return (
    <article className="card mc">
      <div className="top">
        <Avatar name={m.name} />
        <div>
          <h3 style={{ margin: 0 }}>{m.name}</h3>
          <span className="tag bg">{m.type}</span>
        </div>
      </div>
      <div>
        <span className="tag">{m.field}</span>
        <span className="tag bg">{m.mode}</span>
      </div>
      <p>{m.bio}</p>
      <Link className="btn ghost sm" to={`/mentor/${m.id}`}>상세 보기</Link>
    </article>
  )
}