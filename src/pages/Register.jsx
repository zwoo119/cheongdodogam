import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FIELDS, TYPES, LANGS } from '../data/mentors'
import { Loading, ErrorBox } from '../components/Status'

const GRADES = ['초등 1~2학년', '초등 3~4학년', '초등 5~6학년', '중학생', '고등학생']
const MODES = ['온라인', '오프라인', '온·오프라인']
const STATUS = { pending: ['승인 대기', 'w'], approved: ['공개 중', ''], rejected: ['반려', 'x'] }
const MAX_ACTIVE = 3 // 대기·공개 프로필은 계정당 최대 3개

const EMPTY = {
  name: '', type: '대학생', field: FIELDS[0], bio: '', teach: '',
  target: [], mode: '온라인', time: '', langs: ['한국어'], agree: false,
}

export default function Register() {
  const { user } = useAuth()
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [tick, setTick] = useState(0) // 값이 바뀌면 내 등록 현황을 다시 불러옴

  // 내가 등록한 멘토 프로필 목록 (RLS 덕분에 내 것만 조회됨)
  useEffect(() => {
    let alive = true
    supabase
      .from('mentors')
      .select('id, name, field, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setListErr('등록 현황을 불러오지 못했습니다.')
        else { setMine(data); setListErr('') }
        setLoading(false)
      })
    return () => { alive = false }
  }, [user.id, tick])

  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (k, v) =>
    setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setOk('')
    const name = f.name.trim(), bio = f.bio.trim(), teach = f.teach.trim(), time = f.time.trim()
    if (name.length < 2 || name.length > 12) return setErr('이름(별칭)은 2~12자로 입력해 주세요.')
    if (bio.length < 10 || bio.length > 200) return setErr('자기소개는 10~200자로 입력해 주세요.')
    if (!teach) return setErr('가르칠 수 있는 내용을 입력해 주세요.')
    if (!f.target.length) return setErr('멘토링 대상을 하나 이상 선택해 주세요.')
    if (!time) return setErr('가능한 요일·시간을 입력해 주세요.')
    if (!f.langs.length) return setErr('지원 가능한 언어를 하나 이상 선택해 주세요.')
    if (!f.agree) return setErr('안내 사항 확인에 체크해 주세요.')
    if (mine.filter((m) => m.status !== 'rejected').length >= MAX_ACTIVE)
      return setErr(`승인 대기·공개 중인 프로필은 최대 ${MAX_ACTIVE}개까지 등록할 수 있습니다.`)

    setBusy(true)
    const { error } = await supabase.from('mentors').insert({
      owner_id: user.id, name, type: f.type, field: f.field, bio, teach,
      target: f.target, mode: f.mode, time, langs: f.langs,
      tags: `${f.field} ${teach}`, status: 'pending',
    })
    setBusy(false)
    if (error) {
      console.error('멘토 등록 에러:', error)
      return setErr(error.code === '42501'
        ? '등록 권한이 없습니다. 로그인 상태를 확인해 주세요.'
        : '등록하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    setF(EMPTY)
    setOk('멘토 등록이 접수되었습니다. 관리자 승인 후 멘토 목록에 공개됩니다.')
    setTick((t) => t + 1)
  }

  const cancel = async (m) => {
    if (!window.confirm(`‘${m.name}’ 등록을 취소할까요?`)) return
    const { data, error } = await supabase.from('mentors').delete().eq('id', m.id).select()
    if (error || !data?.length) return setListErr('취소하지 못했습니다. (공개 중인 프로필은 관리자에게 요청해 주세요.)')
    setTick((t) => t + 1)
  }

  return (
    <section className="sec">
      <h2>멘토 등록</h2>
      <div className="notice">
        등록하면 ‘승인 대기’ 상태로 저장되며 관리자 승인 후 목록에 공개됩니다.
        실제 아동 대상 멘토링 운영에는 별도의 신원 확인과 자격 검증이 필요합니다.
        연락처·주소 등 개인정보는 입력하지 마세요.
      </div>

      <form className="form card" onSubmit={submit} noValidate>
        <label>멘토 이름 또는 별칭 (2~12자)
          <input type="text" maxLength={12} value={f.name} onChange={on('name')} />
        </label>
        <label>멘토 유형
          <select value={f.type} onChange={on('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label>전문 분야
          <select value={f.field} onChange={on('field')}>{FIELDS.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label>자기소개 (10~200자)
          <textarea rows={3} maxLength={200} value={f.bio} onChange={on('bio')} />
        </label>
        <label>가르칠 수 있는 내용
          <input type="text" maxLength={80} value={f.teach} onChange={on('teach')} placeholder="예: 파이썬 기초, 웹페이지 만들기" />
        </label>
        <div>
          <strong>멘토링 대상</strong>
          <div className="opts">
            {GRADES.map((g) => (
              <label key={g}><input type="checkbox" checked={f.target.includes(g)} onChange={() => toggle('target', g)} />{g}</label>
            ))}
          </div>
        </div>
        <label>활동 방식
          <select value={f.mode} onChange={on('mode')}>{MODES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label>가능한 요일·시간
          <input type="text" maxLength={40} value={f.time} onChange={on('time')} placeholder="예: 화·목 18:00~20:00" />
        </label>
        <div>
          <strong>지원 가능한 언어</strong>
          <div className="opts">
            {LANGS.map((g) => (
              <label key={g}><input type="checkbox" checked={f.langs.includes(g)} onChange={() => toggle('langs', g)} />{g}</label>
            ))}
          </div>
        </div>
        <label className="opts" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />
          관리자 승인과 별도의 신원 확인·자격 검증 후에 활동할 수 있음을 확인했습니다.
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        {ok && <div className="ok" role="status">{ok}</div>}
        <button className="btn" disabled={busy}>{busy ? '등록 중...' : '승인 대기로 등록'}</button>
      </form>

      <h2 style={{ marginTop: 40 }}>내 등록 현황</h2>
      {loading && <Loading />}
      {listErr && <ErrorBox>{listErr}</ErrorBox>}
      {!loading && !listErr && (
        mine.length === 0 ? (
          <div className="card muted">아직 등록한 멘토 프로필이 없습니다.</div>
        ) : (
          <div className="card tw">
            <table>
              <thead><tr><th>이름</th><th>분야</th><th>상태</th><th>처리</th></tr></thead>
              <tbody>
                {mine.map((m) => {
                  const [label, cls] = STATUS[m.status] || [m.status, '']
                  return (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.field}</td>
                      <td><span className={`st ${cls}`}>{label}</span></td>
                      <td>
                        {m.status === 'approved'
                          ? <Link className="link" to={`/mentor/${m.id}`}>프로필 보기</Link>
                          : <button className="link" onClick={() => cancel(m)}>등록 취소</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  )
}