import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Loading, ErrorBox } from '../components/Status'

const PHONE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/
const fmtDT = (t) => new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
const fmtT = (t) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso), p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const isHttps = (u) => typeof u === 'string' && u.startsWith('https://')

/* ---------- 수업 정보 카드 ---------- */
function LessonCard({ appId, role, writable, lesson, onSaved, defaultMode }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const canEdit = role === 'mentor' && writable
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const open = () => {
    setErr('')
    setF({
      mode: lesson?.mode || defaultMode || '온라인',
      at: toLocalInput(lesson?.starts_at),
      link: lesson?.link || '', place: lesson?.place || '', note: lesson?.note || '',
    })
    setEdit(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    if (!f.at) return setErr('수업 날짜와 시간을 입력해 주세요.')
    if (f.mode === '온라인' && f.link.trim() && !/^https:\/\//i.test(f.link.trim())) return setErr('수업 링크는 https:// 로 시작해야 합니다.')
    if (f.mode === '오프라인' && !f.place.trim()) return setErr('만날 장소를 입력해 주세요.')
    setBusy(true)
    const { data, error } = await supabase.from('lessons').upsert({
      application_id: appId,
      mode: f.mode,
      starts_at: new Date(f.at).toISOString(),
      link: f.mode === '온라인' ? f.link.trim() || null : null,
      place: f.mode === '오프라인' ? f.place.trim() || null : null,
      note: f.note.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'application_id' }).select().single()
    setBusy(false)
    if (error) {
      console.error(error)
      return setErr(error.code === '23514' ? '링크는 Google Meet, Zoom, Microsoft Teams 주소만 사용할 수 있어요.' : '저장하지 못했습니다.')
    }
    onSaved(data)
    setEdit(false)
  }

  return (
    <div className="card lesson">
      <div className="app-top"><h3 style={{ margin: 0 }}>📅 수업 정보</h3>
        {canEdit && !edit && <button className="btn ghost sm" onClick={open}>{lesson ? '수정' : '입력'}</button>}
      </div>

      {edit ? (
        <form className="form" onSubmit={save} noValidate style={{ marginTop: 12 }}>
          <label>진행 방식
            <select value={f.mode} onChange={on('mode')}><option>온라인</option><option>오프라인</option></select>
          </label>
          <label>수업 날짜·시간
            <input type="datetime-local" value={f.at} onChange={on('at')}
              style={{ font: 'inherit', padding: '11px 14px', border: '1.5px solid var(--ln)', borderRadius: 12 }} />
          </label>
          {f.mode === '온라인' ? (
            <label>수업 링크 (Google Meet · Zoom · Teams)
              <input type="text" maxLength={300} value={f.link} onChange={on('link')} placeholder="https://meet.google.com/..." />
            </label>
          ) : (
            <label>만날 장소 (도서관·주민센터 등 공공장소)
              <input type="text" maxLength={100} value={f.place} onChange={on('place')} placeholder="예: 청도 공공도서관 1층 열람실" />
            </label>
          )}
          <label>안내 사항 (선택)
            <input type="text" maxLength={200} value={f.note} onChange={on('note')} />
          </label>
          {err && <div className="err" role="alert">{err}</div>}
          <div>
            <button className="btn sm" disabled={busy}>{busy ? '저장 중...' : '저장'}</button>{' '}
            <button type="button" className="btn ghost sm" onClick={() => setEdit(false)}>닫기</button>
          </div>
        </form>
      ) : !lesson ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          {role === 'mentor' ? '아직 수업 일정이 없어요. 대화로 시간을 맞춘 뒤 ‘입력’을 눌러 주세요.' : '멘토가 수업 일정을 정하면 여기에 표시돼요.'}
        </p>
      ) : (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '4px 0' }}><strong>{lesson.starts_at ? fmtDT(lesson.starts_at) : '시간 미정'}</strong> · {lesson.mode}</p>
          {lesson.mode === '온라인' && (
            isHttps(lesson.link)
              ? <p style={{ margin: '4px 0' }}><a className="btn sm" href={lesson.link} target="_blank" rel="noopener noreferrer">온라인 수업 입장 ↗</a></p>
              : <p className="muted" style={{ margin: '4px 0' }}>수업 링크가 아직 없어요.</p>
          )}
          {lesson.mode === '오프라인' && (
            <>
              <p style={{ margin: '4px 0' }}>📍 {lesson.place || '장소 미정'}</p>
              <div className="notice" style={{ margin: '8px 0 0' }}>공공장소에서 만나고, 학생은 보호자와 함께 이동해 주세요.</div>
            </>
          )}
          {lesson.note && <p className="muted" style={{ margin: '8px 0 0' }}>{lesson.note}</p>}
        </div>
      )}
    </div>
  )
}

