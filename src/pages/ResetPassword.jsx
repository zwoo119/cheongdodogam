import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const pwStyle = { font: 'inherit', padding: '11px 14px', border: '1.5px solid var(--ln)', borderRadius: 12 }

export default function ResetPassword() {
  const [ready, setReady] = useState(null) // null: 확인 중, true: 재설정 가능, false: 링크 오류
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    // 메일 링크로 들어오면 Supabase가 주소의 정보로 임시 로그인 상태를 만들어요.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) alive && setReady(true)
    })
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (alive) setReady(!!data.session)
    }, 1200)
    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe() }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (pw.length < 8) return setErr('비밀번호는 8자 이상이어야 합니다.')
    if (pw !== pw2) return setErr('비밀번호 확인이 일치하지 않습니다.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      console.error(error)
      return setErr(error.message?.toLowerCase().includes('same') ? '이전과 다른 비밀번호를 입력해 주세요.' : '비밀번호를 바꾸지 못했습니다. 링크가 만료되었을 수 있어요.')
    }
    setDone(true)
  }

  return (
    <section className="sec auth">
      <h2>새 비밀번호 설정</h2>
      {ready === null && <p className="muted">확인하는 중...</p>}
      {ready === false && (
        <div className="card">
          <div className="err">링크가 올바르지 않거나 만료되었어요.</div>
          <Link className="btn" to="/forgot-password">다시 요청하기</Link>
        </div>
      )}
      {ready && done && (
        <div className="card">
          <div className="ok">비밀번호를 바꿨어요. 이제 새 비밀번호로 이용할 수 있어요.</div>
          <Link className="btn" to="/">홈으로</Link>
        </div>
      )}
      {ready && !done && (
        <form className="form card" onSubmit={submit} noValidate>
          <label>새 비밀번호 (8자 이상)
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} style={pwStyle} />
          </label>
          <label>새 비밀번호 확인
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={pwStyle} />
          </label>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? '변경 중...' : '비밀번호 변경'}</button>
        </form>
      )}
    </section>
  )
}