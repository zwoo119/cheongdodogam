import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMentor } from '../lib/useMentors'
import { FIELDS } from '../data/mentors'
import { Avatar } from '../components/MentorCard'
import { Loading, ErrorBox } from '../components/Status'

const GRADES = ['초등 1~2학년', '초등 3~4학년', '초등 5~6학년', '중학생', '고등학생']

export default function Apply() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { mentor: m, loading, error } = useMentor(id)

  const [f, setF] = useState({ nick: '', grade: '', field: '', time: '', mode: '', req: '', agree: false })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (loading) return <section className="sec"><Loading /></section>
  if (error) return <section className="sec"><ErrorBox>{error}</ErrorBox></section>
  if (!m || m.status !== 'approved') {
    return (
      <section className="sec"><div className="card">
        <p>신청할 수 없는 멘토입니다. 공개된 멘토에게만 신청할 수 있어요.</p>
        <Link className="btn" to="/find">멘토 찾기로 이동</Link>
      </div></section>
    )
  }
  // 내 프로필에는 신청할 수 없음
  if (m.owner_id === user.id) return <Navigate to="/register" replace />

  const modes = m.mode === '온·오프라인' ? ['온라인', '오프라인'] : [m.mode]
  const field = f.field || (FIELDS.includes(m.field) ? m.field : FIELDS[0])
  const mode = f.mode || modes[0]

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const nick = f.nick.trim(), time = f.time.trim(), req = f.req.trim()
    if (nick.length < 2 || nick.length > 12) return setErr('별칭은 2~12자로 입력해 주세요.')
    if (!f.grade) return setErr('학년을 선택해 주세요.')
    if (!time) return setErr('희망 요일·시간을 입력해 주세요.')
    if (!f.agree) return setErr('보호자 확인에 체크해 주세요.')

    setBusy(true)
    const { error } = await supabase.from('applications').insert({
      mentor_id: m.id, applicant_id: user.id, nick, grade: f.grade,
      field, time, mode, req: req || null, status: '신청 접수',
    })
    setBusy(false)
    if (error) {
      console.error('신청 에러:', error)
      if (error.code === '23505') return setErr('이 멘토에게 이미 진행 중인 신청이 있습니다. 신청 내역을 확인해 주세요.')
      if (error.code === '42501') return setErr('신청할 수 없는 멘토이거나 권한이 없습니다.')
      return setErr('신청하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    navigate('/history', { state: { msg: '멘토링 신청이 접수되었습니다. 관리자 확인 후 매칭 상태가 변경됩니다.' } })
  }

  return (
    <section className="sec">
      <Link to={`/mentor/${m.id}`} className="link">← 멘토 프로필</Link>
      <h2 style={{ marginTop: 8 }}>{m.name} 멘토에게 1:1 멘토링 신청</h2>

      <div className="card mc" style={{ maxWidth: 720, marginBottom: 16 }}>
        <div className="top">
          <Avatar name={m.name} />
          <div>
            <strong>{m.name}</strong> <span className="tag bg">{m.type}</span>
            <div className="muted">가능 시간: {m.time} · {m.mode}</div>
          </div>
        </div>
      </div>

      <div className="notice">
        실명·연락처·주소 등 개인정보는 입력하지 마세요. 별칭만 사용합니다.
        학생은 보호자 계정으로 신청합니다.
      </div>

      <form className="form card" onSubmit={submit} noValidate>
        <label>신청자(학생) 별칭 (2~12자)
          <input type="text" maxLength={12} value={f.nick} onChange={on('nick')} />
        </label>
        <label>학년
          <select value={f.grade} onChange={on('grade')}>
            <option value="">선택</option>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label>희망 교육 분야
          <select value={field} onChange={on('field')}>{FIELDS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label>희망 요일·시간 (멘토 가능: {m.time})
          <input type="text" maxLength={40} value={f.time} onChange={on('time')} placeholder="예: 화요일 18:00" />
        </label>
        <div>
          <strong>진행 방식</strong>
          <div className="opts">
            {modes.map((x) => (
              <label key={x}><input type="radio" name="mode" checked={mode === x} onChange={() => setF({ ...f, mode: x })} />{x}</label>
            ))}
          </div>
        </div>
        <label>멘토에게 전달할 요청 사항 (선택, 200자 이내)
          <textarea rows={4} maxLength={200} value={f.req} onChange={on('req')} />
        </label>
        <label className="opts" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />
          신청자는 보호자이거나, 보호자의 동의를 받았음을 확인합니다.
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? '신청 중...' : '멘토링 신청하기'}</button>
      </form>
    </section>
  )
}