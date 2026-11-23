import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const v = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(v)) return setErr('이메일 형식을 확인해 주세요.')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(v, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (error) {
      console.error(error)
      if (error.status === 429) return setErr('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')
      return setErr('메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    setSent(true) // 가입 여부와 상관없이 같은 안내를 보여 계정 존재를 노출하지 않음
  }

  return (
    <section className="sec auth">
      <h2>비밀번호 찾기</h2>
      {sent ? (
        <div className="card">
          <div className="ok">입력한 이메일로 가입된 계정이 있다면 재설정 메일을 보냈어요.</div>
          <p className="muted">메일이 안 보이면 스팸함을 확인해 주세요. 링크는 일정 시간이 지나면 사라져요.</p>
          <Link className="btn" to="/login">로그인으로</Link>
        </div>
      ) : (
        <form className="form card" onSubmit={submit} noValidate>
          <p className="muted" style={{ margin: 0 }}>가입할 때 쓴 이메일을 입력하면 비밀번호를 새로 정하는 링크를 보내 드려요.</p>
          <label>이메일
            <input type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? '보내는 중...' : '재설정 메일 보내기'}</button>
          <p className="muted" style={{ margin: 0 }}><Link to="/login" className="link">← 로그인으로 돌아가기</Link></p>
        </form>
      )}
    </section>
  )
}