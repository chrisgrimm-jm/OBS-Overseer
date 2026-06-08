import React, { useState } from 'react'

function buildIframeSrc(url) {
  try {
    const u = new URL(url)
    if (!u.searchParams.has('showstats')) u.searchParams.set('showstats', '1')
    return u.toString()
  } catch {
    return url
  }
}

function GuestFrame({ guest }) {
  return (
    <div className="vdo-guest">
      <div className="vdo-guest-header">
        <span className="vdo-guest-name">{guest.label}</span>
      </div>
      <iframe
        src={buildIframeSrc(guest.url)}
        style={{ width: '100%', height: 180, border: 'none', borderRadius: 4, background: '#000' }}
        allow="autoplay;camera;microphone;fullscreen;picture-in-picture;"
        title={`vdo-${guest.label}`}
      />
    </div>
  )
}

export function VDONinjaPanel({ settings }) {
  const [expanded, setExpanded] = useState(true)
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
          {guests.map((g, i) => <GuestFrame key={g.url + i} guest={g} />)}
        </div>
      )}
    </section>
  )
}
