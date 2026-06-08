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
  // timecode is HH:MM:SS.mmm — strip millis
  return tc.split('.')[0]
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

  const { outputActive, outputBytes, outputTotalFrames, outputSkippedFrames, outputTimecode, outputDuration } = streamStatus

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
      <StatRow label="Bitrate" value={kbps} unit=" kbps" color={bitrateColor(kbps)} />
      <StatRow label="Dropped" value={droppedPct} unit="%" color={droppedColor(droppedPct)} />
      {duration && <StatRow label="Duration" value={duration} color="gray" />}
    </section>
  )
}
