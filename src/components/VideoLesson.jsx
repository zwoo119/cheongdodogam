import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// 공개 STUN 서버 (서로의 접속 경로를 찾을 때만 사용, 영상은 거치지 않음)
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] }
const CAN_SHARE = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

// 사이트 안 1:1 영상 수업 (WebRTC) + 화면 공유. 연결 신호는 Supabase Realtime으로 주고받습니다.
export default function VideoLesson({ appId }) {
  const [state, setState] = useState('idle') // idle | starting | waiting | connected | error
  const [msg, setMsg] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)       // 내가 화면 공유 중
  const [remoteShare, setRemoteShare] = useState(false) // 상대가 화면 공유 중
  const localRef = useRef(null)
  const remoteRef = useRef(null)
  const live = useRef({}) // pc, stream, display, channel, id, pending
  const stopRef = useRef(null)

  const send = (m) =>
    live.current.channel?.send({ type: 'broadcast', event: 'signal', payload: { ...m, from: live.current.id } })

  // 통화 종료: 연결, 카메라, 화면 공유, 채널 정리
  const stop = () => {
    const L = live.current
    if (L.channel) supabase.removeChannel(L.channel)
    L.pc?.close()
    L.stream?.getTracks().forEach((t) => t.stop())
    L.display?.getTracks().forEach((t) => t.stop())
    live.current = {}
    if (localRef.current) localRef.current.srcObject = null
    if (remoteRef.current) remoteRef.current.srcObject = null
    setSharing(false)
    setRemoteShare(false)
  }
  stopRef.current = stop
  useEffect(() => () => stopRef.current?.(), []) // 화면을 나가면 자동 종료

  const fail = (text) => { stop(); setMsg(text); setState('error') }

  const createPc = () => {
    const L = live.current
    const pc = new RTCPeerConnection(ICE)
    // 소리는 마이크, 영상은 (화면 공유 중이면 공유 화면, 아니면 카메라)
    L.stream.getAudioTracks().forEach((t) => pc.addTrack(t, L.stream))
    const vtrack = L.display?.getVideoTracks()[0] || L.stream.getVideoTracks()[0]
    if (vtrack) pc.addTrack(vtrack, L.stream)
    pc.ontrack = (e) => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0] }
    pc.onicecandidate = (e) => { if (e.candidate) send({ type: 'ice', data: e.candidate.toJSON() }) }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { setMsg(''); setState('connected') }
      if (pc.connectionState === 'disconnected') setState('waiting')
      if (pc.connectionState === 'failed') {
        setMsg('연결하지 못했어요. 네트워크 환경 때문일 수 있어요. 위의 수업 링크(Google Meet 등)를 이용해 주세요.')
        setState('waiting')
      }
    }
    L.pc = pc
    L.pending = []
    return pc
  }

  const flush = async (pc) => {
    const L = live.current
    for (const c of L.pending) await pc.addIceCandidate(c)
    L.pending = []
  }

  const makeOffer = async () => {
    const L = live.current
    L.pc?.close()
    const pc = createPc()
    await pc.setLocalDescription(await pc.createOffer())
    send({ type: 'offer', data: pc.localDescription.toJSON() })
  }

  // 상대가 보낸 연결 신호 처리
  const onSignal = async (p) => {
    const L = live.current
    if (!p || !L.id || p.from === L.id) return
    try {
      if (p.type === 'join' || p.type === 'here') {
        if (p.type === 'join') send({ type: 'here' }) // 이미 있던 사람이 응답
        if (L.display) send({ type: 'share', on: true })
        if (L.id < p.from) await makeOffer()           // 둘 중 한 명만 먼저 제안
      } else if (p.type === 'offer') {
        L.pc?.close()
        const pc = createPc()
        await pc.setRemoteDescription(p.data)
        await flush(pc)
        await pc.setLocalDescription(await pc.createAnswer())
        send({ type: 'answer', data: pc.localDescription.toJSON() })
      } else if (p.type === 'answer') {
        if (L.pc && L.pc.signalingState === 'have-local-offer') {
          await L.pc.setRemoteDescription(p.data)
          await flush(L.pc)
        }
      } else if (p.type === 'ice') {
        if (L.pc?.remoteDescription) await L.pc.addIceCandidate(p.data)
        else (L.pending ||= []).push(p.data)
      } else if (p.type === 'share') {
        setRemoteShare(!!p.on)
      } else if (p.type === 'leave') {
        L.pc?.close(); L.pc = null
        if (remoteRef.current) remoteRef.current.srcObject = null
        setRemoteShare(false)
        setState('waiting')
      }
    } catch (e) {
      console.error('영상 연결 오류:', e)
    }
  }

  const start = async () => {
    setMsg('')
    if (!navigator.mediaDevices?.getUserMedia) return fail('이 브라우저는 영상 수업을 지원하지 않아요. 최신 Chrome에서 열어 주세요.')
    setState('starting')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch (e) {
      console.error(e)
      return fail('카메라·마이크를 사용할 수 없어요. 주소창의 자물쇠 아이콘에서 권한을 허용하고, 다른 프로그램이 카메라를 쓰고 있지 않은지 확인해 주세요.')
    }
    const L = live.current
    L.stream = stream
    L.id = crypto.randomUUID()
    setMicOn(true); setCamOn(true)
    if (localRef.current) localRef.current.srcObject = stream

    const channel = supabase.channel(`video-${appId}`, { config: { broadcast: { self: false } } })
    L.channel = channel
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => onSignal(payload))
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { setState('waiting'); send({ type: 'join' }) }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fail('연결 서버에 접속하지 못했어요. 잠시 후 다시 시도해 주세요.')
    })
  }

  const hangUp = async () => {
    try { await send({ type: 'leave' }) } catch (e) { /* 무시 */ }
    stop()
    setState('idle')
  }

  const toggle = (kind) => {
    const s = live.current.stream
    const tracks = kind === 'audio' ? s?.getAudioTracks() : s?.getVideoTracks()
    tracks?.forEach((t) => { t.enabled = !t.enabled })
    if (kind === 'audio') setMicOn((v) => !v)
    else setCamOn((v) => !v)
  }

  // 화면 공유 끝내고 카메라로 되돌리기
  const stopShare = async () => {
    const L = live.current
    L.display?.getTracks().forEach((t) => t.stop())
    L.display = null
    const cam = L.stream?.getVideoTracks()[0]
    const sender = L.pc?.getSenders().find((s) => s.track?.kind === 'video')
    if (sender && cam) { try { await sender.replaceTrack(cam) } catch (e) { console.error(e) } }
    send({ type: 'share', on: false })
    setSharing(false)
  }

  // 화면 공유 시작: 공유할 창이나 탭을 고르는 브라우저 창이 뜹니다
  const shareScreen = async () => {
    const L = live.current
    setMsg('')
    if (!L.pc) return setMsg('상대방과 연결된 뒤에 화면을 공유할 수 있어요.')
    let ds
    try {
      ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    } catch (e) {
      return // 사용자가 취소한 경우
    }
    const track = ds.getVideoTracks()[0]
    const sender = L.pc.getSenders().find((s) => s.track?.kind === 'video')
    if (!sender) { ds.getTracks().forEach((t) => t.stop()); return setMsg('화면을 공유하지 못했어요.') }
    await sender.replaceTrack(track)
    L.display = ds
    track.onended = () => stopShare() // 브라우저의 '공유 중지' 버튼을 눌러도 정리
    send({ type: 'share', on: true })
    setSharing(true)
  }

  const idle = state === 'idle' || state === 'error'
  return (
    <div className="card vl">
      <div className="app-top">
        <h3 style={{ margin: 0 }}>🎥 사이트에서 영상 수업</h3>
        {idle && <button className="btn sm" onClick={start}>영상 수업 시작</button>}
      </div>
      {idle && (
        <p className="muted" style={{ margin: '8px 0 0' }}>
          멘토와 신청자가 같은 시간에 각자 <strong>영상 수업 시작</strong>을 누르면 연결돼요. 영상은 서버에 저장되거나 녹화되지 않아요.
          이어폰을 쓰면 소리가 울리지 않아요. PC에서는 <strong>화면 공유</strong>로 필기나 자료도 보여 줄 수 있어요.
        </p>
      )}
      {msg && <div className="err" role="alert" style={{ marginTop: 8 }}>{msg}</div>}

      <div className={`vgrid ${idle ? 'hide' : ''}`}>
        <video ref={remoteRef} className={remoteShare ? 'contain' : ''} autoPlay playsInline />
        <video ref={localRef} className="me" autoPlay playsInline muted />
        {sharing && <div className="vbadge">🖥 화면 공유 중</div>}
        {state !== 'connected' && (
          <div className="vwait">{state === 'starting' ? '카메라를 켜는 중...' : '상대방이 입장하기를 기다리고 있어요.'}</div>
        )}
      </div>

      {!idle && (
        <div className="vbar">
          <button className="btn ghost sm" onClick={() => toggle('audio')}>{micOn ? '🎤 마이크 끄기' : '🔇 마이크 켜기'}</button>
          <button className="btn ghost sm" onClick={() => toggle('video')}>{camOn ? '📷 카메라 끄기' : '🚫 카메라 켜기'}</button>
          {CAN_SHARE && (
            sharing
              ? <button className="btn ghost sm" onClick={stopShare}>🖥 공유 멈추기</button>
              : <button className="btn ghost sm" onClick={shareScreen}>🖥 화면 공유</button>
          )}
          <button className="btn red sm" onClick={hangUp}>나가기</button>
        </div>
      )}
      {!idle && CAN_SHARE && (
        <p className="muted" style={{ margin: '8px 0 0', textAlign: 'center' }}>
          화면을 공유할 때는 전체 화면보다 <strong>필요한 창 하나</strong>만 고르세요. 연락처나 메신저 창이 보이지 않게 조심해 주세요.
        </p>
      )}
    </div>
  )
}