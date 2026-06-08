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

function memTooltip(mb) {
  if (mb == null) return null
  const status = mb < 512 ? 'Normal' : mb < 1024 ? 'Elevated' : 'High'
  const advice = mb >= 1024
    ? 'OBS is using a large amount of RAM. This can lead to stuttering or crashes.\n\nTry: closing unused browser sources, reducing scene complexity, or restarting OBS to clear memory leaks.'
    : mb >= 512
    ? 'Memory usage is moderately elevated. Keep an eye on it during long streams.'
    : 'Memory usage is normal.'
  return `${status}: ${mb.toFixed(0)} MB used by OBS\n\nThresholds: <512 MB good · 512–1024 MB warning · >1024 MB critical\n\n${advice}`
}

function cpuTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 80
    ? 'OBS is under heavy CPU load. This can cause dropped/skipped frames.\n\nTry: lowering encoder preset (e.g. faster/veryfast), switching to hardware encoding (NVENC/AMF/VT), or reducing scene complexity.'
    : pct >= 50
    ? 'CPU load is moderate. Monitor for spikes during busy scenes.'
    : 'CPU usage is normal.'
  return `${pct.toFixed(1)}% CPU used by OBS\n\nThresholds: <50% good · 50–80% warning · >80% critical\n\n${advice}`
}

function renderLagTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 2
    ? 'OBS is missing many render frames. Your GPU cannot keep up.\n\nTry: lowering canvas/output resolution, removing heavy GPU sources (browser sources, filters), or checking for GPU throttling.'
    : pct >= 0.5
    ? 'Some render frames are being missed. Could be brief GPU spikes.'
    : 'Render performance is good.'
  return `${pct.toFixed(2)}% of frames missed by renderer\n\nThresholds: <0.5% good · 0.5–2% warning · >2% critical\n\n${advice}`
}

function encodeLagTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 2
    ? 'The encoder is struggling to keep up. Frames are being skipped before they are sent.\n\nTry: switching to a faster encoder preset, using hardware encoding (NVENC/AMF/VT), or lowering output bitrate.'
    : pct >= 0.5
    ? 'Minor encoder lag detected. Watch for increases over time.'
    : 'Encoder is keeping up fine.'
  return `${pct.toFixed(2)}% of frames skipped by encoder\n\nThresholds: <0.5% good · 0.5–2% warning · >2% critical\n\n${advice}`
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
      <StatRow label="CPU" value={cpu} unit="%" color={cpuColor(cpuUsage)} tooltip={cpuTooltip(cpuUsage)} />
      <StatRow label="Memory" value={mem} unit=" MB" color={memColor(memoryUsage)} tooltip={memTooltip(memoryUsage)} />
      <StatRow label="FPS" value={fps} color={fpsColor(activeFps)} tooltip={`Active output framerate.\n\nShould match your OBS canvas FPS setting. Drops below target indicate the system cannot render at the configured rate.`} />
      <StatRow label="Render lag" value={renderLagPct} unit="%" color={lagColor(renderLagPct)} tooltip={renderLagTooltip(renderLagPct)} />
      <StatRow label="Encode lag" value={encodeLagPct} unit="%" color={lagColor(encodeLagPct)} tooltip={encodeLagTooltip(encodeLagPct)} />
    </section>
  )
}
