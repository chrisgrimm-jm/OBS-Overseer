import React, { useState } from 'react'

export function SettingsPanel({ settings, onSave }) {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState(settings.host)
  const [port, setPort] = useState(settings.port)
  const [password, setPassword] = useState(settings.password)
  const [saved, setSaved] = useState(false)
  const [vdoGuests, setVdoGuests] = useState(settings.vdoGuests || [])
  const [newUrl, setNewUrl] = useState('')

  function handleSave(e) {
    e.preventDefault()
    onSave({ host: host.trim() || 'localhost', port: port.trim() || '4455', password, vdoGuests })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function labelFromUrl(url) {
    try {
      const u = new URL(url)
      const view = u.searchParams.get('view') || u.searchParams.get('room') || u.pathname.split('/').filter(Boolean).pop()
      if (view) return view.length > 12 ? view.slice(0, 12) + '…' : view
    } catch {}
    return 'Guest'
  }

  function addGuest() {
    const url = newUrl.trim()
    if (!url) return
    setVdoGuests(g => [...g, { label: labelFromUrl(url), url }])
    setNewUrl('')
  }

  function removeGuest(i) {
    setVdoGuests(g => g.filter((_, idx) => idx !== i))
  }

  return (
    <div className="settings-wrap">
      <button className="settings-toggle" onClick={() => setOpen(o => !o)}>
        <span className="settings-icon">⚙</span>
        {open ? 'Hide settings' : 'Settings'}
      </button>
      {open && (
        <form className="settings-form" onSubmit={handleSave}>
          <label className="settings-label">
            Host
            <input className="settings-input" value={host} onChange={e => setHost(e.target.value)} placeholder="localhost" />
          </label>
          <label className="settings-label">
            Port
            <input className="settings-input" value={port} onChange={e => setPort(e.target.value)} placeholder="4455" />
          </label>
          <label className="settings-label">
            Password
            <input className="settings-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="(none)" />
          </label>

          <div className="settings-section-title">VDO.ninja Guests</div>
          {vdoGuests.map((g, i) => (
            <div key={i} className="vdo-guest-row">
              <span className="vdo-guest-row-label">{g.label}</span>
              <span className="vdo-guest-row-url">{g.url}</span>
              <button type="button" className="vdo-guest-remove" onClick={() => removeGuest(i)}>✕</button>
            </div>
          ))}
          {vdoGuests.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Paste a VDO.ninja solo link below</div>
          )}
          <div className="vdo-add-row">
            <input
              className="settings-input"
              placeholder="Paste solo link — https://vdo.ninja/?view=..."
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
              style={{ flex: 1 }}
            />
            <button type="button" className="settings-save" style={{ width: 'auto', padding: '4px 10px' }} onClick={addGuest}>Add</button>
          </div>

          <button className="settings-save" type="submit">
            {saved ? 'Saved — reconnecting…' : 'Save & Reconnect'}
          </button>
        </form>
      )}
    </div>
  )
}
