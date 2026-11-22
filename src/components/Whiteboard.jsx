import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const W = 1000, H = 600
const COLORS = [['#111111', '검정'], ['#d64545', '빨강'], ['#2f6fd6', '파랑'], ['#2f7d4f', '초록']]
const SIZES = [['가늘게', 3], ['보통', 6], ['굵게', 12]]

// 같이 쓰는 칠판. 그린 선을 Supabase Realtime으로 상대 화면에 바로 보냅니다.
// 서버에 저장되지 않으며, 두 사람이 모두 칠판을 열어 둬야 서로 보여요.
export default function Whiteboard({ appId }) {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0][0])
  const [size, setSize] = useState(6)
  const [msg, setMsg] = useState('')
  const canvasRef = useRef(null)
  const live = useRef({ strokes: [], cur: null, channel: null, id: '', n: 0, timer: null })
  const tools = useRef({})
  tools.current = { tool, color, size }

  const drawSeg = (a, b, s) => {
    const g = canvasRef.current?.getContext('2d')
    if (!g) return
    g.strokeStyle = s.color; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round'
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke()
  }

  const redraw = () => {
    const g = canvasRef.current?.getContext('2d')
    if (!g) return
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
    for (const s of live.current.strokes) {
      if (s.pts.length === 1) drawSeg(s.pts[0], [s.pts[0][0] + 0.01, s.pts[0][1]], s)
      for (let i = 1; i < s.pts.length; i++) drawSeg(s.pts[i - 1], s.pts[i], s)
    }
  }

  const send = (payload) => live.current.channel?.send({ type: 'broadcast', event: 'board', payload })

  // 아직 못 보낸 점들을 모아서 보냄 (너무 자주 보내지 않도록 60ms마다)
  const flush = () => {
    const L = live.current
    L.timer = null
    const s = L.cur
    if (!s || !s.unsent.length) return
    send({ type: 'pts', sid: s.sid, color: s.color, w: s.w, pts: s.unsent })
    s.unsent = []
  }

  // 나중에 들어온 사람에게 지금까지의 그림을 보내 줌
  const sendSync = () => {
    const all = live.current.strokes.map(({ sid, color: c, w, pts }) => ({ sid, color: c, w, pts }))
    for (let i = 0; i < all.length; i += 40) send({ type: 'sync', strokes: all.slice(i, i + 40) })
  }

  // 상대가 보낸 그림 신호 처리
  const onBoard = (p) => {
    const L = live.current
    if (!p) return
    if (p.type === 'pts') {
      let s = L.strokes.find((x) => x.sid === p.sid)
      if (!s) { s = { sid: p.sid, color: p.color, w: p.w, pts: [], unsent: [] }; L.strokes.push(s) }
      for (const pt of p.pts) {
        const last = s.pts[s.pts.length - 1]
        drawSeg(last || pt, last ? pt : [pt[0] + 0.01, pt[1]], s)
        s.pts.push(pt)
      }
    } else if (p.type === 'undo') {
      L.strokes = L.strokes.filter((x) => x.sid !== p.sid); redraw()
    } else if (p.type === 'clear') {
      L.strokes = []; redraw()
    } else if (p.type === 'join') {
      sendSync()
    } else if (p.type === 'sync') {
      const have = new Set(L.strokes.map((x) => x.sid))
      const add = p.strokes.filter((x) => !have.has(x.sid)).map((x) => ({ ...x, unsent: [] }))
      if (add.length) { L.strokes = [...L.strokes, ...add]; redraw() }
    }
  }

  // 칠판을 열면 채널에 접속
  useEffect(() => {
    if (!open) return
    const L = live.current
    redraw()
    const ch = supabase.channel(`board-${appId}`, { config: { broadcast: { self: false } } })
    L.channel = ch
    ch.on('broadcast', { event: 'board' }, ({ payload }) => onBoard(payload))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') send({ type: 'join' })
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setMsg('칠판 서버에 접속하지 못했어요. 잠시 후 다시 열어 주세요.')
    })
    return () => { supabase.removeChannel(ch); L.channel = null }
  }, [open, appId])

  useEffect(() => () => clearTimeout(live.current.timer), [])

  const openBoard = () => {
    const L = live.current
    L.id = crypto.randomUUID().slice(0, 8)
    L.strokes = []; L.cur = null; L.n = 0
    setMsg('')
    setOpen(true)
  }

  // 화면 좌표를 칠판 좌표(1000x600)로 변환
  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)]
  }

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    const L = live.current, t = tools.current
    const s = {
      sid: `${L.id}-${++L.n}`,
      color: t.tool === 'eraser' ? '#ffffff' : t.color,
      w: t.tool === 'eraser' ? t.size * 3 : t.size,
      pts: [], unsent: [],
    }
    const p = pos(e)
    s.pts.push(p); s.unsent.push(p)
    L.strokes.push(s); L.cur = s
    drawSeg(p, [p[0] + 0.01, p[1]], s)
    if (!L.timer) L.timer = setTimeout(flush, 60)
  }

  const move = (e) => {
    const L = live.current, s = L.cur
    if (!s) return
    const p = pos(e), last = s.pts[s.pts.length - 1]
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return
    drawSeg(last, p, s)
    s.pts.push(p); s.unsent.push(p)
    if (!L.timer) L.timer = setTimeout(flush, 60)
  }

  const up = () => {
    const L = live.current
    if (!L.cur) return
    clearTimeout(L.timer)
    flush()
    L.cur = null
  }

  // 내가 그린 마지막 선만 되돌리기
  const undo = () => {
    const L = live.current
    for (let i = L.strokes.length - 1; i >= 0; i--) {
      if (L.strokes[i].sid.startsWith(L.id)) {
        const sid = L.strokes[i].sid
        L.strokes.splice(i, 1); redraw(); send({ type: 'undo', sid })
        return
      }
    }
  }

  const clearAll = () => {
    if (!window.confirm('칠판을 모두 지울까요? 상대방 화면에서도 지워져요.')) return
    live.current.strokes = []; redraw(); send({ type: 'clear' })
  }

  // 칠판을 이미지로 저장 (필기 보관용)
  const savePng = () => {
    canvasRef.current.toBlob((b) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = '칠판.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })
  }

  return (
    <div className="card wb">
      <div className="app-top">
        <h3 style={{ margin: 0 }}>🖍 같이 쓰는 칠판</h3>
        {open
          ? <button className="btn ghost sm" onClick={() => setOpen(false)}>칠판 닫기</button>
          : <button className="btn sm" onClick={openBoard}>칠판 열기</button>}
      </div>

      {!open && (
        <p className="muted" style={{ margin: '8px 0 0' }}>
          두 사람이 각자 <strong>칠판 열기</strong>를 누르면 같은 칠판에 함께 그릴 수 있어요. 휴대폰이나 태블릿 펜으로도 쓸 수 있어요.
          칠판 내용은 서버에 저장되지 않아서, 필요하면 <strong>이미지 저장</strong>을 눌러 보관하세요.
        </p>
      )}
      {msg && <div className="err" role="alert" style={{ marginTop: 8 }}>{msg}</div>}

      {open && (
        <>
          <div className="wbbar">
            <button className="btn ghost sm" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>✏️ 펜</button>
            <button className="btn ghost sm" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>🧽 지우개</button>
            {COLORS.map(([c, name]) => (
              <button key={c} className="sw" style={{ background: c }} aria-label={name} aria-pressed={color === c && tool === 'pen'}
                onClick={() => { setColor(c); setTool('pen') }} />
            ))}
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="굵기">
              {SIZES.map(([n, v]) => <option key={v} value={v}>{n}</option>)}
            </select>
            <button className="btn ghost sm" onClick={undo}>↩ 되돌리기</button>
            <button className="btn ghost sm" onClick={clearAll}>🗑 전체 지우기</button>
            <button className="btn ghost sm" onClick={savePng}>💾 이미지 저장</button>
          </div>
          <canvas ref={canvasRef} width={W} height={H} className="wbc"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          <p className="muted" style={{ margin: '8px 0 0' }}>
            상대방이 칠판을 열면 같은 그림이 보여요. 이름·연락처 같은 개인정보는 쓰지 마세요.
          </p>
        </>
      )}
    </div>
  )
}