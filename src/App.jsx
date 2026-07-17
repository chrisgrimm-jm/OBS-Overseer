import React, { useState, useCallback } from 'react'
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

async function diagnoseWithClaude(apiKey, alerts, stats, outputList) {
  const activeOutputs = (outputList || []).filter(o => o.outputActive).map(o => ({
    name: o.outputName,
    bitrate: o.liveBitrateKbps ? `${o.liveBitrateKbps} kbps` : 'N/A',
    encodeLag: o.outputTotalFrames > 0 ? `${((o.outputSkippedFrames / o.outputTotalFrames) * 100).toFixed(2)}%` : '0%',
    congestion: o.outputCongestion != null ? `${(o.outputCongestion * 100).toFixed(0)}%` : 'N/A',
  }))

  const snapshot = [
    `Active alerts: ${alerts.join(', ')}`,
    `OBS CPU: ${stats?.cpuUsage?.toFixed(1) ?? 'N/A'}%`,
    `OBS RAM: ${stats?.memoryUsage?.toFixed(0) ?? 'N/A'} MB`,
    `FPS: ${stats?.activeFps?.toFixed(2) ?? 'N/A'}`,
    `Render lag: ${stats?.renderSkippedFrames && stats?.renderTotalFrames ? ((stats.renderSkippedFrames / stats.renderTotalFrames) * 100).toFixed(2) : '0'}%`,
    `Active branch outputs: ${activeOutputs.length}`,
    ...activeOutputs.map(o => `  ${o.name} — bitrate: ${o.bitrate}, encode lag: ${o.encodeLag}, congestion: ${o.congestion}`),
  ].join('\n')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      messages: [
        { role: 'system', content: 'You are a live production assistant for OBS Studio. The user is mid-production and needs fast help. Be direct and specific — 2-3 sentences max. Give the most likely cause and one concrete fix they can do right now.' },
        { role: 'user', content: `My OBS monitor is showing these alerts:\n\n${snapshot}\n\nWhat is likely wrong and what should I do?` },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response received.'
}

export default function App() {
  const { status, obsVersion, stats, streamStatus, recordStatus, outputList, audioInputs, settings, saveSettings, reconnect, refreshOutputs } = useOBSConnection()
  const [diagnosis, setDiagnosis] = useState(null)   // null | 'loading' | { text } | { error }
  const [diagVisible, setDiagVisible] = useState(false)

  function handleSaveSettings(newSettings) {
    saveSettings(newSettings)
    reconnect()
  }

  // Derived data — must be declared before alerts
  const streamTiles = getStreamTiles(streamStatus)
  const sysTiles = getSystemTiles(stats)
  const recInfo = getRecordInfo(recordStatus)

  // Alert bar: collect red + yellow state alerts (objects with {text, level})
  const streamAlerts = getStreamAlerts(streamStatus)
  const sysAlerts = getSystemAlerts(stats)

  const activeOutputCount = (outputList || []).filter(o => o.outputActive).length
  const pollSkippedRate = stats?.pollSkippedRate ?? null
  const encodeAlerts = []
  if (pollSkippedRate != null && pollSkippedRate >= 1) {
    encodeAlerts.push({ text: `ENCODER OVERLOAD — ${pollSkippedRate.toFixed(1)}% skipped`, level: 'red' })
  } else if (pollSkippedRate != null && pollSkippedRate >= 0.5) {
    encodeAlerts.push({ text: `Encode lag ${pollSkippedRate.toFixed(1)}%`, level: 'yellow' })
  }

  const cpuPct = stats?.cpuUsage ?? null
  if (cpuPct != null && cpuPct >= 80 && activeOutputCount > 0) {
    encodeAlerts.push({ text: `HIGH CPU ${cpuPct.toFixed(1)}% — ${activeOutputCount} output${activeOutputCount > 1 ? 's' : ''} recording`, level: 'red' })
  }

  const congestionAlerts = (outputList || []).flatMap(o => {
    if (!o.outputActive) return []
    const congestion = o.outputCongestion ?? null
    if (congestion != null && congestion >= 0.6) return [{ text: `${o.outputName} congestion ${(congestion * 100).toFixed(0)}%`, level: 'red' }]
    if (congestion != null && congestion >= 0.25) return [{ text: `${o.outputName} congestion ${(congestion * 100).toFixed(0)}%`, level: 'yellow' }]
    return []
  })

  const allAlerts = [...streamAlerts, ...sysAlerts, ...encodeAlerts, ...congestionAlerts]
  const hasRed = allAlerts.some(a => a.level === 'red')
  const alertTexts = allAlerts.map(a => a.text)

  const handleDiagnose = useCallback(async () => {
    if (!settings.claudeApiKey) return
    setDiagnosis('loading')
    setDiagVisible(true)
    try {
      const text = await diagnoseWithClaude(settings.claudeApiKey, alertTexts, stats, outputList)
      setDiagnosis({ text })
    } catch (err) {
      setDiagnosis({ error: err.message })
    }
  }, [settings.claudeApiKey, alertTexts, stats, outputList])

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
        <button className="refresh-btn" onClick={() => location.reload()}>↺ Refresh</button>
      </header>

      {/* Alert bar — red for critical, yellow for warnings */}
      {allAlerts.length > 0 && (
        <div className={hasRed ? 'alert-bar' : 'alert-bar alert-bar-warn'}>
          {allAlerts.map((a, i) => (
            <span key={i} className={a.level === 'yellow' ? 'alert-chip alert-chip-warn' : 'alert-chip'}>⚠ {a.text}</span>
          ))}
          {settings.claudeApiKey && (
            <button className="diagnose-btn" onClick={handleDiagnose} disabled={diagnosis === 'loading'}>
              {diagnosis === 'loading' ? 'Diagnosing…' : '✦ Diagnose'}
            </button>
          )}
        </div>
      )}

      {/* AI diagnosis panel */}
      {diagVisible && diagnosis && diagnosis !== 'loading' && (
        <div className={`diagnosis-panel ${diagnosis.error ? 'diagnosis-error' : ''}`}>
          <div className="diagnosis-header">
            <span className="diagnosis-title">✦ AI Diagnosis</span>
            <button className="diagnosis-close" onClick={() => { setDiagVisible(false); setDiagnosis(null) }}>✕</button>
          </div>
          <p className="diagnosis-text">{diagnosis.error ? `Error: ${diagnosis.error}` : diagnosis.text}</p>
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