/* ---------- 소통방 ---------- */
export default function Room() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ctx, setCtx] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [tick, setTick] = useState(0)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const [notice, setNotice] = useState('')
  const endRef = useRef(null)
  const role = ctx?.role

  // 소통방 정보·메시지·수업 정보 불러오기
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: app, error } = await supabase
        .from('applications')
        .select('id, applicant_id, nick, grade, status, mode, mentors(name, owner_id)')
        .eq('id', id).maybeSingle()
      if (!alive) return
      if (error) { console.error(error); setLoadErr('소통방을 불러오지 못했습니다.'); setLoading(false); return }
      const r = !app ? null : app.applicant_id === user.id ? 'applicant' : app.mentors?.owner_id === user.id ? 'mentor' : null
      if (!app || !r || !['매칭 완료', '완료'].includes(app.status)) { setCtx(null); setLoading(false); return }
      const [m, l] = await Promise.all([
        supabase.from('messages').select('id, sender_id, body, created_at').eq('application_id', id).order('created_at', { ascending: true }).limit(500),
        supabase.from('lessons').select('*').eq('application_id', id).maybeSingle(),
      ])
      if (!alive) return
      if (m.error) { console.error(m.error); setLoadErr('메시지를 불러오지 못했습니다.') }
      setCtx({ role: r, status: app.status, nick: app.nick, grade: app.grade, mode: app.mode, mentorName: app.mentors?.name || '멘토' })
      setMsgs(m.data || [])
      setLesson(l.data || null)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [id, user.id, tick])

  // 실시간: 새 메시지·수업 정보가 바로 반영됨
  useEffect(() => {
    if (!role) return
    const ch = supabase.channel(`room-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${id}` },
        (p) => setMsgs((cur) => (cur.some((x) => x.id === p.new.id) ? cur : [...cur, p.new])))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons', filter: `application_id=eq.${id}` },
        (p) => { if (p.new && p.new.application_id) setLesson(p.new) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, role])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  const send = async (e) => {
    e.preventDefault()
    setSendErr(''); setNotice('')
    const body = text.trim()
    if (!body) return
    if (PHONE.test(body)) return setSendErr('전화번호는 보낼 수 없어요. 연락처는 주고받지 마세요.')
    setSending(true)
    const { data, error } = await supabase.from('messages')
      .insert({ application_id: id, sender_id: user.id, body })
      .select('id, sender_id, body, created_at').single()
    setSending(false)
    if (error) {
      console.error(error)
      return setSendErr(error.code === '23514' ? '보낼 수 없는 내용이에요. 전화번호가 포함되어 있지 않은지 확인해 주세요.' : '보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    setText('')
    setMsgs((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data]))
  }

  const report = async (m) => {
    const reason = window.prompt(m ? '이 메시지를 신고하는 이유를 적어 주세요. (2~200자)' : '이 대화를 신고하는 이유를 적어 주세요. (2~200자)')
    if (reason === null) return
    const r = reason.trim()
    setSendErr(''); setNotice('')
    if (r.length < 2 || r.length > 200) return setSendErr('신고 사유는 2~200자로 입력해 주세요.')
    const { error } = await supabase.from('reports').insert({ application_id: id, message_id: m?.id ?? null, reporter_id: user.id, reason: r })
    if (error) { console.error(error); return setSendErr('신고하지 못했습니다.') }
    setNotice('신고가 접수되었습니다. 관리자가 신고된 대화를 확인합니다.')
  }

  if (loading) return <section className="sec"><Loading /></section>
  if (!ctx) {
    return (
      <section className="sec"><div className="card">
        <h2>들어갈 수 없는 소통방이에요</h2>
        <p className="muted">매칭이 완료된 신청의 멘토와 신청자만 이용할 수 있어요.</p>
        <Link className="btn" to="/rooms">내 소통방으로</Link>
      </div></section>
    )
  }

  const writable = ctx.status === '매칭 완료'
  const other = role === 'applicant' ? `${ctx.mentorName} 멘토` : `${ctx.nick} 보호자`

  return (
    <section className="sec room">
      <Link to="/rooms" className="link">← 내 소통방</Link>
      <h2 style={{ marginTop: 8 }}>{other}와의 소통방</h2>
      <div className="notice">
        연락처·주소·SNS 아이디는 주고받지 마세요. 불편한 메시지는 <strong>신고</strong>할 수 있어요.
        오프라인 수업은 도서관·주민센터 같은 공공장소에서, 학생은 보호자와 함께 진행해 주세요.
      </div>

      <LessonCard appId={id} role={role} writable={writable} lesson={lesson} onSaved={setLesson} defaultMode={ctx.mode} />

      <div className="app-top" style={{ margin: '20px 0 8px' }}>
        <h3 style={{ margin: 0 }}>💬 대화</h3>
        <span>
          <button className="link" onClick={() => setTick((t) => t + 1)}>↻ 새로고침</button>{' '}
          <button className="link" onClick={() => report(null)}>대화 신고</button>
        </span>
      </div>
      {loadErr && <ErrorBox>{loadErr}</ErrorBox>}
      <div className="chat" role="log" aria-live="polite">
        {msgs.length === 0 && <p className="muted" style={{ margin: 'auto' }}>첫 인사를 남겨 보세요 👋</p>}
        {msgs.map((m) => {
          const me = m.sender_id === user.id
          return (
            <div key={m.id} className={`msg ${me ? 'me' : ''}`}>
              <small>{me ? '나' : other} · {fmtT(m.created_at)}</small>
              <div className="bubble">{m.body}</div>
              {!me && <button className="link rp" onClick={() => report(m)}>신고</button>}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {notice && <div className="ok" role="status" style={{ marginTop: 12 }}>{notice}</div>}
      {sendErr && <div className="err" role="alert" style={{ marginTop: 8 }}>{sendErr}</div>}
      {writable ? (
        <form className="composer" onSubmit={send}>
          <input type="text" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요" aria-label="메시지" />
          <button className="btn" disabled={sending}>{sending ? '...' : '보내기'}</button>
        </form>
      ) : (
        <div className="notice">수업이 완료되어 대화가 종료되었어요. 지난 대화는 읽기만 할 수 있어요.</div>
      )}
    </section>
  )
}