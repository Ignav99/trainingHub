'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { trainingHubSalaGuestUrl, trainingHubWsUrl } from '@/lib/wsUrl'
import {
  SALA_ICE_SERVERS,
  SALA_PING_MS,
  SALA_RETRY_MAX,
  SALA_RETRY_MS,
  orderVideoCodecs,
  reconnectDelay,
  shouldApplySeq,
  wrapSalaEnvelope,
  type SalaLinkStatus,
} from '@/lib/salaLink'

function attachSendOnlyVideo(pc: RTCPeerConnection, track: MediaStreamTrack, stream: MediaStream) {
  const transceiver = pc.addTransceiver(track, { direction: 'sendonly', streams: [stream] })
  const caps = typeof RTCRtpSender !== 'undefined' ? RTCRtpSender.getCapabilities?.('video') : null
  if (!caps || typeof transceiver.setCodecPreferences !== 'function') return
  try {
    transceiver.setCodecPreferences(orderVideoCodecs(caps.codecs))
  } catch {
    /* el navegador se queda con su orden */
  }
}

type SignalMsg = {
  kind: 'offer' | 'answer' | 'ice'
  sdp?: string
  candidate?: RTCIceCandidateInit
}

interface UseSalaLinkParams {
  code: string
  role: 'host' | 'tablet'
  accessToken: string | null | undefined
  equipoId: string | undefined
  onMessage: (msg: Record<string, unknown>) => void
  onPeerJoined?: (peers: number) => void
  onSyncRequest?: () => void
  disabled?: boolean
  /** Sala de vídeo: ordenador y tablet entran con el pase del QR, sin equipo ni fila en revisión. */
  guestPass?: string | null
  /** Ordenador: el vídeo local que hay que mandar a la tablet. */
  getLocalStream?: () => MediaStream | null
  /** Tablet: llega la imagen del ordenador. */
  onRemoteStream?: (stream: MediaStream) => void
}

