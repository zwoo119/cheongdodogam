import { useSearchParams } from 'react-router-dom'
import { FIELDS, TYPES, LANGS, SUPPORT } from '../data/mentors'
import { useMentors } from '../lib/useMentors'
import MentorCard from '../components/MentorCard'
import { Loading, ErrorBox } from '../components/Status'

export default function Find() {
  const { mentors, loading, error } = useMentors()
  // 검색 조건은 주소(?q=코딩&field=...)에 저장됩니다
  const [params, setParams] = useSearchParams()
  const get = (k) => params.get(k) || ''
  const set = (k, v) => {
    const p = new URLSearchParams(params)
    v ? p.set(k, v) : p.delete(k)
    setParams(p, { replace: true })
  }

  const kw = get('q').trim().toLowerCase()
  const list = mentors.filter((m) =>
    (!kw || [m.name, m.field, m.bio, m.teach, m.tags, m.type].join(' ').toLowerCase().includes(kw)) &&
    (!get('field') || m.field === get('field')) &&
    (!get('type') || m.type === get('type')) &&
    (!get('mode') || m.mode === get('mode') || m.mode === '온·오프라인') &&
    (!get('lang') || m.langs.includes(get('lang')))
  )

  return (
    <section className="sec">
      <h2>멘토 찾기</h2>
      <div className="notice">시연용 가상 멘토가 포함되어 있습니다. 가상 멘토는 실제 인물이 아닙니다.</div>
      <div className="filters">
        <input type="text" value={get('q')} onChange={(e) => set('q', e.target.value)} placeholder="이름·키워드 검색 (예: 코딩, 한국어 읽기)" aria-label="검색" />
        <select value={get('field')} onChange={(e) => set('field', e.target.value)} aria-label="분야">
          <option value="">전체 분야</option>
          {FIELDS.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={get('type')} onChange={(e) => set('type', e.target.value)} aria-label="멘토 유형">
          <option value="">전체 유형</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={get('mode')} onChange={(e) => set('mode', e.target.value)} aria-label="활동 방식">
          <option value="">온·오프라인</option>
          <option>온라인</option>
          <option>오프라인</option>
        </select>
        <select value={get('lang')} onChange={(e) => set('lang', e.target.value)} aria-label="지원 언어">
          <option value="">지원 언어 전체</option>
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="chips" style={{ marginBottom: 16 }}>
        <span className="muted">필요한 도움:</span>
        {SUPPORT.map((s) => <button key={s} className="chip" onClick={() => set('q', s)}>{s}</button>)}
        <button className="chip" onClick={() => setParams({})}>필터 초기화</button>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox>{error}</ErrorBox>}
      {!loading && !error && (
        <>
          <p className="muted">멘토 {list.length}명</p>
          <div className="grid">
            {list.length
              ? list.map((m) => <MentorCard key={m.id} m={m} />)
              : <div className="card" style={{ gridColumn: '1/-1' }}>조건에 맞는 멘토가 없습니다. 검색어를 줄이거나 필터를 초기화해 보세요.</div>}
          </div>
        </>
      )}
    </section>
  )
}