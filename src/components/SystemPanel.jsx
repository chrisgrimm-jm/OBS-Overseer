import React from 'react'
import { StatTile } from './StatTile.jsx'

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

function diskColor(mb) {
  if (mb == null) return 'gray'
  if (mb > 10000) return 'green'
  if (mb >= 2000) return 'yellow'
  return 'red'
}

function lagColor(pct) {
  if (pct == null) return 'gray'
  if (pct <= 0) return 'green'
  if (pct < 1) return 'yellow'
  return 'red'
}

function diskTooltip(mb) {
  if (mb == null) return null
  const gb = (mb / 1024).toFixed(1)
  return `Available disk space on OBS recording drive.\n\n${gb} GB free\n\nThresholds: >10 GB good · 2–10 GB warning · <2 GB critical\n\nLow disk space will cause recordings to stop mid-show.`
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

export function getSystemTiles(stats) {
  if (!stats) return null
  const {
    cpuUsage, memoryUsage, activeFps,
    renderSkippedFrames, renderTotalFrames,
    outputSkippedFrames, outputTotalFrames,
    availableDiskSpace,
  } = stats

  const renderLagPct = (renderTotalFrames && renderSkippedFrames != null)
    ? parseFloat(((renderSkippedFrames / renderTotalFrames) * 100).toFixed(2))
    : null

  const encodeLagPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(2))
    : null

  return {
    cpu: cpuUsage != null ? cpuUsage.toFixed(1) : null,
    cpuColor: cpuColor(cpuUsage),
    cpuTooltip: cpuTooltip(cpuUsage),
    mem: memoryUsage != null ? memoryUsage.toFixed(0) : null,
    memColor: memColor(memoryUsage),
    memTooltip: memTooltip(memoryUsage),
    fps: activeFps != null ? activeFps.toFixed(2) : null,
    fpsColor: fpsColor(activeFps),
    fpsTooltip: `Active output framerate.\n\nShould match your OBS canvas FPS setting. Drops below target indicate the system cannot render at the configured rate.`,
    diskFree: availableDiskSpace != null ? (availableDiskSpace / 1024).toFixed(1) : null,
    diskColor: diskColor(availableDiskSpace),
    diskTooltip: diskTooltip(availableDiskSpace),
    renderLag: renderLagPct,
    renderLagColor: lagColor(renderLagPct),
    renderLagTooltip: renderLagTooltip(renderLagPct),
    encodeLag: encodeLagPct,
    encodeLagColor: lagColor(encodeLagPct),
    encodeLagTooltip: encodeLagTooltip(encodeLagPct),
  }
}

export function getSystemAlerts(stats) {
  if (!stats) return []
  const t = getSystemTiles(stats)
  const alerts = []
  if (t.cpuColor === 'red') alerts.push(`CPU ${t.cpu}%`)
  if (t.memColor === 'red') alerts.push(`Mem ${t.mem}MB`)
  if (t.diskColor === 'red') alerts.push(`Disk ${t.diskFree}GB`)
  if (t.fpsColor === 'red') alerts.push(`FPS ${t.fps}`)
  if (t.renderLagColor === 'red') alerts.push(`Render ${t.renderLag}%`)
  if (t.encodeLagColor === 'red') alerts.push(`Encode ${t.encodeLag}%`)
  return alerts
}

export function SystemPanel({ stats }) {
  // Kept for backwards compat — not used in new layout
  if (!stats) return null
  const t = getSystemTiles(stats)
  return (
    <>
      <StatTile label="CPU" value={t.cpu} unit="%" color={t.cpuColor} tooltip={t.cpuTooltip} />
      <StatTile label="Memory" value={t.mem} unit=" MB" color={t.memColor} tooltip={t.memTooltip} />
      <StatTile label="FPS" value={t.fps} color={t.fpsColor} tooltip={t.fpsTooltip} />
      <StatTile label="Disk Free" value={t.diskFree} unit=" GB" color={t.diskColor} tooltip={t.diskTooltip} />
      <StatTile label="Render Lag" value={t.renderLag} unit="%" color={t.renderLagColor} tooltip={t.renderLagTooltip} />
      <StatTile label="Encode Lag" value={t.encodeLag} unit="%" color={t.encodeLagColor} tooltip={t.encodeLagTooltip} />
    </>
  )
}
