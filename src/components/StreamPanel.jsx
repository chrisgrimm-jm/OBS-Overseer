import React from 'react'
import { StatRow } from './StatRow.jsx'

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

function formatTimecode(tc) {
  if (!tc) return null
  return tc.split('.')[0]
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

export function StreamPanel({ streamStatus }) {
  if (!streamStatus) {
    return (
      <section className="panel">
        <h2 className="panel-title">Stream</h2>
        <div className="panel-idle">Not streaming</div>
      </section>
    )
  }

  const { outputActive, outputBytes, outputTotalFrames, outputSkippedFrames, outputTimecode } = streamStatus

  const kbps = outputBytes != null ? Math.round((outputBytes * 8) / 1000) : null
  const droppedPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(1))
    : null
  const duration = formatTimecode(outputTimecode)

  return (
    <section className="panel">
      <h2 className="panel-title">
        Stream
        {outputActive
          ? <span className="badge badge-live">LIVE</span>
          : <span className="badge badge-off">OFF</span>}
      </h2>
      <StatRow label="Bitrate" value={kbps} unit=" kbps" color={bitrateColor(kbps)} tooltip={bitrateTooltip(kbps)} />
      <StatRow label="Dropped" value={droppedPct} unit="%" color={droppedColor(droppedPct)} tooltip={droppedTooltip(droppedPct, outputSkippedFrames, outputTotalFrames)} />
      {duration && <StatRow label="Duration" value={duration} color="gray" tooltip="Time elapsed since stream started." />}
    </section>
  )
}
