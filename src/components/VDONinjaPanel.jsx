import React, { useRef, useEffect, useState } from 'react'

function packetLossColor(pct) {
  if (pct == null) return 'gray'
  if (pct > 1) return 'red'
  if (pct > 0.1) return 'yellow'
  return 'green'
}

function packetLossTooltip(pct) {
  if (pct == null) return null
  return `${pct.toFixed(2)}% packet loss on VDO.ninja connection.\n\nHigh packet loss causes video artifacts and freezing.\n\nCauses: weak WiFi, network congestion, distance to peer.\n\nTry: switching guest to wired ethernet, or lowering their video quality.`
}

function extractStats(data) {
  try {
    const inbound = data?.stats?.inbound_stats
    if (!inbound) return null
    const streamId = Object.keys(inbound)[0]
    if (!streamId) return null
    const connId = Object.keys(inbound[streamId])[0]
    if (!connId) return null
    return inbound[streamId][connId]
  } catch {
    return null
  }
}

function GuestPanel({ guest }) {
  const iframeRef = useRef(null)
  const [guestStats, setGuestStats] = useState(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let intervalId = null

    function handleMessage(e) {
      if (!iframeRef.current) return
      if (e.source !== iframeRef.current.contentWindow) return
      const s = extractStats(e.data)
      if (s) {
        setGuestStats(s)
        setLive(true)
      }
    }

    window.addEventListener('message', handleMessage)

    intervalId = setInterval(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage({ getStats: true }, '*')
      } catch {}
    }, 1000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(intervalId)
    }
  }, [guest.url])

  const packetLoss = guestStats?.packetLoss_in_percentage ?? null
  const dotColor = live ? 'green' : 'gray'

  return (
    <div className="vdo-guest">
      <iframe
        ref={iframeRef}
        src={guest.url}
        style={{ display: 'none', width: 1, height: 1 }}
        allow="camera;microphone"
        title={`vdo-${guest.label}`}
      />
      <div className="vdo-guest-header">
        <span className="vdo-guest-name">{guest.label}</span>
        <span className={`badge badge-${live ? 'live' : 'off'}`}>{live ? 'LIVE' : 'IDLE'}</span>
      </div>
      {live && guestStats ? (
        <>
          <div className="stat-row">
            <span className="stat-label">Bitrate</span>
            <span className="stat-value">{guestStats.Bitrate_in_kbps != null ? `${guestStats.Bitrate_in_kbps} kbps` : '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">FPS</span>
            <span className="stat-value">{guestStats.framerate != null ? guestStats.framerate : '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Resolution</span>
            <span className="stat-value">{guestStats.Resolution || '—'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Codec</span>
            <span className="stat-value">{guestStats.video_codec || '—'}</span>
          </div>
          <div
            className="stat-row stat-row-tip"
            style={{ position: 'relative' }}
            title={packetLossTooltip(packetLoss)}
          >
            <span className="stat-label">Packet Loss</span>
            <span className="stat-value">
              <span className={`dot dot-${packetLossColor(packetLoss)}`} />
              {packetLoss != null ? `${packetLoss.toFixed(2)}%` : '—'}
            </span>
          </div>
        </>
      ) : (
        <div className="panel-idle">Waiting for stats…</div>
      )}
    </div>
  )
}

export function VDONinjaPanel({ settings }) {
  const guests = settings?.vdoGuests || []

  if (guests.length === 0) return null

  return (
    <section className="panel">
      <h2 className="panel-title">VDO.ninja</h2>
      {guests.map((g, i) => (
        <GuestPanel key={g.url + i} guest={g} />
      ))}
    </section>
  )
}
