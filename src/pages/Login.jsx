import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authMessage } from '../lib/authErrors'

export default function Login() {
  const { user, signIn } = useAuth()
  const from = useLocation().state?.from || '/'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!email.trim() || !pw) return setErr('이메일과 비밀번호를 입력해 주세요.')
    setBusy(true)
    const { error } = await signIn(email.trim(), pw)
    setBusy(false)
    if (error) setErr(authMessage(error))
  }

  return (
    <section className="sec auth">
      <h2>로그인</h2>
      <form className="form card" onSubmit={submit} noValidate>
        <label>이메일
          <input type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>비밀번호
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ font: 'inherit', padding: '11px 14px', border: '1.5px solid var(--ln)', borderRadius: 12 }} />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? '확인 중...' : '로그인'}</button>
                <p className="muted" style={{ margin: 0 }}><Link to="/forgot-password" className="link">비밀번호를 잊으셨나요?</Link></p>
        <p className="muted" style={{ margin: 0 }}>아직 계정이 없나요? <Link to="/signup" className="link">회원가입</Link></p>
      </form>
    </section>
  )
}