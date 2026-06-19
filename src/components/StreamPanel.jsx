import React from 'react'
import { StatTile } from './StatTile.jsx'

function bitrateColor(kbps) {
  if (kbps == null) return 'gray'
  if (kbps >= 2000) return 'green'
  if (kbps >= 500) return 'yellow'
  return 'red'
}

function droppedColor(pct) {
  if (pct == null) return 'gray'
  if (pct <= 0) return 'green'
  if (pct < 2) return 'yellow'
  return 'red'
}

function bitrateTooltip(kbps) {
  if (kbps == null) return null
  const advice = kbps < 500
    ? 'Bitrate is very low. Stream quality will be poor and viewers may see heavy compression artifacts.\n\nCheck your network connection or raise your OBS bitrate setting.'
    : kbps < 2000
    ? 'Bitrate is moderate. Fine for 720p/30fps but may not be enough for 1080p60.'
    : 'Bitrate is healthy.'
  return `Current output bitrate: ${kbps} kbps\n\nThresholds: >2000 kbps good · 500–2000 kbps warning · <500 kbps critical\n\n${advice}`
}

function droppedTooltip(pct, skipped, total) {
  if (pct == null) return null
  const advice = pct >= 2
    ? 'Significant frame loss detected. Viewers will see stuttering or buffering.\n\nCauses: insufficient upload bandwidth, network congestion, or router/ISP issues.\n\nTry: lowering bitrate, switching to a closer ingest server, or checking your network.'
    : pct > 0
    ? 'Minor frame drops. Usually harmless but worth monitoring.'
    : 'No dropped frames — stream connection is healthy.'
  return `${skipped ?? 0} frames dropped out of ${total ?? 0} (${pct.toFixed(2)}%)\n\nThresholds: 0% good · <2% warning · ≥2% critical\n\n${advice}`
}

// Exported for use in App.jsx alert bar
export function getStreamAlerts(streamStatus) {
  if (!streamStatus?.outputActive) return []
  const alerts = []
  const { outputBytes, outputTotalFrames, outputSkippedFrames } = streamStatus
  const kbps = outputBytes != null ? Math.round((outputBytes * 8) / 1000) : null
  const droppedPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(1))
    : null
  if (kbps != null && bitrateColor(kbps) === 'red') alerts.push({ text: `Bitrate ${kbps}kbps`, level: 'red' })
  else if (kbps != null && bitrateColor(kbps) === 'yellow') alerts.push({ text: `Bitrate ${kbps}kbps`, level: 'yellow' })
  if (droppedPct != null && droppedColor(droppedPct) === 'red') alerts.push({ text: `Dropped ${droppedPct}%`, level: 'red' })
  else if (droppedPct != null && droppedColor(droppedPct) === 'yellow') alerts.push({ text: `Dropped ${droppedPct}%`, level: 'yellow' })
  return alerts
}

export function getStreamTiles(streamStatus) {
  if (!streamStatus) return { bitrateTile: null, droppedTile: null }
  const { outputBytes, outputTotalFrames, outputSkippedFrames } = streamStatus
  const kbps = outputBytes != null ? Math.round((outputBytes * 8) / 1000) : null
  const droppedPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(1))
    : null
  return {
    kbps,
    droppedPct,
    kbpsColor: bitrateColor(kbps),
    droppedColor: droppedColor(droppedPct),
    bitrateTooltip: bitrateTooltip(kbps),
    droppedTooltip: droppedTooltip(droppedPct, outputSkippedFrames, outputTotalFrames),
  }
}

export function StreamPanel({ streamStatus }) {
  // Kept for backwards compat but not used in new layout
  if (!streamStatus) return null
  const { kbps, droppedPct, kbpsColor, droppedColor: dColor, bitrateTooltip: btt, droppedTooltip: dtt } = getStreamTiles(streamStatus)
  return (
    <>
      <StatTile label="Bitrate" value={kbps} unit=" kbps" color={kbpsColor} tooltip={btt} />
      <StatTile label="Dropped" value={droppedPct} unit="%" color={dColor} tooltip={dtt} />
    </>
  )
}
