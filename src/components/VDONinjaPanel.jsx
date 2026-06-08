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

// Append params VDO.ninja needs for iframe stats API — safe to add even if already present
function buildIframeSrc(url) {
  try {
    const u = new URL(url)
    if (!u.searchParams.has('statsapi')) u.searchParams.set('statsapi', '1')
    if (!u.searchParams.has('autostart')) u.searchParams.set('autostart', '1')
    return u.toString()
  } catch {
    return url
  }
}

function extractStats(data) {
  try {
    // VDO.ninja may send stats at top level or nested under .stats
    const inbound = data?.stats?.inbound_stats ?? data?.inbound_stats
    if (inbound) {
      const streamId = Object.keys(inbound)[0]
      if (streamId) {
        const connId = Object.keys(inbound[streamId])[0]
        if (connId) return inbound[streamId][connId]
      }
    }
    // Some versions return a flat stats object directly
    if (data?.Bitrate_in_kbps != null || data?.framerate != null) return data
    return null
  } catch {
    return null
  }
}

function GuestDetail({ guest }) {
  const iframeRef = useRef(null)
  const [guestStats, setGuestStats] = useState(null)
  const [live, setLive] = useState(false)
  const iframeSrc = buildIframeSrc(guest.url)

  useEffect(() => {
    let intervalId = null

    function handleMessage(e) {
      // Don't filter by e.source — cross-origin source refs can be unreliable in OBS browser
      // Instead just check the data shape
      const s = extractStats(e.data)
      if (s) {
        setGuestStats(s)
        setLive(true)
      }
    }

    window.addEventListener('message', handleMessage)
    // Poll the iframe — also try legacy string format some VDO.ninja versions use
    intervalId = setInterval(() => {
      try {
        const cw = iframeRef.current?.contentWindow
        if (!cw) return
        cw.postMessage({ getStats: true }, '*')
        cw.postMessage('getStats', '*')
      } catch {}
    }, 1000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(intervalId)
    }
  }, [guest.url])

  const packetLoss = guestStats?.packetLoss_in_percentage ?? null

  return (
    <div className="vdo-guest">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: 2, height: 2, opacity: 0, pointerEvents: 'none' }}
        allow="autoplay;camera;microphone;display-capture"
        title={`vdo-${guest.label}`}
      />
      <div className="branch-output-header">
        <span className="branch-output-name">{guest.label}</span>
        <span className={`badge badge-${live ? 'live' : 'off'}`}>{live ? 'LIVE' : 'IDLE'}</span>
      </div>
      {live && guestStats ? (
        <div className="branch-detail-grid">
          <div className="branch-detail-tile">
            <span className="branch-detail-label">Bitrate</span>
            <span className="branch-detail-value">
              {guestStats.Bitrate_in_kbps != null ? `${guestStats.Bitrate_in_kbps} kbps` : '—'}
            </span>
          </div>
          <div
            className="branch-detail-tile"
            style={{ borderLeftColor: `var(--${packetLossColor(packetLoss)})` }}
            title={packetLossTooltip(packetLoss)}
          >
            <span className="branch-detail-label">Packet Loss</span>
            <span className="branch-detail-value">
              {packetLoss != null ? `${packetLoss.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="branch-detail-tile">
            <span className="branch-detail-label">FPS</span>
            <span className="branch-detail-value">
              {guestStats.framerate != null ? guestStats.framerate : '—'}
            </span>
          </div>
          <div className="branch-detail-tile">
            <span className="branch-detail-label">Resolution</span>
            <span className="branch-detail-value">{guestStats.Resolution || '—'}</span>
          </div>
        </div>
      ) : (
        <div className="panel-idle">Waiting for stats…</div>
      )}
    </div>
  )
}

export function VDONinjaPanel({ settings }) {
  const [expanded, setExpanded] = useState(false)
  const guests = settings?.vdoGuests || []

  if (guests.length === 0) return null

  return (
    <section className="panel accordion-panel">
      <div className="accordion-header" onClick={() => setExpanded(e => !e)}>
        <span className="panel-title" style={{ marginBottom: 0 }}>
          VDO.ninja
          <span className="accordion-arrow">{expanded ? '▾' : '▸'}</span>
        </span>
        <div className="accordion-badges">
          <span className="status-badge status-badge-idle">{guests.length} guest{guests.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {expanded && (
        <div className="accordion-body">
          {guests.map((g, i) => (
            <GuestDetail key={g.url + i} guest={g} />
          ))}
        </div>
      )}
    </section>
  )
}
