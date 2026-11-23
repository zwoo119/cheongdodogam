import { Link, useParams } from 'react-router-dom'
import { useMentor } from '../lib/useMentors'
import { Avatar } from '../components/MentorCard'
import { Loading, ErrorBox } from '../components/Status'

export default function MentorDetail() {
  const { id } = useParams()
  const { mentor: m, loading, error } = useMentor(id)

  if (loading) return <section className="sec"><Loading /></section>
  if (error) return <section className="sec"><ErrorBox>{error}</ErrorBox><p><Link className="btn" to="/find">멘토 찾기로 이동</Link></p></section>
  if (!m) {
    return (
      <section className="sec"><div className="card">
        <p>멘토를 찾을 수 없거나 아직 공개되지 않았습니다.</p>
        <Link className="btn" to="/find">멘토 찾기로 이동</Link>
      </div></section>
    )
  }

  const rows = [
    ...(m.affiliation ? [['소속·학력', m.affiliation]] : []),
    ['가르칠 수 있는 내용', m.teach],
    ['대상 학년', m.target.join(', ')],
    ['진행 방식', m.mode],
    ['가능한 요일·시간', m.time],
    ['지원 언어', m.langs.join(', ')],
  ]
  return (
    <section className="sec">
      <Link to="/find" className="link">← 멘토 목록</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="mc"><div className="top">
          <Avatar name={m.name} />
          <div>
            <h2 style={{ margin: 0 }}>{m.name}</h2>
            <span className="tag bg">{m.type}</span><span className="tag">{m.field}</span>
          </div>
        </div></div>
        <p>{m.bio}</p>
        <div className="tw"><table><tbody>
          {rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
        </tbody></table></div>
        {m.career && (
          <div style={{ margin: '16px 0' }}>
            <h3 style={{ margin: '0 0 6px' }}>경력·자격·활동</h3>
            <ul style={{ margin: 0 }}>
              {m.career.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
            </ul>
            <p className="muted" style={{ fontSize: '.85rem', margin: '6px 0 0' }}>
              ※ 멘토가 직접 입력한 내용이며, 서비스가 사실 여부를 확인한 것은 아니에요.
            </p>
          </div>
        )}
        {m.is_demo && <p className="muted">※ 시연용 가상 멘토입니다.</p>}
        {m.status === 'approved'
          ? <Link className="btn" to={`/apply/${m.id}`}>멘토링 신청하기</Link>
          : <div className="notice">아직 공개되지 않은 프로필입니다. 관리자 승인 후 신청을 받을 수 있습니다.</div>}
      </div>
    </section>
  )
}