import React, { useState } from 'react'

export function SettingsPanel({ settings, onSave }) {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState(settings.host)
  const [port, setPort] = useState(settings.port)
  const [password, setPassword] = useState(settings.password)
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    onSave({ host: host.trim() || 'localhost', port: port.trim() || '4455', password })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            <input
              className="settings-input"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="localhost"
            />
          </label>
          <label className="settings-label">
            Port
            <input
              className="settings-input"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="4455"
            />
          </label>
          <label className="settings-label">
            Password
            <input
              className="settings-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="(none)"
            />
          </label>
          <button className="settings-save" type="submit">
            {saved ? 'Saved — reconnecting…' : 'Save & Reconnect'}
          </button>
        </form>
      )}
    </div>
  )
}