export function useSalaLink({
  code,
  role,
  accessToken,
  equipoId,
  onMessage,
  onPeerJoined,
  onSyncRequest,
  disabled = false,
  guestPass,
  getLocalStream,
  onRemoteStream,
}: UseSalaLinkParams) {
  const [status, setStatus] = useState<SalaLinkStatus>('offline')
  const statusRef = useRef<SalaLinkStatus>('offline')
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([])
  const seqRef = useRef(0)
  const lastRemoteSeqRef = useRef(0)
  const pendingRef = useRef<{ seq: number; envelope: Record<string, unknown>; tries: number } | null>(null)
  const unmountedRef = useRef(false)
  const attemptRef = useRef(0)
  const reconnectTimer = useRef<number | null>(null)
  const retryTimer = useRef<number | null>(null)
  const pingTimer = useRef<number | null>(null)
  const offeringRef = useRef(false)
  const videoPendingRef = useRef(false)
  const offerRestartsRef = useRef(0)
  const publishLocalVideoRef = useRef<() => Promise<void>>(async () => {})
  const startOfferRef = useRef<() => Promise<void>>(async () => {})
  const incomingRef = useRef<(msg: Record<string, unknown>, viaDc: boolean) => void>(() => {})
  const codeRef = useRef(code)
  codeRef.current = code
  const roleRef = useRef(role)
  roleRef.current = role

  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const onPeerJoinedRef = useRef(onPeerJoined)
  onPeerJoinedRef.current = onPeerJoined
  const onSyncRequestRef = useRef(onSyncRequest)
  onSyncRequestRef.current = onSyncRequest
  const getLocalStreamRef = useRef(getLocalStream)
  getLocalStreamRef.current = getLocalStream
  const guestPassRef = useRef(guestPass)
  guestPassRef.current = guestPass
  const onRemoteStreamRef = useRef(onRemoteStream)
  onRemoteStreamRef.current = onRemoteStream

  const setLinkStatus = useCallback((next: SalaLinkStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const teardownRtc = useCallback(() => {
    iceQueueRef.current = []
    try { dcRef.current?.close() } catch { /* ignore */ }
    try { pcRef.current?.close() } catch { /* ignore */ }
    dcRef.current = null
    pcRef.current = null
  }, [])

  const transmit = useCallback((envelope: Record<string, unknown>): boolean => {
    const raw = JSON.stringify(envelope)
    const dc = dcRef.current
    if (dc && dc.readyState === 'open') {
      try {
        dc.send(raw)
        return true
      } catch {
        /* fall through to WS */
      }
    }
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(raw)
      return true
    }
    return false
  }, [])

  const flushPending = useCallback(() => {
    const pending = pendingRef.current
    if (!pending) return
    pending.tries += 1
    transmit(pending.envelope)
  }, [transmit])

  const send = useCallback((
    payload: Record<string, unknown>,
    opts?: { reliable?: boolean },
  ) => {
    if (disabled) return
    const reliable = opts?.reliable === true
    const extra: Record<string, unknown> = { ...payload }
    if (reliable) {
      seqRef.current += 1
      extra.seq = seqRef.current
    }
    const envelope = wrapSalaEnvelope('sala_sync', codeRef.current, roleRef.current, extra)
    if (reliable) pendingRef.current = { seq: seqRef.current, envelope, tries: 0 }
    transmit(envelope)
  }, [disabled, transmit])

  const requestSync = useCallback(() => {
    if (disabled) return
    transmit(wrapSalaEnvelope('sala_sync_request', codeRef.current, roleRef.current, {}))
  }, [disabled, transmit])

  const sendFrame = useCallback((jpeg: string, t: number, slide: number) => {
    if (disabled || !jpeg) return
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'sala_frame',
      session_code: codeRef.current,
      role: roleRef.current,
      jpeg,
      t,
      slide,
    }))
  }, [disabled])

  const sendSignal = useCallback((signal: SignalMsg) => {
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'sala_signal',
      session_code: codeRef.current,
      role: roleRef.current,
      signal,
    }))
  }, [])

  const bindChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc
    dc.onopen = () => {
      setLinkStatus('direct')
      flushPending()
    }
    dc.onclose = () => {
      if (dcRef.current === dc) {
        dcRef.current = null
        if (statusRef.current === 'direct') {
          setLinkStatus(wsRef.current?.readyState === WebSocket.OPEN ? 'cloud' : 'offline')
        }
      }
    }
    dc.onmessage = (event) => {
      try {
        incomingRef.current(JSON.parse(String(event.data)), true)
      } catch {
        /* ignore */
      }
    }
  }, [flushPending, setLinkStatus])

  const bindPeer = useCallback((pc: RTCPeerConnection) => {
    pcRef.current = pc
    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal({ kind: 'ice', candidate: event.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (pcRef.current !== pc || offerRestartsRef.current >= 3) return
        offerRestartsRef.current += 1
        offeringRef.current = false
        teardownRtc()
        window.setTimeout(() => { void startOfferRef.current() }, 600)
        return
      }
      if (pc.connectionState === 'closed') {
        if (pcRef.current === pc) {
          offeringRef.current = false
          teardownRtc()
          if (statusRef.current === 'direct') {
            setLinkStatus(wsRef.current?.readyState === WebSocket.OPEN ? 'cloud' : 'offline')
          }
        }
      }
    }
    pc.onsignalingstatechange = () => {
      if (pc.signalingState === 'stable' && videoPendingRef.current) {
        void publishLocalVideoRef.current()
      }
    }
    pc.ondatachannel = (event) => bindChannel(event.channel)
    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? (event.track ? new MediaStream([event.track]) : null)
      if (!stream) return
      const deliver = () => onRemoteStreamRef.current?.(new MediaStream(stream.getVideoTracks()))
      deliver()
      const track = stream.getVideoTracks()[0]
      if (track) track.onunmute = deliver
    }
  }, [bindChannel, sendSignal, setLinkStatus, teardownRtc])

  const startOffer = useCallback(async () => {
    if (roleRef.current !== 'host' || typeof RTCPeerConnection === 'undefined') return
    if (offeringRef.current && pcRef.current) return
    offeringRef.current = true
    teardownRtc()
    try {
      const pc = new RTCPeerConnection({ iceServers: SALA_ICE_SERVERS })
      bindPeer(pc)
      const local = getLocalStreamRef.current?.()
      const videoTrack = local?.getVideoTracks().find((track) => track.readyState === 'live')
      if (local && videoTrack) attachSendOnlyVideo(pc, videoTrack, local)
      else videoPendingRef.current = true
      const dc = pc.createDataChannel('sala', { ordered: true })
      bindChannel(dc)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({ kind: 'offer', sdp: pc.localDescription?.sdp })
    } catch {
      offeringRef.current = false
      teardownRtc()
    }
  }, [bindChannel, bindPeer, sendSignal, teardownRtc])
  startOfferRef.current = startOffer

  const publishLocalVideo = useCallback(async () => {
    if (roleRef.current !== 'host') return
    const pc = pcRef.current
    const local = getLocalStreamRef.current?.()
    const track = local?.getVideoTracks().find((item) => item.readyState === 'live')
    if (!pc || !local || !track) {
      videoPendingRef.current = true
      return
    }
    if (pc.signalingState !== 'stable') {
      videoPendingRef.current = true
      return
    }
    const sender = pc.getSenders().find((item) => item.track?.kind === 'video')
    if (sender) {
      videoPendingRef.current = false
      if (sender.track !== track) {
        try { await sender.replaceTrack(track) } catch { /* ignore */ }
      }
      return
    }
    videoPendingRef.current = false
    try {
      attachSendOnlyVideo(pc, track, local)
      offeringRef.current = true
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({ kind: 'offer', sdp: pc.localDescription?.sdp })
    } catch {
      offeringRef.current = false
      videoPendingRef.current = true
    }
  }, [sendSignal])
  publishLocalVideoRef.current = publishLocalVideo

  const handleSignal = useCallback(async (signal: SignalMsg | undefined) => {
    if (!signal || typeof RTCPeerConnection === 'undefined') return
    try {
      if (signal.kind === 'offer' && roleRef.current === 'tablet' && signal.sdp) {
        teardownRtc()
        const pc = new RTCPeerConnection({ iceServers: SALA_ICE_SERVERS })
        bindPeer(pc)
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        const queued = iceQueueRef.current
        iceQueueRef.current = []
        for (const c of queued) {
          try { await pc.addIceCandidate(c) } catch { /* ignore */ }
        }
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal({ kind: 'answer', sdp: pc.localDescription?.sdp })
        return
      }
      if (signal.kind === 'answer' && roleRef.current === 'host' && signal.sdp && pcRef.current) {
        await pcRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        const queued = iceQueueRef.current
        iceQueueRef.current = []
        for (const c of queued) {
          try { await pcRef.current.addIceCandidate(c) } catch { /* ignore */ }
        }
        offeringRef.current = false
        offerRestartsRef.current = 0
        void publishLocalVideoRef.current()
        return
      }
      if (signal.kind === 'ice' && signal.candidate) {
        const pc = pcRef.current
        if (!pc || !pc.remoteDescription) {
          iceQueueRef.current.push(signal.candidate)
          return
        }
        try { await pc.addIceCandidate(signal.candidate) } catch { /* ignore */ }
      }
    } catch {
      /* ignore negotiation glitches on flaky 5G */
    }
  }, [bindPeer, sendSignal, teardownRtc])

  incomingRef.current = (msg, viaDc) => {
    const msgCode = typeof msg.session_code === 'string' ? msg.session_code : ''
    if (msgCode && msgCode !== codeRef.current) return

    if (msg.type === 'sala_joined') {
      const peers = typeof msg.peers === 'number' ? msg.peers : 0
      if (peers > 1) {
        onPeerJoinedRef.current?.(peers)
        if (dcRef.current?.readyState !== 'open') void startOffer()
      }
      return
    }
    if (msg.type === 'sala_peer_joined') {
      const peers = typeof msg.peers === 'number' ? msg.peers : 1
      onPeerJoinedRef.current?.(peers)
      if (dcRef.current?.readyState !== 'open') void startOffer()
      return
    }
    if (msg.type === 'sala_sync_request') {
      onSyncRequestRef.current?.()
      return
    }
    if (msg.type === 'sala_signal') {
      void handleSignal(msg.signal as SignalMsg | undefined)
      return
    }
    if (msg.type === 'sala_frame') {
      onMessageRef.current(msg)
      return
    }
    if (msg.type === 'sala_sync_ack') {
      const seq = msg.seq
      if (typeof seq === 'number' && pendingRef.current?.seq === seq) {
        pendingRef.current = null
      }
      return
    }
    if (msg.type !== 'sala_sync') return

    const seq = typeof msg.seq === 'number' ? msg.seq : undefined
    if (!shouldApplySeq(lastRemoteSeqRef.current, seq)) {
      ackSeq(seq, viaDc)
      return
    }
    if (typeof seq === 'number') lastRemoteSeqRef.current = seq
    if (typeof seq === 'number') ackSeq(seq, viaDc)
    onMessageRef.current(msg)
  }

  function ackSeq(seq: unknown, viaDc: boolean) {
    if (typeof seq !== 'number') return
    const envelope = wrapSalaEnvelope('sala_sync_ack', codeRef.current, roleRef.current, { seq })
    if (viaDc && dcRef.current?.readyState === 'open') {
      try {
        dcRef.current.send(JSON.stringify(envelope))
        return
      } catch { /* fall through */ }
    }
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(envelope))
  }

  useEffect(() => {
    unmountedRef.current = false
    const asGuest = Boolean(guestPass)
    if (disabled) return
    if (asGuest && !code) return
    if (!asGuest && !accessToken && !code) return
    if (!asGuest && accessToken && !equipoId) return

    const connect = () => {
      if (unmountedRef.current) return
      const ws = new WebSocket(
        asGuest || !(accessToken && equipoId)
          ? trainingHubSalaGuestUrl(codeRef.current, guestPassRef.current)
          : trainingHubWsUrl(accessToken as string, equipoId as string)
      )
      wsRef.current = ws
      ws.onopen = () => {
        attemptRef.current = 0
        setLinkStatus(dcRef.current?.readyState === 'open' ? 'direct' : 'cloud')
        ws.send(JSON.stringify({ type: 'sala_join', session_code: codeRef.current, role: roleRef.current }))
        flushPending()
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (statusRef.current !== 'direct') setLinkStatus('offline')
        if (unmountedRef.current) return
        const delay = reconnectDelay(attemptRef.current)
        attemptRef.current += 1
        reconnectTimer.current = window.setTimeout(connect, delay)
      }
      ws.onerror = () => {
        if (statusRef.current !== 'direct') setLinkStatus('offline')
      }
      ws.onmessage = (event) => {
        try {
          incomingRef.current(JSON.parse(event.data), false)
        } catch {
          /* ignore */
        }
      }
    }

    connect()
    pingTimer.current = window.setInterval(() => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, SALA_PING_MS)
    retryTimer.current = window.setInterval(() => {
      const pending = pendingRef.current
      if (!pending) return
      if (pending.tries >= SALA_RETRY_MAX) pending.tries = 0
      flushPending()
    }, SALA_RETRY_MS)

    return () => {
      unmountedRef.current = true
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
      if (pingTimer.current) window.clearInterval(pingTimer.current)
      if (retryTimer.current) window.clearInterval(retryTimer.current)
      offeringRef.current = false
      teardownRtc()
      try { wsRef.current?.close() } catch { /* ignore */ }
      wsRef.current = null
    }
  }, [accessToken, equipoId, code, role, disabled, guestPass, flushPending, setLinkStatus, teardownRtc])

  return {
    send,
    sendFrame,
    requestSync,
    publishLocalVideo,
    status,
    wsOk: status !== 'offline',
    direct: status === 'direct',
  }
}
