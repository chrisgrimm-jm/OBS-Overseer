import React from 'react'
import { useOBSConnection } from './hooks/useOBSConnection.js'
import { StreamPanel } from './components/StreamPanel.jsx'
import { RecordPanel } from './components/RecordPanel.jsx'
import { SystemPanel } from './components/SystemPanel.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import { BranchOutputPanel } from './components/BranchOutputPanel.jsx'

function StatusDot({ status }) {
  const colorMap = { connected: 'green', connecting: 'yellow', error: 'red', disconnected: 'gray' }
  const labelMap = { connected: 'Connected', connecting: 'Connecting…', error: 'Error — retrying', disconnected: 'Disconnected' }
  return (
    <span className="status-row">
      <span className={`dot dot-${colorMap[status] || 'gray'}`} />
      <span className="status-text">{labelMap[status] || status}</span>
    </span>
  )
}

export default function App() {
  const { status, obsVersion, stats, streamStatus, recordStatus, outputList, settings, saveSettings, reconnect } = useOBSConnection()

  function handleSaveSettings(newSettings) {
    saveSettings(newSettings)
    reconnect()
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">OBS Overseer</span>
        <StatusDot status={status} />
        {obsVersion && <span className="obs-version">v{obsVersion}</span>}
      </header>

      <div className="panels">
        <StreamPanel streamStatus={streamStatus} />
        <RecordPanel recordStatus={recordStatus} />
        <BranchOutputPanel outputList={outputList} />
        <SystemPanel stats={stats} />
      </div>

      <SettingsPanel settings={settings} onSave={handleSaveSettings} />
    </div>
  )
}
