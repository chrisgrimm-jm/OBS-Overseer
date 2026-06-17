import React from 'react'
import { useOBSConnection } from './hooks/useOBSConnection.js'
import { StatTile } from './components/StatTile.jsx'
import { BranchOutputPanel } from './components/BranchOutputPanel.jsx'
import { AudioPanel } from './components/AudioPanel.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import { getStreamTiles, getStreamAlerts } from './components/StreamPanel.jsx'
import { getSystemTiles, getSystemAlerts } from './components/SystemPanel.jsx'
import { getRecordInfo } from './components/RecordPanel.jsx'

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

function formatTimecode(tc) {
  if (!tc) return null
  return tc.split('.')[0]
}

export default function App() {
  const { status, obsVersion, stats, streamStatus, recordStatus, outputList, audioInputs, encoders, settings, saveSettings, reconnect, refreshOutputs } = useOBSConnection()

  function handleSaveSettings(newSettings) {
    saveSettings(newSettings)
    reconnect()
  }

  // Derived data — must be declared before alerts
  const streamTiles = getStreamTiles(streamStatus)
  const sysTiles = getSystemTiles(stats)
  const recInfo = getRecordInfo(recordStatus)

  // Alert bar: collect all red-state stats
  const streamAlerts = getStreamAlerts(streamStatus)
  const sysAlerts = getSystemAlerts(stats)

  // Encoder overload alerts — use poll-to-poll rate so it fires while overload is actively happening
  const activeOutputCount = (outputList || []).filter(o => o.outputActive).length
  const pollSkippedRate = stats?.pollSkippedRate ?? null
  const encodeAlerts = []
  if (pollSkippedRate != null && pollSkippedRate >= 0.5) {
    encodeAlerts.push(`ENCODER OVERLOAD — ${pollSkippedRate.toFixed(1)}% frames skipped`)
  }

  // CPU alert when software outputs are active
  const cpuPct = stats?.cpuUsage ?? null
  if (cpuPct != null && cpuPct >= 80 && activeOutputCount > 0) {
    encodeAlerts.push(`HIGH CPU ${cpuPct.toFixed(1)}% — ${activeOutputCount} output${activeOutputCount > 1 ? 's' : ''} recording`)
  }

  // Congestion alerts per output (if OBS does return it)
  const congestionAlerts = (outputList || []).flatMap(o => {
    if (!o.outputActive) return []
    const congestion = o.outputCongestion ?? null
    if (congestion != null && congestion >= 0.6) return [`${o.outputName} congestion ${(congestion * 100).toFixed(0)}%`]
    return []
  })

  const allAlerts = [...streamAlerts, ...sysAlerts, ...encodeAlerts, ...congestionAlerts]

  // Status badges for stream + record
  const streamActive = streamStatus?.outputActive
  const streamDuration = streamStatus?.outputTimecode ? formatTimecode(streamStatus.outputTimecode) : null
  const recActive = recInfo?.outputActive
  const recPaused = recInfo?.outputPaused

  return (
    <div className="app" style={{background:'#1a1a1a',color:'#e0e0e0',minHeight:'100vh'}}>
      {/* Header */}
      <header className="app-header">
        <span className="app-title">OBS Overseer</span>
        <StatusDot status={status} />
        {obsVersion && <span className="obs-version">v{obsVersion}</span>}
        <button className="refresh-btn" onClick={refreshOutputs}>↺ Refresh</button>
      </header>

      {/* Alert bar — only shown when red alerts exist */}
      {allAlerts.length > 0 && (
        <div className="alert-bar">
          {allAlerts.map((a, i) => (
            <span key={i} className="alert-chip">⚠ {a}</span>
          ))}
        </div>
      )}

      {/* Status row: stream + record live badges */}
      <div className="status-badges-row">
        <span className={`live-badge ${streamActive ? 'live-badge-on' : 'live-badge-off'}`}>
          <span className={`dot dot-${streamActive ? 'green' : 'gray'}`} />
          {streamActive ? `LIVE${streamDuration ? ' ' + streamDuration : ''}` : 'STREAM OFF'}
        </span>
        <span className={`live-badge ${recActive ? (recPaused ? 'live-badge-paused' : 'live-badge-rec') : 'live-badge-off'}`}>
          <span className={`dot dot-${recActive ? (recPaused ? 'yellow' : 'green') : 'gray'}`} />
          {recActive ? (recPaused ? 'PAUSED' : `REC${recInfo.duration ? ' ' + recInfo.duration : ''}`) : 'REC OFF'}
        </span>
        {outputList && outputList.map(o => (
          <span key={o.outputName} className={`live-badge ${o.outputActive ? 'live-badge-rec' : 'live-badge-off'}`}>
            <span className={`dot dot-${o.outputActive ? 'green' : 'gray'}`} />
            {o.outputName}
          </span>
        ))}
      </div>

      {/* Key stats grid */}
      <div className="stat-grid">
        {/* Row 1: Bitrate | Dropped */}
        <StatTile
          label="Bitrate"
          value={streamTiles?.kbps}
          unit=" kbps"
          color={streamTiles?.kbpsColor || 'gray'}
          tooltip={streamTiles?.bitrateTooltip}
        />
        <StatTile
          label="Dropped"
          value={streamTiles?.droppedPct}
          unit="%"
          color={streamTiles?.droppedColor || 'gray'}
          tooltip={streamTiles?.droppedTooltip}
        />
        {/* Row 2: CPU | Memory */}
        <StatTile
          label="OBS CPU"
          value={sysTiles?.cpu}
          unit="%"
          color={sysTiles?.cpuColor || 'gray'}
          tooltip={sysTiles?.cpuTooltip}
        />
        <StatTile
          label="OBS RAM"
          value={sysTiles?.mem}
          unit=" GB"
          color={sysTiles?.memColor || 'gray'}
          tooltip={sysTiles?.memTooltip}
        />
        {/* Row 3: Disk Free | FPS */}
        <StatTile
          label="Disk Free"
          value={sysTiles?.diskFree}
          unit=" GB"
          color={sysTiles?.diskColor || 'gray'}
          tooltip={sysTiles?.diskTooltip}
        />
        <StatTile
          label="FPS"
          value={sysTiles?.fps}
          color={sysTiles?.fpsColor || 'gray'}
          tooltip={sysTiles?.fpsTooltip}
        />
        {/* Row 4: Render Lag | Encode Lag | (empty) */}
        <StatTile
          label="Render Lag"
          value={sysTiles?.renderLag}
          unit="%"
          color={sysTiles?.renderLagColor || 'gray'}
          tooltip={sysTiles?.renderLagTooltip}
        />
        <StatTile
          label="Encode Lag"
          value={pollSkippedRate != null && pollSkippedRate > 0 ? pollSkippedRate.toFixed(2) : sysTiles?.encodeLag}
          unit="%"
          color={(() => {
            const pct = pollSkippedRate != null && pollSkippedRate > 0 ? pollSkippedRate : parseFloat(sysTiles?.encodeLag)
            if (pct == null || isNaN(pct)) return 'gray'
            if (pct <= 0) return 'green'
            if (pct < 1) return 'yellow'
            return 'red'
          })()}
          tooltip={sysTiles?.encodeLagTooltip}
        />
      </div>

      {/* Branch outputs accordion */}
      <BranchOutputPanel outputList={outputList} onRefresh={refreshOutputs} />

      {/* Audio compact chips */}
      <AudioPanel audioInputs={audioInputs} />

      {/* Settings */}
      <SettingsPanel settings={settings} onSave={handleSaveSettings} />
    </div>
  )
}
