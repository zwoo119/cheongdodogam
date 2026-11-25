import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const W = 1000, H = 600
const COLORS = [['#111111', '검정'], ['#d64545', '빨강'], ['#2f6fd6', '파랑'], ['#2f7d4f', '초록']]
const HL_COLORS = [['#ffe600', '노랑'], ['#7be04a', '연두'], ['#ff7ac8', '분홍'], ['#ff9f1a', '주황']]
const HL_ALPHA = 0.35
const SIZES = [['가늘게', 3], ['보통', 6], ['굵게', 12]]

// 영상 수업 안에서 같이 쓰는 칠판. 그린 선을 Supabase Realtime으로 상대 화면에 바로 보냅니다.
// 서버에 저장되지 않으며, 두 사람이 모두 칠판을 열어 둬야 서로 보여요.
export default function Whiteboard({ appId, hidden = false }) {
  const [tool, setTool] = useState('pen') // pen | hl(형광펜) | eraser
  const [color, setColor] = useState(COLORS[0][0])
  const [hlColor, setHlColor] = useState(HL_COLORS[0][0])
  const [size, setSize] = useState(6)
  const [msg, setMsg] = useState('')
  const canvasRef = useRef(null)
  const live = useRef(null)
  if (!live.current) {
    live.current = { strokes: [], cur: null, channel: null, id: crypto.randomUUID().slice(0, 8), n: 0, timer: null }
  }
  const tools = useRef({})
  tools.current = { tool, color, hlColor, size }

  // 선 한 구간만 그리기 (펜·지우개의 실시간 그리기에 사용)
  const drawSeg = (a, b, s) => {
    const g = canvasRef.current?.getContext('2d')
    if (!g) return
    g.strokeStyle = s.color; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round'
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke()
  }

  // 선 전체를 한 번에 그리기 (형광펜은 구간별로 그리면 겹쳐서 진해지므로 한 줄로 그림)
  const drawStroke = (s) => {
    const g = canvasRef.current?.getContext('2d')
    if (!g || !s.pts.length) return
    g.save()
    g.globalAlpha = s.a ?? 1
    g.strokeStyle = s.color; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(s.pts[0][0], s.pts[0][1])
    if (s.pts.length === 1) g.lineTo(s.pts[0][0] + 0.01, s.pts[0][1])
    for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0], s.pts[i][1])
    g.stroke()
    g.restore()
  }

  const isHl = (s) => (s.a ?? 1) < 1

  const redraw = () => {
    const g = canvasRef.current?.getContext('2d')
    if (!g) return
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
    for (const s of live.current.strokes) drawStroke(s)
  }

  const send = (payload) => live.current.channel?.send({ type: 'broadcast', event: 'board', payload })

  // 아직 못 보낸 점들을 모아서 보냄 (너무 자주 보내지 않도록 60ms마다)
  const flush = () => {
    const L = live.current
    L.timer = null
    const s = L.cur
    if (!s || !s.unsent.length) return
    send({ type: 'pts', sid: s.sid, color: s.color, w: s.w, a: s.a, pts: s.unsent })
    s.unsent = []
  }

  // 나중에 들어온 사람에게 지금까지의 그림을 보내 줌
  const sendSync = () => {
    const all = live.current.strokes.map(({ sid, color: c, w, a, pts }) => ({ sid, color: c, w, a, pts }))
    for (let i = 0; i < all.length; i += 40) send({ type: 'sync', strokes: all.slice(i, i + 40) })
  }

  // 상대가 보낸 그림 신호 처리
  const onBoard = (p) => {
    const L = live.current
    if (!p) return
    if (p.type === 'pts') {
      let s = L.strokes.find((x) => x.sid === p.sid)
      if (!s) { s = { sid: p.sid, color: p.color, w: p.w, a: p.a ?? 1, pts: [], unsent: [] }; L.strokes.push(s) }
      for (const pt of p.pts) {
        const last = s.pts[s.pts.length - 1]
        if (!isHl(s)) drawSeg(last || pt, last ? pt : [pt[0] + 0.01, pt[1]], s)
        s.pts.push(pt)
      }
      if (isHl(s)) redraw()
    } else if (p.type === 'undo') {
      L.strokes = L.strokes.filter((x) => x.sid !== p.sid); redraw()
    } else if (p.type === 'clear') {
      L.strokes = []; redraw()
    } else if (p.type === 'join') {
      sendSync()
    } else if (p.type === 'sync') {
      const have = new Set(L.strokes.map((x) => x.sid))
      const add = p.strokes.filter((x) => !have.has(x.sid)).map((x) => ({ ...x, a: x.a ?? 1, unsent: [] }))
      if (add.length) { L.strokes = [...L.strokes, ...add]; redraw() }
    }
  }

  // 칠판이 화면에 나타나면 채널에 접속 (영상 통화를 나가면 사라지며 접속 종료)
  useEffect(() => {
    const L = live.current
    redraw()
    const ch = supabase.channel(`board-${appId}`, { config: { broadcast: { self: false } } })
    L.channel = ch
    ch.on('broadcast', { event: 'board' }, ({ payload }) => onBoard(payload))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') send({ type: 'join' })
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setMsg('칠판 서버에 접속하지 못했어요. 영상 수업을 나갔다가 다시 들어와 주세요.')
    })
    return () => { clearTimeout(L.timer); supabase.removeChannel(ch); L.channel = null }
  }, [appId])

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
      color: t.tool === 'eraser' ? '#ffffff' : t.tool === 'hl' ? t.hlColor : t.color,
      w: t.tool === 'pen' ? t.size : t.size * 3, // 지우개와 형광펜은 굵게
      a: t.tool === 'hl' ? HL_ALPHA : 1,
      pts: [], unsent: [],
    }
    const p = pos(e)
    s.pts.push(p); s.unsent.push(p)
    L.strokes.push(s); L.cur = s
    if (isHl(s)) redraw()
    else drawSeg(p, [p[0] + 0.01, p[1]], s)
    if (!L.timer) L.timer = setTimeout(flush, 60)
  }

  const move = (e) => {
    const L = live.current, s = L.cur
    if (!s) return
    const p = pos(e), last = s.pts[s.pts.length - 1]
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return
    s.pts.push(p); s.unsent.push(p)
    if (isHl(s)) redraw()
    else drawSeg(last, p, s)
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

  const hlMode = tool === 'hl'

  return (
    <div className={`wbe ${hidden ? 'hide' : ''}`}>
      <div className="wbbar">
        <button className="btn ghost sm" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>✏️ 펜</button>
        <button className="btn ghost sm" aria-pressed={tool === 'hl'} onClick={() => setTool('hl')}>🖍 형광펜</button>
        <button className="btn ghost sm" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>🧽 지우개</button>
        {(hlMode ? HL_COLORS : COLORS).map(([c, name]) => (
          <button key={c} className="sw" style={{ background: c }} aria-label={name}
            aria-pressed={hlMode ? hlColor === c : color === c && tool === 'pen'}
            onClick={() => { if (hlMode) setHlColor(c); else { setColor(c); setTool('pen') } }} />
        ))}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="굵기">
          {SIZES.map(([n, v]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <button className="btn ghost sm" onClick={undo}>↩ 되돌리기</button>
        <button className="btn ghost sm" onClick={clearAll}>🗑 전체 지우기</button>
        <button className="btn ghost sm" onClick={savePng}>💾 이미지 저장</button>
      </div>
      {msg && <div className="err" role="alert">{msg}</div>}
      <canvas ref={canvasRef} width={W} height={H} className="wbc"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <p className="muted" style={{ margin: '8px 0 0' }}>
        칠판 내용은 서버에 저장되지 않아요. 필요하면 <strong>이미지 저장</strong>을 눌러 보관하세요. 개인정보는 쓰지 마세요.
      </p>
    </div>
  )
}