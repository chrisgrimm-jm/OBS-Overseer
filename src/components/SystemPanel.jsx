import React from 'react'
import { StatRow } from './StatRow.jsx'

function cpuColor(pct) {
  if (pct == null) return 'gray'
  if (pct < 50) return 'green'
  if (pct < 80) return 'yellow'
  return 'red'
}

function memColor(mb) {
  if (mb == null) return 'gray'
  if (mb < 512) return 'green'
  if (mb < 1024) return 'yellow'
  return 'red'
}

function fpsColor(fps, target = 30) {
  if (fps == null) return 'gray'
  if (fps >= target * 0.99) return 'green'
  if (fps >= target * 0.95) return 'yellow'
  return 'red'
}

function lagColor(pct) {
  if (pct == null) return 'gray'
  if (pct <= 0) return 'green'
  if (pct < 1) return 'yellow'
  return 'red'
}

export function SystemPanel({ stats }) {
  if (!stats) {
    return (
      <section className="panel">
        <h2 className="panel-title">System</h2>
        <div className="panel-idle">Waiting for data…</div>
      </section>
    )
  }

  const {
    cpuUsage,
    memoryUsage,
    activeFps,
    renderSkippedFrames,
    renderTotalFrames,
    outputSkippedFrames,
    outputTotalFrames,
  } = stats

  const cpu = cpuUsage != null ? cpuUsage.toFixed(1) : null
  const mem = memoryUsage != null ? memoryUsage.toFixed(0) : null
  const fps = activeFps != null ? activeFps.toFixed(2) : null

  const renderLagPct = (renderTotalFrames && renderSkippedFrames != null)
    ? parseFloat(((renderSkippedFrames / renderTotalFrames) * 100).toFixed(2))
    : null

  const encodeLagPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(2))
    : null

  return (
    <section className="panel">
      <h2 className="panel-title">System</h2>
      <StatRow label="CPU" value={cpu} unit="%" color={cpuColor(cpuUsage)} />
      <StatRow label="Memory" value={mem} unit=" MB" color={memColor(memoryUsage)} />
      <StatRow label="FPS" value={fps} color={fpsColor(activeFps)} />
      <StatRow label="Render lag" value={renderLagPct} unit="%" color={lagColor(renderLagPct)} />
      <StatRow label="Encode lag" value={encodeLagPct} unit="%" color={lagColor(encodeLagPct)} />
    </section>
  )
}
