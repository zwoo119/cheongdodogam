import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authMessage } from '../lib/authErrors'

const pwStyle = { font: 'inherit', padding: '11px 14px', border: '1.5px solid var(--ln)', borderRadius: 12 }

const TYPES = [
  { v: 'mentee', icon: '📖', title: '멘티로 가입', desc: '학생의 보호자, 또는 직접 배우고 싶은 성인. 멘토를 찾고 신청해요.' },
  { v: 'mentor', icon: '🌱', title: '멘토로 가입', desc: '재능을 나누고 싶은 대학생·직장인·전문 강사. 멘토로 등록해요.' },
]

export default function Signup() {
  const { user, signUp } = useAuth()
  const [f, setF] = useState({ type: '', name: '', email: '', pw: '', pw2: '', adult: false })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const on = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const name = f.name.trim()
    const email = f.email.trim()
    if (!f.type) return setErr('가입 유형(멘티 또는 멘토)을 선택해 주세요.')
    if (name.length < 2 || name.length > 12) return setErr('이름(별칭)은 2~12자로 입력해 주세요.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('이메일 형식을 확인해 주세요.')
    if (f.pw.length < 8) return setErr('비밀번호는 8자 이상이어야 합니다.')
    if (f.pw !== f.pw2) return setErr('비밀번호 확인이 일치하지 않습니다.')
    if (!f.adult) return setErr('만 19세 이상 확인과 약관 동의에 체크해 주세요.')
    
    setBusy(true)
    const { data, error } = await signUp(email, f.pw, name, f.type)
    setBusy(false)
    if (error) return setErr(authMessage(error))
    if (data.user && data.user.identities?.length === 0) return setErr('이미 가입된 이메일입니다.')
    // 이메일 확인 기능이 켜져 있으면 세션이 아직 없습니다
    if (!data.session) setInfo('가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.')
  }

  return (
    <section className="sec auth wide">
      <h2>회원가입</h2>
      <div className="notice">회원은 보호자·멘토 등 성인입니다. 학생은 보호자 계정으로 신청하며, 신청서에는 별칭만 입력합니다.</div>
      {info ? (
        <div className="ok">{info}</div>
      ) : (
        <form className="form card" onSubmit={submit} noValidate>
          <div>
            <strong>어떤 유형으로 가입하시나요?</strong>
            <div className="pick" role="radiogroup" aria-label="가입 유형">
              {TYPES.map((t) => (
                <label key={t.v}>
                  <input type="radio" name="type" value={t.v} checked={f.type === t.v} onChange={on('type')} />
                  <span className="pk-ic">{t.icon}</span>
                  <strong>{t.title}</strong>
                  <span className="muted">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <label>이름 또는 별칭 (2~12자)
            <input type="text" maxLength={12} value={f.name} onChange={on('name')} />
          </label>
          <label>이메일
            <input type="text" inputMode="email" autoComplete="email" value={f.email} onChange={on('email')} />
          </label>
          <label>비밀번호 (8자 이상)
            <input type="password" autoComplete="new-password" value={f.pw} onChange={on('pw')} style={pwStyle} />
          </label>
          <label>비밀번호 확인
            <input type="password" autoComplete="new-password" value={f.pw2} onChange={on('pw2')} style={pwStyle} />
          </label>
            <label className="opts" style={{ fontWeight: 500 }}>
            <input type="checkbox" checked={f.adult} onChange={on('adult')} />
            <span>만 19세 이상이며 <Link className="link" to="/terms" target="_blank">이용약관</Link>과 <Link className="link" to="/privacy" target="_blank">개인정보 처리방침</Link>에 동의합니다.</span>
          </label>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? '가입 중...' : '회원가입'}</button>
          <p className="muted" style={{ margin: 0 }}>이미 계정이 있나요? <Link to="/login" className="link">로그인</Link></p>
        </form>
      )}
    </section>
  )
}